import { domPath } from "../../lib/plugToolsLib.js";
import { delayPromise } from "../../lib/qwqframe.js";
import { runTerminalCommand } from "../feature/runCommand.js";
import { sendMessageOnCurrentPage } from "../feature/sendMessage.js";
import { iframeContext } from "../injectIframe/iframeContext.js";
import { writeForgePacket } from "../protocol/forgePacket.js";
import { showNotice } from "../ui/notice.js";
import { EventHandler } from "../util/EventHandler.js";
import { htmlSpecialCharsDecode } from "../util/htmlSpecialChars.js";

export const forgeOccupyPlugNameSet = new Set([
    "forge",
    "iiroseForge",
    "forgeFrame",
    "iiroseForgeFrame",
]);

/**
 * 暴露的forge接口
 */
export const forgeApi = {
    /**
     * 接口状态
     */
    state: {
        /**
         * 当前执行操作的插件
         * @type {{ name: string }}
         */
        plug: null
    },

    /**
     * 操作列表
     */
    operation: {
        /**
         * 显示forge通知
         * @param {string} content
         * @param {Function} callback
         */
        showForgeNotice: (content, callback) =>
        {
            content = String(content);
            showNotice("插件提示", content, `插件 ${forgeApi.state.plug?.name}`, callback);
        },


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
         * 通过房间id获取房间信息
         * @param {string} roomId
         * @returns {{
         *  name: string,
         *  roomPath: Array<string>,
         *  color: string,
         *  description: string,
         *  roomImage: string,
         *  currentUserNum: number | "hidden"
         * }}
         */
        getRoomInfoById: (roomId) =>
        {
            roomId = String(roomId);
            let roomInfoArray = iframeContext.iframeWindow?.["Objs"]?.mapHolder?.Assets?.roomJson?.[roomId];
            if (roomInfoArray)
            {
                let imageAndDescription = htmlSpecialCharsDecode(roomInfoArray[5].split("&&")[0].split("&")[0]);
                let firstSpaceIndex = imageAndDescription.indexOf(" ");
                return {
                    name: roomInfoArray[1],
                    color: roomInfoArray[2],
                    roomPath: (/** @type {string} */(roomInfoArray[0])).split("_"),
                    description: imageAndDescription.slice(firstSpaceIndex + 1),
                    roomImage: imageAndDescription.slice(0, firstSpaceIndex),
                    currentUserNum: (typeof (roomInfoArray[7]) == "number" ? roomInfoArray[7] : "hidden")
                };
            }
            else
                return null;
        },

        /**
         * 切换房间
         * @param {string} roomId
         */
        changeRoom: (roomId) =>
        {
            roomId = String(roomId);
            if (roomId)
                iframeContext.iframeWindow?.["Objs"]?.mapHolder?.function?.roomchanger(roomId);
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
         * 在用户所在房间发送forge包消息
         * @param {Object} obj
         */
        sendRoomForgePacket: (obj) =>
        {
            if (
                typeof (obj) != "object" ||
                (forgeApi.state.plug && forgeOccupyPlugNameSet.has(obj.plug))
            )
                return;
            let forgePacket = writeForgePacket(obj);
            if (typeof (forgePacket) == "string")
                forgeApi.operation.sendRoomMessage(forgePacket);
            else
                (async () =>
                {
                    for (let i = 0; i < forgePacket.length; i++)
                    {
                        forgeApi.operation.sendRoomMessage(forgePacket[i]);
                        await delayPromise(60);
                    }
                })();
        },

        /**
         * 私聊发送forge包消息
         * @param {string} targetUid
         * @param {Object} obj
         */
        sendPrivateForgePacket: (targetUid, obj) =>
        {
            if (
                typeof (obj) != "object" ||
                (forgeApi.state.plug && forgeOccupyPlugNameSet.has(obj.plug))
            )
                return;
            let forgePacket = writeForgePacket(obj);
            if (typeof (forgePacket) == "string")
                forgeApi.operation.sendPrivateMessageSilence(targetUid, forgePacket);
            else
                (async () =>
                {
                    for (let i = 0; i < forgePacket.length; i++)
                    {
                        forgeApi.operation.sendPrivateMessageSilence(targetUid, forgePacket[i]);
                        await delayPromise(60);
                    }
                })();
        },

        /**
         * 给自己私聊发送forge包消息
         * @param {Object} obj
         */
        sendSelfPrivateForgePacket: (obj) =>
        {
            forgeApi.operation.sendPrivateForgePacket(forgeApi.operation.getUserUid(), obj);
        },

        /**
         * 静默发送私聊
         * @param {string} targetUid
         * @param {string} content
         */
        sendPrivateMessageSilence: (targetUid, content) =>
        {
            targetUid = String(targetUid);
            content = String(content);
            if (!content || !targetUid)
                return;
            iframeContext.socketApi.send(JSON.stringify({
                "g": targetUid,
                "m": content,
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
        },

        /**
         * 执行终端命令
         * 插件暂时无法申请此权限
         * @param {string} command
         */
        runTerminalCommand: (command) =>
        {
            command = String(command);
            runTerminalCommand(command);
        },

        /**
         * 在当前用户所在的页面发送信息
         * 插件暂时无法申请此权限
         * @param {string} content
         */
        sendCurrentPageMessage: (content) =>
        {
            content = String(content);
            sendMessageOnCurrentPage(content);
        }
    },

    /**
     * 事件列表
     */
    event: {
        /**
         * 接收到房间消息
         * @type {EventHandler<{ senderId: string, senderName: string, content: string }>}
         */
        roomMessage: new EventHandler(),

        /**
         * 接受到私聊消息
         * 不包括自己发出的
         * 不包括自己发送给自己的
         * @type {EventHandler<{ senderId: string, senderName: string, content: string }>}
         */
        privateMessage: new EventHandler(),

        /**
         * 接受到自己发送给自己的私聊消息
         * @type {EventHandler<{ content: string }>}
         */
        selfPrivateMessage: new EventHandler(),

        /**
         * 接收到房间的forge数据包
         * @type {EventHandler<{ senderId: string, senderName: string, content: Object }>}
         */
        roomForgePacket: new EventHandler(),
        /**
         * 接收到私聊的forge数据包
         * @type {EventHandler<{ senderId: string, senderName: string, content: Object }>}
         */
        privateForgePacket: new EventHandler(),
        /**
         * 接收到自己发给自己的forge数据包
         * @type {EventHandler<{ content: Object }>}
         */
        selfPrivateForgePacket: new EventHandler(),
    }
};

window["iiroseForgeApi"] = forgeApi; // 给外侧侧载脚本预留forgeApi
