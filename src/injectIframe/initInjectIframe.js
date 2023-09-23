import { intervalTry, proxyFunction } from "../../lib/plugToolsLib.js";
import { getNElement, NList, createNStyle as style, NTagName, NAsse, NEvent } from "../../lib/qwqframe.js";
import { writeForgeToCache } from "../injectCache/injectCache.js";
import { toClient, toServer } from "../protocol/protocol.js";
import { storageContext } from "../storage/storage.js";
import { showNotice } from "../ui/notice.js";
import { iframeContext } from "./iframeContext.js";
import { getMenuButton } from "./menuButton.js";



/**
 * 初始化注入iframe元素
 */
export function initInjectIframe()
{
    intervalTry(() => // 循环尝试注入
    {
        /**
         * @type {HTMLIFrameElement}
         */
        let mainIframe = (/** @type {HTMLIFrameElement} */(document.getElementById("mainFrame")));
        let iframeWindow = mainIframe.contentWindow;
        let iframeDocument = mainIframe.contentDocument;
        if (iframeWindow["iiroseForgeInjected"]) // 已经注入iframe
            return;
        if (iframeWindow["socket"].__onmessage != undefined || iframeWindow["socket"]._onmessage == undefined || iframeWindow["socket"]._send == undefined) // 目前无法注入
            throw "main iframe is not ready";
        (() => // 添加菜单按钮
        {
            /**
             * 左侧菜单栏
             */
            let functionHolder = getNElement(/** @type {HTMLElement} */(iframeDocument.getElementById("functionHolder").childNodes[0]));
            let button = getMenuButton();

            functionHolder.insChild(button, 1); // 添加菜单到左侧菜单栏第二个按钮前
        })();

        iframeContext.iframeDocument = iframeDocument;
        iframeContext.iframeWindow = iframeWindow;
        iframeContext.iframeBody = getNElement(/** @type {HTMLBodyElement} */(iframeDocument.body));

        iframeContext.socket = iframeWindow["socket"];

        (() => // 注入socket
        {
            iframeContext.socket._onmessage = proxyFunction(iframeContext.socket._onmessage.bind(iframeContext.socket), (param) =>
            {
                // console.log("get data", data);
                try
                {
                    if (toClient(/** @type {[string]} */(param)))
                        return true;
                }
                catch (err)
                {
                    console.error("[iiroseForge]", err);
                    return false;
                }
                return false;
            });

            iframeContext.socketApi.send = iframeContext.socket.send.bind(iframeContext.socket);

            iframeContext.socket.send = proxyFunction(iframeContext.socketApi.send, (param) =>
            {
                // console.log("send data", data);
                try
                {
                    if (toServer(/** @type {[string]} */(param)))
                        return true;
                }
                catch (err)
                {
                    console.error("[iiroseForge]", err);
                    return false;
                }
                return false;
            });
        })();

        iframeWindow["iiroseForgeInjected"] = true; // iframe上下文已注入标记
        console.log("[iiroseForge] 成功将iiroseForge注入iframe");

        (async () =>
        { // 侧载在内侧执行的脚本
            let scriptCount = 0;
            storageContext.iiroseForge.sideLoadedScript.forEach(([name, url, insideIframe]) =>
            {
                if (insideIframe)
                {
                    let script = document.createElement("script");
                    script.src = url;
                    iframeDocument.body.appendChild(script);
                    scriptCount++;
                }
            });
            if (scriptCount > 0)
                showNotice("iiroseForge plug-in", `已在iframe内侧侧载 ${scriptCount} 个js脚本`);
        })();
    }, 1000);

    if (localStorage.getItem("installForge") == "true")
    {
        intervalTry(() => // 循环尝试注入
        {
            /**
             * @type {HTMLIFrameElement}
             */
            let mainIframe = (/** @type {HTMLIFrameElement} */(document.getElementById("mainFrame")));

            let iframeWindow = mainIframe.contentWindow;
            if(iframeWindow["iiroseForgeClearCacheInjected"])
                return;

            if (!(iframeWindow["Utils"]?.service?.clearCache))
                throw "Incomplete load";
            let old_Utils_service_clearCache = iframeWindow["Utils"].service.clearCache.bind(iframeWindow["Utils"].service);
            iframeWindow["Utils"].service.clearCache = (...param) =>
            {
                let old_parent_location__reload = iframeWindow.parent.location["_reload"].bind(iframeWindow.parent.location);
                iframeWindow.location["_reload"] = iframeWindow.parent.location["_reload"] = (...param) =>
                {
                    setTimeout(async () =>
                    {
                        await writeForgeToCache();
                        setTimeout(() =>
                        {
                            old_parent_location__reload(...param);
                        }, 5);
                    }, 100);
                };
                old_Utils_service_clearCache(...param);
            };
            
            iframeWindow["iiroseForgeClearCacheInjected"] = true;
        }, 5);
    }
}