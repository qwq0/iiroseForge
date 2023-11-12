import { EventHandler } from "../../lib/qwqframe.js";

export let protocolEvent = {
    /**
     * forge事件
     */
    forge: {
        /**
         * 接收到房间的由forge本身发送的forge数据包
         * @type {EventHandler<{ senderId: string, senderName: string, content: Object }>}
         */
        roomForgePacket: new EventHandler(),
        /**
         * 接收到私聊的由forge本身发送的forge数据包
         * @type {EventHandler<{ senderId: string, senderName: string, content: Object }>}
         */
        privateForgePacket: new EventHandler(),
        /**
         * 接收到自己发给自己的由forge本身发送的forge数据包
         * @type {EventHandler<{ content: Object }>}
         */
        selfPrivateForgePacket: new EventHandler(),
    }
};