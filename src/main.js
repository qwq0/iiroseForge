import "./forgeApi/forgeApi.js";
import { initInjectIframe } from "./injectIframe/initInjectIframe.js";
import { iiroseForgeLoaderUrl } from "./injectCache/injectCache.js";
import { showNotice } from "./ui/notice.js";
import { plugList } from "./plug/plugList.js";
import { storageContext, storageLocalRead, storageLocalSave, storageRoamingRead } from "./storage/storage.js";
import { enableForgeDebugMode } from "./feature/debugMode.js";


if (location.host == "iirose.com")
{
    if (location.pathname == "/")
    {
        if (!window["iiroseForgeInjected"])
        {
            window["iiroseForgeInjected"] = true; // 最外层页面已被注入标记

            console.log("[iiroseForge] iiroseForge已启用");

            window["enableForgeDebugMode"] = enableForgeDebugMode;
            if (sessionStorage.getItem("iiroseForgeDebugMode") == "true")
                enableForgeDebugMode(true);

            storageRoamingRead();
            storageLocalRead();

            plugList.readPlugList();


            let mainIframe = (/** @type {HTMLIFrameElement} */(document.getElementById("mainFrame")));
            mainIframe.addEventListener("load", () => // 主iframe加载事件
            {
                console.log("[iiroseForge] 已重载 正在将iiroseForge注入iframe");
                initInjectIframe();
            });
            console.log("[iiroseForge] 正在将iiroseForge注入iframe");
            initInjectIframe();
            window.addEventListener("beforeunload", () =>
            {
                storageContext.local.lastCloseTime = Date.now();
                storageLocalSave();
            });

            // 长时间连不上ws弹出提示

            let cannotLoad = 0;
            let showHelpNotice = false;
            setInterval(() =>
            {
                if (mainIframe.contentWindow?.["socket"]?.readyState == 0)
                {
                    if (cannotLoad >= 2)
                    {
                        if (!showHelpNotice)
                        {
                            showHelpNotice = true;
                            showNotice(
                                "无法连接",
                                ([
                                    `检测到连接到iirose服务器的速度过慢`,
                                    `正在连接: ${mainIframe.contentWindow?.["socket"]?.url}`,
                                    `可能是当前尝试连接的服务器出现了问题`,
                                    `点击以尝试连接其他候选服务器`
                                ]).join("\n"),
                                undefined,
                                () =>
                                {
                                    cannotLoad = 0;
                                    showHelpNotice = false;
                                    if (mainIframe.contentWindow?.["socket"]?.readyState == 0)
                                    {
                                        try
                                        {
                                            mainIframe.contentWindow?.["socket"]?.close();
                                        }
                                        catch (err)
                                        { }
                                        try
                                        {
                                            mainIframe.contentWindow?.["socket"]?.onerror();
                                        }
                                        catch (err)
                                        { }
                                    }
                                }
                            );
                        }
                    }
                    else
                        cannotLoad++;
                }
                else
                {
                    cannotLoad = 0;
                    showHelpNotice = false;
                }
            }, 3000);

            (async () =>
            { // 侧载在外侧执行的脚本
                let scriptCount = 0;
                storageContext.roaming.sideLoadedScript.forEach(([name, url, insideIframe]) =>
                {
                    if (!insideIframe)
                    {
                        let script = document.createElement("script");
                        script.src = url;
                        window.document.body.appendChild(script);
                        scriptCount++;
                    }
                });
                if (scriptCount > 0)
                    showNotice("iiroseForge plug-in", `已在iframe外部侧载 ${scriptCount} 个js脚本`);
            })();
        }
        else
            console.log("[iiroseForge] 已阻止重复注入");
    }
    else if (location.pathname == "/messages.html")
    {
        console.log("[iiroseForge] iiroseForge需要注入至主上下文中");
        if (parent?.location?.host == "iirose.com" && parent?.location?.pathname == "/")
        {
            let doc = parent.document;
            let script = doc.createElement("script");
            script.src = iiroseForgeLoaderUrl;
            doc.body.appendChild(script);
            console.log("[iiroseForge] 修正注入");
        }
    }
    else
    {
        console.log("[iiroseForge] 已阻止注入 iiroseForge需要注入至根页面的主上下文中");
    }
}
else
{
    console.log("[iiroseForge] 已阻止注入 iiroseForge仅支持蔷薇花园(iirose.com)");
}