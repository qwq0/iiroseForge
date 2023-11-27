import { domPath } from "../../lib/plugToolsLib";
import { NEvent } from "../../lib/qwqframe";
import { NList } from "../../lib/qwqframe";
import { forgeApi } from "../forgeApi/forgeApi";
import { iframeContext } from "../injectIframe/iframeContext";
import { storageContext, storageRoamingSave } from "../storage/storage";
import { showInfoBox, showInputBox } from "../ui/infobox";
import { showMenu } from "../ui/menu";
import { showNotice } from "../ui/notice";
import { addMenuHook } from "./uiHook";

export async function showBlacklistMenu()
{
    /**
     * @param {string} targetUid
     * @param {string | undefined} targetUserName
     */
    function showAccountMenu(targetUid, targetUserName)
    {
        showMenu([
            NList.getElement([
                "移出黑名单",
                new NEvent("click", () =>
                {
                    showSetBlacklistDialog(targetUid, true);
                })
            ])
        ]);
    }

    showMenu([
        NList.getElement([
            "设置自动回复内容",
            new NEvent("click", async () =>
            {
                let oldValue = storageContext.roaming.blacklistAutoReply;
                let value = await showInputBox("自定义自动回复", "输入黑名单用户私聊的自动回复内容\n留空关闭自动回复", true, oldValue);
                if (value != undefined && oldValue != value)
                {
                    storageContext.roaming.blacklistAutoReply = value;
                    storageRoamingSave();
                    if (value == "")
                        showNotice("黑名单", "已关闭黑名单自动回复");
                    else
                        showNotice("黑名单", "已更新黑名单自动回复内容");
                }
            }),
        ]),
        NList.getElement([
            "[ 添加黑名单 ]",
            new NEvent("click", async () =>
            {
                let uid = await showInputBox("添加黑名单", "输入目标的唯一标识", true);
                if (uid != undefined)
                {
                    let myUid = forgeApi.operation.getUserUid();
                    if (uid != myUid)
                        showSetBlacklistDialog(uid, false);
                    else
                        showNotice("黑名单", `不能添加此账号本身`);
                }
            }),
        ]),
        ...(Array.from(storageContext.processed.uidBlacklistSet).map(uid =>
        {
            let userInfo = forgeApi.operation.getOnlineUserInfoById(uid);
            return NList.getElement([
                `${uid}${userInfo ? ` (${userInfo.name})` : ""}`,
                new NEvent("click", async () =>
                {
                    showAccountMenu(uid, userInfo?.name);
                }),
            ]);
        }))
    ]);
}

/**
 * 显示设置用户黑名单的对话框 (加入或移出黑名单)
 * @param {string} uid
 * @param {boolean} removeFromBlacklist
 */
export async function showSetBlacklistDialog(uid, removeFromBlacklist)
{
    let action = (removeFromBlacklist ? "移出黑名单" : "加入黑名单");
    let userInfo = forgeApi.operation.getOnlineUserInfoById(uid);

    if (await showInfoBox(action, `确定将用户 ${uid}${userInfo ? `(${userInfo.name})` : ""}\n${action}吗?`, true))
    {
        if (removeFromBlacklist)
            storageContext.processed.uidBlacklistSet.delete(uid);
        else
            storageContext.processed.uidBlacklistSet.add(uid);
        storageRoamingSave();
        showNotice("黑名单", `已将用户 ${uid}${userInfo ? `(${userInfo.name})` : ""} ${action}`);
    }
}

/**
 * 启用黑名单
 */
export function enableBlacklist()
{
    // 添加菜单ui
    addMenuHook(
        "blacklist",
        "userMenu",
        e =>
        {
            let isInBlacklist = storageContext.processed.uidBlacklistSet.has(e.uid);
            if (e.uid != forgeApi.operation.getUserUid() || isInBlacklist)
                return {
                    icon: (isInBlacklist ? "account-lock-open-outline" : "account-cancel-outline"),
                    text: (isInBlacklist ? "此人已在黑名单中" : "添加到黑名单")
                };
            else
                return null;
        },
        async (e) =>
        {
            let isInBlacklist = storageContext.processed.uidBlacklistSet.has(e.uid);
            showSetBlacklistDialog(e.uid, isInBlacklist);
        }
    );

    // 聊天消息列表节点(房间消息)
    let msgBox = iframeContext.iframeDocument.getElementsByClassName("msgholderBox")[0];
    Array.from(msgBox.children).forEach(o =>
    { // 处理已有的消息
        try
        {
            let messageElement = /** @type {HTMLElement} */(o);
            if (messageElement.classList.length == 1 && messageElement.classList.item(0) == "msg")
            { // 发送的消息
                let uid = (
                    messageElement.dataset.id ?
                        messageElement.dataset.id.split("_")[0] :
                        (/** @type {HTMLElement} */(domPath(messageElement, [0, -1, 0])))?.dataset?.uid
                );
                if (uid && messageNeedBlock(uid))
                    o.remove();
            }
            if (messageElement.classList.length == 2 && messageElement.classList.contains("pubMsgSystem"))
            { // 系统消息
                let uid = (/** @type {HTMLElement} */(domPath(messageElement, [0, 0])))?.dataset?.uid;
                if (!uid)
                    uid = (/** @type {HTMLElement} */(domPath(messageElement, [0, 0, 0])))?.dataset?.uid;
                if (uid && messageNeedBlock(uid))
                    o.remove();
            }
        }
        catch (err)
        {
            console.error(err);
        }
    });
    Array.from(msgBox.children).forEach((o, index, childArray) =>
    { // 处理多个消息时间相邻
        try
        {
            let messageElement = /** @type {HTMLElement} */(o);
            if (messageElement.classList.length == 1 && messageElement.classList.item(0) == "pubMsgTime")
            { // 消息时间
                if (
                    index == childArray.length - 1 ||
                    childArray[index + 1]?.classList?.contains("pubMsgTime")
                )
                    o.remove();
            }
        }
        catch (err)
        {
            console.error(err);
        }
    });
}

/**
 * 测试消息是否需要屏蔽
 * @param {string} uid
 * @param {string} [message]
 * @param {string} [userName]
 * @returns {boolean}
 */
export function messageNeedBlock(uid, message = "", userName = "")
{
    if (forgeApi.operation.getUserUid() == uid)
        return false;
    return storageContext.processed.uidBlacklistSet.has(uid);
}