import { domPath, proxyFunction } from "../../lib/plugToolsLib.js";
import { iframeContext } from "../injectIframe/iframeContext.js";
import { storageContext, storageRoamingSave } from "../storage/storage.js";
import { showInputBox } from "../ui/infobox.js";
import { createNStyleList as styles } from "../../lib/qwqframe.js";
import { NElement, NEvent, NList, bindValue } from "../../lib/qwqframe.js";
import { addMenuHook } from "./uiHook.js";

/**
 * 启用用户备注功能
 * @returns 
 */
export function enableUserRemark()
{
    // 房间消息显示备注

    // 聊天消息列表节点(房间消息)
    let msgBox = iframeContext.iframeDocument.getElementsByClassName("msgholderBox")[0];
    Array.from(msgBox.children).forEach(o =>
    { // 处理已有的消息
        processingMessageElement(/** @type {HTMLElement} */(o));
    });
    (new MutationObserver(mutationsList =>
    {
        for (let mutation of mutationsList)
        {
            if (mutation.type == "childList")
            {
                Array.from(mutation.addedNodes).forEach((/** @type {HTMLElement} */element) =>
                { // 处理新增的消息
                    if (element.classList != undefined && element.classList.contains("msg")) // 是消息
                    {
                        processingMessageElement(element);
                    }
                });
            }
        }
    })).observe(msgBox, { attributes: false, childList: true, subtree: true, characterData: true, characterDataOldValue: true });



    // 私聊选项卡显示备注

    // 私聊选项卡列表
    let sessionHolderPmTaskBox = iframeContext.iframeDocument.getElementsByClassName("sessionHolderPmTaskBox")[0];
    Array.from(sessionHolderPmTaskBox.children).forEach(o =>
    { // 处理已有的私聊选项卡
        processingPrivateChatTabElement(/** @type {HTMLElement} */(o));
    });
    (new MutationObserver(mutationsList =>
    {
        for (let mutation of mutationsList)
        {
            if (mutation.type == "childList")
            {
                Array.from(mutation.addedNodes).forEach((/** @type {HTMLElement} */element) =>
                { // 处理新增的私聊选项卡
                    if (element.classList != undefined && element.classList.contains("sessionHolderPmTaskBoxItem"))
                    {
                        processingPrivateChatTabElement(element);
                    }
                });
            }
        }
    })).observe(sessionHolderPmTaskBox, { attributes: false, childList: true, subtree: true, characterData: true, characterDataOldValue: true });

    // 添加菜单ui
    addMenuHook(
        "userMark",
        "userMenu",
        uid =>
        {
            let oldRemarkName = storageContext.roaming.userRemark[uid];
            return {
                icon: "account-cog",
                text: `设置备注${oldRemarkName ? `(${oldRemarkName})` : ""}`
            };
        },
        async (uid) =>
        {
            let oldRemarkName = storageContext.roaming.userRemark[uid];
            let newRemark = await showInputBox("设置备注", `给 ${uid} 设置备注`, true, (oldRemarkName ? oldRemarkName : ""));
            if (newRemark != undefined)
            {
                storageContext.roaming.userRemark[uid] = newRemark;
                storageRoamingSave();
            }
        }
    );
}


/**
 * @type {WeakSet<HTMLElement>}
 */
let alreadyProcessedSet = new WeakSet();

/**
 * 处理消息元素
 * @param {HTMLElement} messageElement
 */
function processingMessageElement(messageElement)
{
    if (messageElement.classList.length == 1 && messageElement.classList.item(0) == "msg")
    {
        if (alreadyProcessedSet.has(messageElement))
            return;
        alreadyProcessedSet.add(messageElement);

        let uid = (
            messageElement.dataset.id ?
                messageElement.dataset.id.split("_")[0] :
                (/** @type {HTMLElement} */(domPath(messageElement, [0, -1, 0])))?.dataset?.uid
        );
        let pubUserInfoElement = (/** @type {HTMLElement} */(domPath(messageElement, [0, 0, -1, -1])));
        if (pubUserInfoElement)
            pubUserInfoElement.appendChild((NList.getElement([
                styles({
                    color: "white",
                    position: "absolute",
                    whiteSpace: "pre",

                    [pubUserInfoElement.style.float != "right" ? "left" : "right"]: "0px",
                    width: "max-content",
                    bottom: "42px"
                }),
                bindValue(
                    storageContext.roaming.userRemark,
                    uid,
                    remarkName => (remarkName ? remarkName : "")
                )
            ])).element);
    }
}

/**
 * 处理私聊选项卡元素
 * @param {HTMLElement} privateChatTabElement
 */
function processingPrivateChatTabElement(privateChatTabElement)
{
    if (
        privateChatTabElement.classList.length == 2 &&
        privateChatTabElement.classList.contains("sessionHolderPmTaskBoxItem") &&
        privateChatTabElement.classList.contains("whoisTouch2")
    )
    {
        if (alreadyProcessedSet.has(privateChatTabElement))
            return;
        alreadyProcessedSet.add(privateChatTabElement);

        let uid = privateChatTabElement.getAttribute("ip");
        let userNameElement = (/** @type {HTMLElement} */(domPath(privateChatTabElement, [1, 0, -1])));
        if (userNameElement)
            userNameElement.appendChild((NList.getElement([
                styles({
                    display: "inline",
                    marginLeft: "3px"
                }),
                bindValue(
                    storageContext.roaming.userRemark,
                    uid,
                    remarkName => (remarkName ? `(${remarkName})` : "")
                )
            ])).element);
    }
}