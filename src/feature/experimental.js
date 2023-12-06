import { domPath, proxyFunction } from "../../lib/plugToolsLib.js";
import { NList } from "../../lib/qwqframe.js";
import { keyboardBind } from "../../lib/qwqframe.js";
import { iframeContext } from "../injectIframe/iframeContext.js";
import { setPackageData, toClientTrie, toServerTrie } from "../protocol/protocol.js";
import { storageContext } from "../storage/storage.js";
import { showNotice } from "../ui/notice.js";
import { createNStyleList as styles } from "../../lib/qwqframe.js";
import { cssG } from "../../lib/qwqframe.js";
import { addMenuHook } from "./uiHook.js";
import { forgeApi } from "../forgeApi/forgeApi.js";
import { showCopyBox } from "../ui/infobox.js";

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
        addMenuHook(
            "ejectionButton",
            "roomMenu",
            () => ({ text: "弹射起步", icon: "ghost-outline" }),
            async (e) => { ejectionEscape(e.roomId); }
        );
    }

    if (storageContext.local.experimentalOption["roomQuery"])
    {
        addMenuHook(
            "roomQueryButton",
            "roomMenu",
            () => ({ text: "房间查询", icon: "account-search" }),
            async (e) =>
            {
                let roomId = e.roomId;
                let result = [];
                let userList = forgeApi.operation.getAllOnlineUserInfo();
                result.push("--- online user ---");
                let count = 0;
                userList.forEach(o =>
                {
                    if (o.roomId == roomId)
                    {
                        result.push(`${count++} - ${o.uid} (${o.name})`);
                    }
                });
                result.push(`${count} user in this room.`);
                let resultStr = result.join("\n");
                console.log("[iiroseForge] 房间查询\n", resultStr);
                showCopyBox("房间查询", "查询结果", resultStr);
            }
        );
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
        if (srcData == "s")
            setPackageData("");
    });
}