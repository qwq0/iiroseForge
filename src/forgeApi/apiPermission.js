
/**
 * 插件请求的权限列表
 */
export const apiPermission = {
    operation: {
        getUserName: "获取你的昵称",
        getUserUid: "获取你的uid",
        getUserRoomId: "获取所在房间id",
        getUserProfilePictureUrl: "获取你的头像",
        getUserInputColor: "获取你的主题色",
        sendRoomMessage: "在房间中发送信息",
        sendPrivateMessageSilence: "[危险]静默发送私聊消息",
        sendPrivateMessage: "[危险]发送私聊消息",
        sendSelfPrivateMessageSilence: "向自己静默发送私聊消息(同账号多设备间通信)",
        giveALike: "进行点赞",
    },
    event: {
        roomMessage: "接收房间消息",
        privateMessage: "[危险]接受私聊消息",
        selfPrivateMessage: "接受自己(其他设备)发送给自己的私聊消息"
    }
};