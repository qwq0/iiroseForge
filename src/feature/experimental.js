import { proxyFunction } from "../../lib/plugToolsLib";
import { iframeContext } from "../injectIframe/iframeContext";
import { storageContext } from "../storage/storage";
import { showNotice } from "../ui/notice";
import { createIiroseMenuElement } from "./tools";

/**
 * 启动实验性功能
 */
export function enableExperimental()
{
    iframeContext.iframeWindow["Objs"].mapHolder.function.roomchanger = proxyFunction(
        iframeContext.iframeWindow["Objs"].mapHolder.function.roomchanger,
        (param) =>
        {
            if (param.length == 1 && typeof (param[0]) == "string")
            {
                if (storageContext.local.experimentalOption["ejection"])
                {
                    const targetRoomId = param[0];
                    ejectionEscape(targetRoomId);
                    return true;
                }
            }
            return false;
        }
    );

    let oldFunction_Objs_mapHolder_function_event = iframeContext.iframeWindow["Objs"]?.mapHolder?.function?.event;
    if (oldFunction_Objs_mapHolder_function_event)
    { // 房间按钮点击
        iframeContext.iframeWindow["Objs"].mapHolder.function.event = proxyFunction(oldFunction_Objs_mapHolder_function_event, function (param, srcFunction, _targetFn, thisObj)
        {
            if (param.length == 1 && param[0] == 8)
            {
                let roomId = (/** @type {HTMLElement} */ (thisObj))?.getAttribute?.("rid");
                if (!roomId)
                    return false;

                srcFunction(...param);

                let selectHolderBox = iframeContext.iframeDocument.getElementById("selectHolderBox");
                selectHolderBox.appendChild(
                    createIiroseMenuElement(
                        "mdi-ghost-outline",
                        `弹射起步`,
                        async e =>
                        {
                            ejectionEscape(roomId);
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
 * @param {string} targetRoomId
 */
function ejectionEscape(targetRoomId)
{
    iframeContext.socketApi.send("m" + targetRoomId);
    iframeContext.socket.onclose = null;
    iframeContext.socket?.close();
    setTimeout(() =>
    {
        iframeContext.iframeWindow?.sessionStorage?.setItem?.("lastroom", "");
        iframeContext.iframeWindow?.sessionStorage?.setItem?.("autologin", "1");
        iframeContext.iframeWindow?.["Cookie"]?.("roomsave", targetRoomId);
        iframeContext.iframeWindow?.location?.reload?.();
    }, 7 * 1000);
    showNotice("实验性功能", "少女祈祷中...");
    setTimeout(() =>
    {
        showNotice("实验性功能", "马上就好了~");
    }, 3500);
}