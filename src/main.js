import "./forgeApi/forgeApi.js";
import { initInjectIframe } from "./injectIframe/initInjectIframe.js";
import { iiroseForgeLoaderUrl } from "./injectCache/injectCache.js";
import { showNotice } from "./ui/notice.js";


if (location.host == "iirose.com")
{
    if (location.pathname == "/")
    {
        if (!window["iiroseForgeInjected"])
        {
            console.log("[iiroseForge] iiroseForge已启用");

            let mainIframe = (/** @type {HTMLIFrameElement} */(document.getElementById("mainFrame")));
            mainIframe.addEventListener("load", () => // 主iframe加载事件
            {
                console.log("[iiroseForge] 已重载 正在将iiroseForge注入iframe");
                initInjectIframe();
            });
            console.log("[iiroseForge] 正在将iiroseForge注入iframe");
            initInjectIframe();

            window["iiroseForgeInjected"] = true; // 最外层页面已被注入标记
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