import { NEvent } from "../../lib/qwqframe.js";
import { NList } from "../../lib/qwqframe.js";
import { EventHandler } from "../../lib/qwqframe.js";
import { forgeApi } from "../forgeApi/forgeApi.js";
import { storageContext, storageRoamingSave } from "../storage/storage.js";
import { showInputBox } from "../ui/infobox.js";
import { showMenu } from "../ui/menu.js";
import { showNotice } from "../ui/notice.js";
import { messageNeedBlock } from "./blacklist.js";

let enabledAutoResponse = false;
let autoResponseText = "";

/**
 * @type {Map<string, number>}
 */
let lastAutoReplyTime = new Map();

/**
 * @param {typeof forgeApi.event.privateMessage extends EventHandler<infer T> ? T : never} e
 */
function onPrivateMessage(e)
{
    if (enabledAutoResponse && !messageNeedBlock(e.senderId))
    {
        if (!lastAutoReplyTime.has(e.senderId) || lastAutoReplyTime.get(e.senderId) < Date.now() - 15 * 1000)
        {
            lastAutoReplyTime.set(e.senderId, Date.now());
            let timeoutId = setTimeout(() =>
            {
                timeoutId = null;
                forgeApi.operation.sendPrivateMessage(e.senderId, `[自动回复] ${autoResponseText}`);
            }, 1.5 * 1000);
            showNotice("勿扰模式", "您已开启勿扰模式\n将会发送自动回复消息\n点击关闭", undefined, () =>
            {
                setNotDisturbMode(false);
                if (timeoutId)
                    clearTimeout(timeoutId);
            });
        }
    }
}

/**
 * @param {typeof forgeApi.event.privateMessage extends EventHandler<infer T> ? T : never} e
 */
function onRoomMessage(e)
{
    if (
        enabledAutoResponse &&
        e.senderId != forgeApi.operation.getUserUid() &&
        e.content.indexOf(` [*${forgeApi.operation.getUserName()}*] `) != -1 &&
        !messageNeedBlock(e.senderId)
    )
    {
        if (!lastAutoReplyTime.has(e.senderId) || lastAutoReplyTime.get(e.senderId) < Date.now() - 15 * 1000)
        {
            lastAutoReplyTime.set(e.senderId, Date.now());
            forgeApi.operation.sendRoomMessage(`[自动回复]  [*${e.senderName}*]  ${autoResponseText}`);
            showNotice("勿扰模式", "您已开启勿扰模式\n将会发送自动回复消息\n点击关闭", undefined, () =>
            {
                setNotDisturbMode(false);
            });
        }
    }
}

/**
 * 设置自动回复
 * @param {string | null} text
 */
export function setAutoResponse(text)
{
    if (text != null)
    {
        autoResponseText = text;
        if (!enabledAutoResponse)
        {
            enabledAutoResponse = true;
            forgeApi.event.privateMessage.add(onPrivateMessage);
            forgeApi.event.roomMessage.add(onRoomMessage);
        }
    }
    else
    {
        if (enabledAutoResponse)
        {
            forgeApi.event.privateMessage.remove(onPrivateMessage);
            forgeApi.event.roomMessage.remove(onRoomMessage);
            enabledAutoResponse = false;
        }
    }
}

let notDisturbMode = false;

/**
 * 设置勿扰模式
 * @param {boolean | "switch"} enable
 */
export function setNotDisturbMode(enable)
{
    if (typeof (enable) == "boolean")
        notDisturbMode = enable;
    else if (enable == "switch")
        notDisturbMode = !notDisturbMode;

    if (notDisturbMode)
    {
        setAutoResponse(String(storageContext.roaming.notDisturbModeAutoReply));
        showNotice("勿扰模式", `已开启勿扰模式\n私聊 和 @您的信息 将自动回复`);
    }
    else
    {
        setAutoResponse(null);
        showNotice("勿扰模式", `已关闭勿扰模式`);
    }
}

/**
 * 显示勿扰模式菜单
 */
export function showNotDisturbModeMenu()
{
    showMenu([

        NList.getElement([
            (notDisturbMode ? "关闭勿扰模式" : "打开勿扰模式"),
            new NEvent("click", async () =>
            {
                setNotDisturbMode("switch");
            }),
        ]),

        NList.getElement([
            "设置勿扰自动回复内容",
            new NEvent("click", async () =>
            {
                let oldValue = storageContext.roaming.notDisturbModeAutoReply;
                let value = await showInputBox("自定义自动回复", "输入开启勿扰模式时私聊的自动回复内容", true, oldValue);
                if (value != undefined && oldValue != value)
                {
                    storageContext.roaming.notDisturbModeAutoReply = value;
                    storageRoamingSave();
                    autoResponseText = value;
                    showNotice("勿扰模式", "已更新免打扰自动回复文本");
                }
            }),
        ])

    ]);
}