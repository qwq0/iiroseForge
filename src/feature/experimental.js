import { domPath, proxyFunction } from "../../lib/plugToolsLib";
import { NList } from "../../lib/qwqframe";
import { keyboardBind } from "../../lib/qwqframe";
import { iframeContext } from "../injectIframe/iframeContext";
import { setPackageData, toClientTrie, toServerTrie } from "../protocol/protocol";
import { storageContext } from "../storage/storage";
import { showNotice } from "../ui/notice";
import { createIiroseMenuElement } from "./tools";
import { createNStyleList as styles } from "../../lib/qwqframe.js";
import { cssG } from "../../lib/qwqframe";

let textEncoder = new TextEncoder();

/**
 * 启用实验性功能
 */
export function enableExperimental()
{
    let shiftDown = false;

    keyboardBind(iframeContext.iframeBody.element, e =>
    {
        if (e.key == "Shift")
            shiftDown = e.hold;
    });

    iframeContext.iframeWindow["Objs"].mapHolder.function.roomchanger = proxyFunction(
        iframeContext.iframeWindow["Objs"].mapHolder.function.roomchanger,
        (param) =>
        {
            if (param.length == 1 && typeof (param[0]) == "string")
            {
                if (
                    storageContext.local.experimentalOption["ejection"] ||
                    (storageContext.local.experimentalOption["ejectionButton"] && shiftDown)
                )
                {
                    const targetRoomId = param[0];
                    ejectionEscape(targetRoomId);
                    return true;
                }
            }
            return false;
        }
    );

    if (storageContext.local.experimentalOption["ejectionButton"])
    {
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

    if (storageContext.local.experimentalOption["withdraw"])
    {
        takeoverWithdraw();
    }

    if (storageContext.local.experimentalOption["interceptState"])
    {
        takeoverState();
    }
}

/**
 * @param {string} targetRoomId
 */
function ejectionEscape(targetRoomId)
{
    iframeContext.socket?._send(textEncoder.encode("m" + targetRoomId));
    iframeContext.socket.onclose = () => { };
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

let hadTakeoverWithdraw = false;
function takeoverWithdraw()
{
    if (hadTakeoverWithdraw)
        return;
    hadTakeoverWithdraw = true;
    toClientTrie.addPath("v0#", data =>
    {
        let part = data.split(`"`);
        try
        {
            let messageElement = /** @type {HTMLElement} */(iframeContext.iframeDocument.querySelector(`div#msgholder div.fullBox[index="0"] div[data-id="${part[0]}"]`));
            domPath(messageElement, [0, 0, 0])?.appendChild(NList.getElement([
                styles({
                    backgroundColor: cssG.rgb(100, 100, 100, 0.6),
                    color: cssG.rgb(255, 255, 255, 0.9),
                    borderRadius: "3px",

                    position: "absolute",
                    padding: "0.2em",
                    bottom: "-0.7em",
                    [messageElement.style.float != "right" ? "right" : "left"]: "-1.7em"
                }),
                "已撤回"
            ]).element);
        }
        catch (err)
        {
            console.error(err);
        }
        return true;
    });
    toClientTrie.addPath("v0*", data =>
    {
        let part = data.split(`"`);
        try
        {
            let messageElement = /** @type {HTMLElement} */(iframeContext.iframeDocument.querySelector(`div#msgholder div.fullBox[ip="${part[0]}"] div[data-id="${part[1]}"]`));
            domPath(messageElement, [1, 0])?.appendChild(NList.getElement([
                styles({
                    backgroundColor: cssG.rgb(100, 100, 100, 0.6),
                    color: cssG.rgb(255, 255, 255, 0.9),
                    borderRadius: "3px",

                    position: "absolute",
                    padding: "0.2em",
                    bottom: "-0.7em",
                    [messageElement.style.float != "right" ? "right" : "left"]: "-1.7em"
                }),
                "已撤回"
            ]).element);
        }
        catch (err)
        {
            console.error(err);
        }
        return true;
    });
}

let hadTakeoverState = false;
function takeoverState()
{
    if (hadTakeoverState)
        return;
    hadTakeoverState = true;
    toServerTrie.addPath("s", (_data, srcData) =>
    {
        if(srcData == "s")
            setPackageData("");
    });
}