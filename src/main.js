import { initInjectIframe } from "./injectIframe/initInjectIframe.js";

if (!window["iiroseForgeInjected"])
{
    (/** @type {HTMLIFrameElement} */(document.getElementById("mainFrame"))).addEventListener("load", () => // 主iframe加载事件
    {
        initInjectIframe();
    });


    console.log("[iiroseForge] 已注入iiroseForge");
    window["iiroseForgeInjected"] = true; // 最外层页面已被注入标记
}
else    
    console.log("[iiroseForge] 已阻止重复注入");