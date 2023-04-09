import { intervalTry, proxyFunction } from "../../lib/plugToolsLib.js";
import { getNElement, NList, createNStyle as style, NTagName, NAsse, NEvent } from "../../lib/qwqframe.js";
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
        if (iframeWindow["socket"].__onmessage != undefined) // 目前无法注入
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
                let data = param[0];
                console.log("get data", data);
                return false;
            });
            iframeContext.socket.send = proxyFunction(iframeContext.socket.send.bind(iframeContext.socket), (param) =>
            {
                let data = param[0];
                console.log("send data", data);
                return false;
            });
        })();

        iframeWindow["iiroseForgeInjected"] = true; // iframe上下文已注入标记
        console.log("[iiroseForge] 成功将iiroseForge注入iframe");
    }, 1000);
}