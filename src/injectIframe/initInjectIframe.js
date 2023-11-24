import { intervalTry, proxyFunction } from "../../lib/plugToolsLib.js";
import { getNElement, NList, createNStyle as style, NTagName, NAsse, NEvent } from "../../lib/qwqframe.js";
import { enableForgeDebugMode } from "../feature/debugMode.js";
import { forgeApi } from "../forgeApi/forgeApi.js";
import { globalState } from "../globalState.js";
import { writeForgeToCache } from "../injectCache/injectCache.js";
import { enableUserRemark } from "../feature/userRemark.js";
import { toClient, toServer } from "../protocol/protocol.js";
import { storageContext } from "../storage/storage.js";
import { showNotice } from "../ui/notice.js";
import { iframeContext } from "./iframeContext.js";
import { getMenuButton } from "./menuButton.js";
import { enableSyncConfig } from "../feature/syncConfig.js";
import { enableSyncChatRecord, trySyncChatRecord } from "../feature/syncChatRecord.js";
import { enableSuperMenu } from "../feature/superMenu/superMenu.js";
import { enableExperimental } from "../feature/experimental.js";
import { enableMultiAccount } from "../feature/multiAccount.js";
import { enableMonitor } from "../feature/monitor.js";
import { enableBeautify } from "../feature/beautify.js";



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
        iframeContext.iframeDocument = iframeDocument;
        iframeContext.iframeWindow = iframeWindow;
        iframeContext.iframeBody = getNElement(/** @type {HTMLBodyElement} */(iframeDocument.body));

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

        iframeContext.socket = iframeWindow["socket"];

        (() => // 注入socket
        {
            iframeContext.socket._onmessage = proxyFunction(iframeContext.socket._onmessage.bind(iframeContext.socket), (param) =>
            {
                if (globalState.debugMode)
                    console.log("receive packet", param);
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
                if (globalState.debugMode)
                    console.log("send packet", param);
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

        iframeWindow["iiroseForgeApi"] = forgeApi; // 给内侧侧载脚本预留forgeApi

        if (globalState.debugMode)
            enableForgeDebugMode(globalState.debugMode);

        (async () =>
        { // 侧载在内侧执行的脚本
            let scriptCount = 0;
            storageContext.roaming.sideLoadedScript.forEach(([name, url, insideIframe]) =>
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

        // 附加功能
        ([
            {
                func: enableSyncConfig,
            },
            {
                func: enableSyncChatRecord
            },
            {
                func: enableMultiAccount
            },
            {
                func: enableMonitor
            },
            {
                func: enableBeautify
            },
            {
                func: enableUserRemark,
                condition: "enableUserRemark"
            },
            {
                func: trySyncChatRecord,
                condition: "enableSyncChatRecord"
            },
            {
                func: enableSuperMenu,
                condition: "enableSuperMenu"
            },
            {
                func: enableExperimental,
                condition: "enableExperimental"
            }
        ]).forEach(o =>
        {
            try
            {
                if ((!o.condition) || storageContext.local[o.condition])
                    o.func();
            }
            catch (err)
            {
                console.error("patch error:", err);
            }
        });
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
            if (iframeWindow["iiroseForgeClearCacheInjected"])
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
                        await writeForgeToCache(false);
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