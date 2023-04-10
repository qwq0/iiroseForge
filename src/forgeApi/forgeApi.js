import { domPath } from "../../lib/plugToolsLib.js";
import { iframeContext } from "../injectIframe/iframeContext.js";
import { EventHandler } from "../util/EventHandler.js";

/**
 * 暴露的forge接口
 */
export const forgeApi = {
    /**
     * 操作列表
     */
    operation:
    {
        /**
         * 获取用户蔷薇昵称
         * @returns {string}
         */
        getUserName: () =>
        {
            if (iframeContext.iframeWindow?.["myself2"])
                return iframeContext.iframeWindow["myself2"];
            return null;
        },

        /**
         * 获取用户蔷薇uid
         * @returns {string}
         */
        getUserUid: () =>
        {
            if (iframeContext.iframeWindow?.["uid"])
                return iframeContext.iframeWindow["uid"];
            return null;
        },

        /**
         * 获取用户蔷薇所在房间id
         * @returns {string}
         */
        getUserRoomId: () =>
        {
            if (iframeContext.iframeWindow?.["roomn"])
                return iframeContext.iframeWindow["roomn"];
            return null;
        },

        /**
         * 获取用户蔷薇头像url
         * @returns {string}
         */
        getUserProfilePictureUrl: () =>
        {
            if (iframeContext.iframeWindow?.["avatar2"] && iframeContext.iframeWindow?.["avatarconv"])
                return iframeContext.iframeWindow["avatarconv"](iframeContext.iframeWindow["avatar2"]);
            return null;
        },

        /**
         * 获取用户蔷薇输入颜色
         * @returns {string}
         */
        getUserInputColor: () =>
        {
            if (iframeContext.iframeWindow?.["inputcolorhex"])
                return iframeContext.iframeWindow["inputcolorhex"];
            return null;
        },

        /**
         * 在用户所在房间发送消息
         * @param {string} content
         */
        sendRoomMessage: (content) =>
        {
            content = String(content);
            if (!content)
                return;
            iframeContext.socketApi.send(JSON.stringify({
                "m": content,
                "mc": forgeApi.operation.getUserInputColor(),
                "i": String(Date.now()).slice(-5) + String(Math.random()).slice(-7)
            }));
        },

        /**
         * 静默发送私聊
         * @param {string} targetUid
         * @param {string} context
         */
        sendPrivateMessageSilence: (targetUid, context) =>
        {
            targetUid = String(targetUid);
            context = String(context);
            if (!context || !targetUid)
                return;
            iframeContext.socketApi.send(JSON.stringify({
                "g": targetUid,
                "m": context,
                "mc": forgeApi.operation.getUserInputColor(),
                "i": String(Date.now()).slice(-5) + String(Math.random()).slice(-7)
            }));
        },

        /**
         * 发送私聊
         * @param {string} targetUid
         * @param {string} content
         */
        sendPrivateMessage: (targetUid, content) =>
        {
            targetUid = String(targetUid);
            content = String(content);
            if (!content || !targetUid || !iframeContext.iframeWindow?.["msgfetch"] || !iframeContext.iframeWindow?.["Variable"]?.pmObjJson || !iframeContext.iframeWindow?.["Utils"]?.service?.buildPmHelper)
                return;
            let inputBox = /** @type {HTMLInputElement} */(iframeContext.iframeDocument.getElementById("moveinput"));
            let oldValue = inputBox.value;
            let old_pmFull = iframeContext.iframeWindow["pmFull"];
            inputBox.value = content;
            iframeContext.iframeWindow["pmFull"] = true;
            if (!iframeContext.iframeWindow["Variable"].pmObjJson?.[targetUid])
                iframeContext.iframeWindow["Utils"].service.buildPmHelper(1, targetUid, targetUid);
            iframeContext.iframeWindow["msgfetch"](0, iframeContext.iframeWindow["Variable"].pmObjJson?.[targetUid], targetUid, "");
            iframeContext.iframeWindow["pmFull"] = old_pmFull;
            inputBox.value = oldValue;
        },

        /**
         * 静默给自己发送私聊
         * @param {string} content
         */
        sendSelfPrivateMessageSilence: (content) =>
        {
            forgeApi.operation.sendPrivateMessageSilence(forgeApi.operation.getUserUid(), content);
        },

        /**
         * 点赞
         * @param {string} targetUid
         * @param {string} [content]
         */
        giveALike: (targetUid, content = "") =>
        {
            targetUid = String(targetUid);
            content = String(content);
            if (!targetUid)
                return;
            iframeContext.socketApi.send(`+*${targetUid}${content ? " " + content : ""}`);
        },

        /**
         * 切换房间
         * @param {string} roomId
         */
        switchRoom: (roomId) =>
        {
            roomId = String(roomId);
            if (iframeContext.iframeWindow?.["Objs"]?.mapHolder?.function?.roomchanger)
                iframeContext.iframeWindow["Objs"].mapHolder.function.roomchanger(roomId);
        }
    },

    /**
     * 事件列表
     */
    event: {
        /**
         * 接收到房间消息
         */
        roomMessage: new EventHandler(),

        /**
         * 接受到私聊消息
         */
        privateMessage: new EventHandler(),

        /**
         * 接受到自己发送给自己的私聊消息
         */
        selfPrivateMessage: new EventHandler()
    }
};

window["iiroseForgeApi"] = forgeApi;

/**
 * @typedef {typeof forgeApi} forgeApiType
 */