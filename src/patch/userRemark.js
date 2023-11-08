import { domPath, proxyFunction } from "../../lib/plugToolsLib.js";
import { NElement, NEvent, NList } from "../../lib/qwqframe.js";
import { createNStyleList as styles } from "../../lib/qwqframe.js";
import { iframeContext } from "../injectIframe/iframeContext.js";
import { storageContext, storageSave } from "../storage/storage.js";
import { className } from "../ui/className.js";
import { showInputBox } from "../ui/infobox.js";

/**
 * 启用用户备注功能
 * @returns 
 */
export function enableUserRemark()
{
    let msgBox = iframeContext.iframeDocument.getElementsByClassName("msgholderBox")[0];// 聊天消息列表节点(房间消息)
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
                let oldRemarkName = storageContext.iiroseForge.userRemark[uid];
                selectHolderBox.appendChild(
                    createIiroseMenuElement(
                        "mdi-account-cog",
                        `设置备注${oldRemarkName ? `(${oldRemarkName})` : ""}`,
                        async e =>
                        {
                            e.stopPropagation();



                            let oldRemarkName = storageContext.iiroseForge.userRemark[uid];
                            let newRemark = await showInputBox("设置备注", `给 ${uid} 设置备注`, true, (oldRemarkName ? oldRemarkName : ""));
                            if (newRemark != undefined)
                            {
                                storageContext.iiroseForge.userRemark[uid] = newRemark;
                                storageSave();
                            }
                        }
                    ).element
                );
                return true;
            }
            return false;
        });
    }
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
                let oldRemarkName = storageContext.iiroseForge.userRemark[uid];
                selectHolderBox.appendChild(
                    createIiroseMenuElement(
                        "mdi-account-cog",
                        `设置备注${oldRemarkName ? `(${oldRemarkName})` : ""}`,
                        async e =>
                        {
                            e.stopPropagation();



                            let oldRemarkName = storageContext.iiroseForge.userRemark[uid];
                            let newRemark = await showInputBox("设置备注", `给 ${uid} 设置备注`, true, (oldRemarkName ? oldRemarkName : ""));
                            if (newRemark != undefined)
                            {
                                storageContext.iiroseForge.userRemark[uid] = newRemark;
                                storageSave();
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
 * 处理消息元素
 * @param {HTMLElement} messageElement
 */
function processingMessageElement(messageElement)
{
    if (messageElement.classList.length == 1 && messageElement.classList.item(0) == "msg")
    {
        let messageElementDataId = String(messageElement.dataset.id);
        let uid = messageElementDataId.split("_")[0];
        let remarkName = storageContext.iiroseForge.userRemark[uid];
        if (remarkName)
        {
            let pubUserInfoElement = (/** @type {HTMLElement} */(domPath(messageElement, [0, 0, -1, -1])));
            pubUserInfoElement.appendChild((NList.getElement([
                styles({
                    color: "white",
                    position: "absolute",
                    whiteSpace: "pre",

                    [pubUserInfoElement.style.float != "right" ? "left" : "right"]: "0px",
                    width: "max-content",
                    bottom: "42px"
                }),
                remarkName
            ])).element);
        }
    }
}