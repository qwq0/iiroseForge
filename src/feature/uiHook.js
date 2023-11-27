import { NElement, NList } from "../../lib/qwqframe";
import { iframeContext } from "../injectIframe/iframeContext.js";
import { createNStyleList as styles } from "../../lib/qwqframe.js";
import { className } from "../ui/className";
import { proxyFunction } from "../../lib/plugToolsLib";
import { NEvent } from "../../lib/qwqframe";


let menuHookList = {
    /**
     * @type {Array<{
     *  creater: (e: { uid: string }) => ({ text: string, icon: string } | null),
     *  callback: (e: { uid: string }) => void
     * }>}
     */
    userMenu: [],
    /**
     * @type {Array<{
     *  creater: (e: { roomId: string }) => ({ text: string, icon: string } | null),
     *  callback: (e: { roomId: string }) => void
     * }>}
     */
    roomMenu: [],
    /**
     * @type {Array<{
     *  creater: (e: { uid: string, userName?: string, messageContent?: string, messageId?: string }) => ({ text: string, icon: string } | null),
     *  callback: (e: { uid: string, userName?: string, messageContent?: string, messageId?: string }) => void
     * }>}
     */
    roomMessageMenu: [],
};


let hookIdSet = new Set();

/**
 * @template {keyof menuHookList} K
 * @param {string | symbol} hookId
 * @param {K} location
 * @param {menuHookList[K][number]["creater"]} creater
 * @param {menuHookList[K][number]["callback"]} callback
 */
export function addMenuHook(hookId, location, creater, callback)
{
    enableUiHook();

    if (hookIdSet.has(hookId))
        return;
    hookIdSet.add(hookId);

    menuHookList[location].push({
        // @ts-ignore
        creater: creater,
        // @ts-ignore
        callback: callback
    });
}

/**
 * 已启用ui钩子的symbol
 */
let hadEnableUiHookSymbol = Symbol();
function enableUiHook()
{
    if ((!iframeContext.iframeWindow) || iframeContext.iframeWindow[hadEnableUiHookSymbol] == true)
        return;
    iframeContext.iframeWindow[hadEnableUiHookSymbol] = true;


    let oldFunction_Objs_mapHolder_function_event = iframeContext.iframeWindow["Objs"]?.mapHolder?.function?.event;
    if (oldFunction_Objs_mapHolder_function_event)
    {
        iframeContext.iframeWindow["Objs"].mapHolder.function.event = proxyFunction(oldFunction_Objs_mapHolder_function_event, (param, srcFunction, _targetFn, thisObj) =>
        {
            // 资料卡头像菜单
            if (param.length == 1 && param[0] == 7)
            {
                let uid = thisObj?.dataset?.uid;
                if (!uid)
                    return false;

                srcFunction(...param);

                let selectHolderBox = iframeContext.iframeDocument.getElementById("selectHolderBox");
                menuHookList.userMenu.forEach(o =>
                {
                    let info = o.creater({ uid });
                    if (!info)
                        return;
                    selectHolderBox.appendChild(
                        createIiroseMenuElement(
                            `mdi-${info.icon}`,
                            info.text,
                            async e =>
                            {
                                e.stopPropagation();
                                o.callback({ uid });
                            }
                        ).element
                    );
                });
                return true;
            }
            // 房间消息头像点击
            else if (
                param.length == 2 &&
                param[0] == 7 &&
                Array.isArray(param[1]) &&
                thisObj?.classList?.contains("msgavatar")
            )
            {
                let uid = thisObj?.dataset?.uid;
                let userName = param[1]?.[0];
                let messageId = thisObj?.parentNode?.parentNode?.dataset?.id?.split("_")?.[1];
                if (!uid)
                    return false;
                if (typeof (userName) != "string")
                    userName = undefined;

                srcFunction(...param);

                let selectHolderBox = iframeContext.iframeDocument.getElementById("selectHolderBox");
                menuHookList.roomMessageMenu.forEach(o =>
                {
                    let info = o.creater({
                        uid,
                        messageId,
                        userName
                    });
                    if (!info)
                        return;
                    selectHolderBox.appendChild(
                        createIiroseMenuElement(
                            `mdi-${info.icon}`,
                            info.text,
                            async e =>
                            {
                                e.stopPropagation();
                                o.callback({
                                    uid,
                                    messageId,
                                    userName
                                });
                            }
                        ).element
                    );
                });
                return true;
            }
            // 房间菜单
            else if (param.length == 1 && param[0] == 8)
            {
                let roomId = (/** @type {HTMLElement} */ (thisObj))?.getAttribute?.("rid");
                if (!roomId)
                    return false;

                srcFunction(...param);

                let selectHolderBox = iframeContext.iframeDocument.getElementById("selectHolderBox");
                menuHookList.roomMenu.forEach(o =>
                {
                    let info = o.creater({ roomId });
                    if (!info)
                        return;
                    selectHolderBox.appendChild(
                        createIiroseMenuElement(
                            `mdi-${info.icon}`,
                            info.text,
                            async e =>
                            {
                                e.stopPropagation();
                                o.callback({ roomId });
                            }
                        ).element
                    );
                });
                return true;
            }
            return false;
        });
    }

    // 私聊标签页点击
    let oldFunction_Utils_service_pm_menu = iframeContext.iframeWindow["Utils"]?.service?.pm?.menu;
    if (oldFunction_Utils_service_pm_menu)
    {
        iframeContext.iframeWindow["Utils"].service.pm.menu = proxyFunction(oldFunction_Utils_service_pm_menu, (param, srcFunction) =>
        {
            if (param.length == 1)
            {
                let uid = param[0]?.parentNode?.getAttribute?.("ip");
                if (!uid)
                    return false;

                srcFunction(...param);

                let selectHolderBox = iframeContext.iframeDocument.getElementById("selectHolderBox");
                menuHookList.userMenu.forEach(o =>
                {
                    let info = o.creater({ uid });
                    if (!info)
                        return;
                    selectHolderBox.appendChild(
                        createIiroseMenuElement(
                            `mdi-${info.icon}`,
                            info.text,
                            async e =>
                            {
                                e.stopPropagation();
                                o.callback({ uid });
                            }
                        ).element
                    );
                });
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
export function createIiroseMenuElement(icon, title, callback)
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