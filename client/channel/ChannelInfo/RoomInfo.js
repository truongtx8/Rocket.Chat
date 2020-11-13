import React from 'react';
import { useMutableCallback } from '@rocket.chat/fuselage-hooks';

import RoomInfo from '../../components/basic/RoomInfo';
import { useTranslation } from '../../contexts/TranslationContext';
import { useUserSubscription } from '../../contexts/UserContext';
import { useMethod } from '../../contexts/ServerContext';
import DeleteChannelWarning from '../../components/DeleteChannelWarning';
import { useSetModal } from '../../contexts/ModalContext';
import { useSetting } from '../../contexts/SettingsContext';
import { useRoute } from '../../contexts/RouterContext';
import { useToastMessageDispatch } from '../../contexts/ToastMessagesContext';
import { roomTypes, UiTextContext } from '../../../app/utils';
import { RoomManager } from '../../../app/ui-utils/client/lib/RoomManager';
import { usePermission } from '../../contexts/AuthorizationContext';
import WarningModal from '../../admin/apps/WarningModal';

const typeMap = {
	c: 'Channels',
	p: 'Groups',
	d: 'DMs',
};

export default ({
	openEditing,
	rid,
}) => {
	const t = useTranslation();

	const room = useUserSubscription(rid);
	room.type = room.t;
	const { type, name, broadcast, archived } = room;

	const retentionPolicy = {
		retentionPolicyEnabled: useSetting('RetentionPolicy_Enabled'),
		maxAgeDefault: useSetting(`RetentionPolicy_MaxAge_${ typeMap[room.t] }`) || 30,
		retentionEnabledDefault: useSetting(`RetentionPolicy_AppliesTo${ typeMap[room.t] }`),
		excludePinnedDefault: useSetting('RetentionPolicy_DoNotPrunePinned'),
		filesOnlyDefault: useSetting('RetentionPolicy_FilesOnly'),
	};

	const dispatchToastMessage = useToastMessageDispatch();
	const setModal = useSetModal();
	const closeModal = useMutableCallback(() => setModal());
	const deleteRoom = useMethod('eraseRoom');
	const hideRoom = useMethod('hideRoom');
	const leaveRoom = useMethod('leaveRoom');
	const router = useRoute('home');

	const canDeleteChannel = usePermission('delete-c');
	const canDeletePrivate = usePermission('delete-p');

	const canLeaveChannel = usePermission('leave-c');
	const canLeavePrivate = usePermission('leave-p');

	const hasDeletePermission = (() => {
		if (type === 'c' && !canDeleteChannel) { return false; }
		if (type === 'p' && !canDeletePrivate) { return false; }
		return true;
	})();

	const hasLeavePermission = (() => {
		if (type === 'c' && !canLeaveChannel) { return false; }
		if (type === 'p' && !canLeavePrivate) { return false; }
		return true;
	})();

	const handleDelete = useMutableCallback(() => {
		const onConfirm = async () => {
			try {
				await deleteRoom(rid);
				router.push({});
			} catch (error) {
				dispatchToastMessage({ type: 'error', message: error });
			}
			closeModal();
		};

		setModal(<DeleteChannelWarning onConfirm={onConfirm} onCancel={closeModal} />);
	});

	const handleLeave = useMutableCallback(() => {
		const leave = async () => {
			try {
				await leaveRoom(rid);
				router.push({});
				RoomManager.close(rid);
			} catch (error) {
				dispatchToastMessage({ type: 'error', message: error });
			}
			closeModal();
		};

		const warnText = roomTypes.getConfig(type).getUiText(UiTextContext.LEAVE_WARNING);

		setModal(<WarningModal
			text={t(warnText, name)}
			confirmText={t('Leave_room')}
			close={closeModal}
			cancel={closeModal}
			cancelText={t('Cancel')}
			confirm={leave}
		/>);
	});

	const handleHide = useMutableCallback(async () => {
		const hide = async () => {
			try {
				await hideRoom(rid);
				router.push({});
			} catch (error) {
				dispatchToastMessage({ type: 'error', message: error });
			}
			closeModal();
		};

		const warnText = roomTypes.getConfig(type).getUiText(UiTextContext.HIDE_WARNING);

		setModal(<WarningModal
			text={t(warnText, name)}
			confirmText={t('Yes_hide_it')}
			close={closeModal}
			cancel={closeModal}
			cancelText={t('Cancel')}
			confirm={hide}
		/>);
	});

	return (
		<RoomInfo
			archived={archived}
			broadcast={broadcast}
			icon={room.t === 'p' ? 'lock' : 'hashtag'}
			retentionPolicy={retentionPolicy.retentionPolicyEnabled && retentionPolicy}
			onClickEdit={openEditing}
			onClickDelete={hasDeletePermission && handleDelete}
			onClickLeave={hasLeavePermission && handleLeave}
			onClickHide={handleHide}
			{...room}
		/>
	);
};