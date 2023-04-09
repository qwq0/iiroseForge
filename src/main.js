import { initInjectIframe } from "./injectIframe/initInjectIframe.js";
import "./forgeApi/forgeApi.js";


if (location.host == "iirose.com")
{
    if (location.pathname == "/")
    {
        if (!window["iiroseForgeInjected"])
        {
            (/** @type {HTMLIFrameElement} */(document.getElementById("mainFrame"))).addEventListener("load", () => // 主iframe加载事件
            {
                console.log("[iiroseForge] 正在将iiroseForge注入iframe");
                initInjectIframe();
            });


            console.log("[iiroseForge] iiroseForge已启用");
            window["iiroseForgeInjected"] = true; // 最外层页面已被注入标记
        }
        else
            console.log("[iiroseForge] 已阻止重复注入");
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