import { domPath, proxyFunction } from "../../lib/plugToolsLib.js";
import { NElement, NEvent, NList, bindValue } from "../../lib/qwqframe.js";
import { createNStyleList as styles } from "../../lib/qwqframe.js";
import { iframeContext } from "../injectIframe/iframeContext.js";
import { storageContext, storageRoamingSave } from "../storage/storage.js";
import { className } from "../ui/className.js";
import { showInputBox } from "../ui/infobox.js";

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



    // 资料卡菜单设置备注

    let oldFunction_Objs_mapHolder_function_event = iframeContext.iframeWindow["Objs"]?.mapHolder?.function?.event;
    if (oldFunction_Objs_mapHolder_function_event)
    { // 资料卡头像点击
        iframeContext.iframeWindow["Objs"].mapHolder.function.event = proxyFunction(oldFunction_Objs_mapHolder_function_event, function (param, srcFunction, _targetFn, thisObj)
        {
            if (param.length == 1 && param[0] == 7)
            {
                let uid = thisObj?.dataset?.uid;
                if (!uid)
                    return false;

                srcFunction(...param);

                let selectHolderBox = iframeContext.iframeDocument.getElementById("selectHolderBox");
                let oldRemarkName = storageContext.roaming.userRemark[uid];
                selectHolderBox.appendChild(
                    createIiroseMenuElement(
                        "mdi-account-cog",
                        `设置备注${oldRemarkName ? `(${oldRemarkName})` : ""}`,
                        async e =>
                        {
                            e.stopPropagation();



                            let oldRemarkName = storageContext.roaming.userRemark[uid];
                            let newRemark = await showInputBox("设置备注", `给 ${uid} 设置备注`, true, (oldRemarkName ? oldRemarkName : ""));
                            if (newRemark != undefined)
                            {
                                storageContext.roaming.userRemark[uid] = newRemark;
                                storageRoamingSave();
                            }
                        }
                    ).element
                );
                return true;
            }
            return false;
        });
    }



    // 私聊选项卡菜单设置备注

    let oldFunction_Utils_service_pm_menu = iframeContext.iframeWindow["Utils"]?.service?.pm?.menu;
    if (oldFunction_Utils_service_pm_menu)
    { // 私聊标签页点击
        iframeContext.iframeWindow["Utils"].service.pm.menu = proxyFunction(oldFunction_Utils_service_pm_menu, function (param, srcFunction)
        {
            if (param.length == 1)
            {
                let uid = param[0]?.parentNode?.getAttribute?.("ip");
                if (!uid)
                    return false;

                srcFunction(...param);

                let selectHolderBox = iframeContext.iframeDocument.getElementById("selectHolderBox");
                let oldRemarkName = storageContext.roaming.userRemark[uid];
                selectHolderBox.appendChild(
                    createIiroseMenuElement(
                        "mdi-account-cog",
                        `设置备注${oldRemarkName ? `(${oldRemarkName})` : ""}`,
                        async e =>
                        {
                            e.stopPropagation();



                            let oldRemarkName = storageContext.roaming.userRemark[uid];
                            let newRemark = await showInputBox("设置备注", `给 ${uid} 设置备注`, true, (oldRemarkName ? oldRemarkName : ""));
                            if (newRemark != undefined)
                            {
                                storageContext.roaming.userRemark[uid] = newRemark;
                                storageRoamingSave();
                            }
                        }
                    ).element
                );
                return true;
            }
            return false;
        });
    }
}

/**
 * 创建蔷薇菜单元素
 * @param {string} icon
 * @param {string} title
 * @param {(e: MouseEvent) => void} callback
 * @returns {NElement}
 */
function createIiroseMenuElement(icon, title, callback)
{
    return NList.getElement([
        className("selectHolderBoxItem selectHolderBoxItemIcon"),
        [
            className(icon),
            styles({
                fontFamily: "md",
                fontSize: "28px",
                textAlign: "center",
                lineHeight: "100px",
                height: "100px",
                width: "100px",
                position: "absolute",
                top: "0",
                opacity: ".7",
                left: "0",
            })
        ],
        title,
        [
            className("fullBox whoisTouch3")
        ],
        new NEvent("click", callback)
    ]);
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