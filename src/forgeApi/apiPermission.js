
/**
 * 插件请求的权限列表
 */
export const apiPermission = {
    operation: {
        showForgeNotice: "显示forge通知",
        getUserName: "获取你的昵称",
        getUserUid: "获取你的uid",
        getUserRoomId: "获取所在房间id",
        getUserProfilePictureUrl: "获取你的头像",
        getUserInputColor: "获取你的主题色",
        sendRoomMessage: "在房间中发送信息",
        sendRoomForgePacket: "在房间中发送forge数据包",
        sendPrivateMessageSilence: "[危险]静默发送私聊消息",
        sendPrivateMessage: "[危险]发送私聊消息",
        sendSelfPrivateMessageSilence: "向自己静默发送私聊消息(同账号多设备间通信)",
        giveALike: "进行点赞",
        switchRoom: "切换所在房间"
    },
    event: {
        roomMessage: "接收房间消息",
        roomForgePacket: "接收房间forge数据包",
        privateMessage: "[危险]接收私聊消息",
        selfPrivateMessage: "接收自己(其他设备)发送给自己的私聊消息"
    }
};