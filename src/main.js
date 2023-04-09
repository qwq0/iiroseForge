import { initInjectIframe } from "./injectIframe/initInjectIframe.js";
import "./forgeApi/forgeApi.js";



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