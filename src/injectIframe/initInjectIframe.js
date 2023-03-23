import { intervalTry, proxyFunction } from "../../lib/plugToolsLib.js";
import { getNElement, NList, createNStyle as style, NTagName, NAsse, NEvent } from "../../lib/qwqframe.js";

/**
 * 主iframe的上下文
 */
export let iframeCt = {
    iframeWindow: null,
    iframeDocument: null,
    socket: null
};


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
            let button = NList.getElement([
                style("background", "#fff"),
                style("boxShadow", "0 0 1px rgb(0,0,0,0.12),0 1px 1px rgb(0,0,0,0.24)"),
                style("position", "relative"),
                style("zIndex", "1"),

                style("color", "#212121"),
                style("paddingLeft", "16px"),
                style("paddingRight", "56px"),
                style("transition", "background-color 0.1s ease 0s, color 0.1s ease 0s"),
                style("cursor", "url(images/cursor/2.cur), pointer"),
                style("width", "100%"),
                style("height", "56px"),
                style("boxSizing", "border-box"),
                style("lineHeight", "56px"),
                style("whiteSpace", "nowrap"),

                new NEvent("click", () =>
                {
                }),

                [
                    new NTagName("span"),
                    new NAsse(e => e.element.classList.add("functionBtnIcon", "mdi-anvil"))
                ],
                [
                    new NTagName("span"),
                    "Forge菜单",
                    new NAsse(e => e.element.classList.add("functionBtnFont"))
                ],
                [
                    new NTagName("span"),
                    style("transform", "rotate(-90deg)"),
                    new NAsse(e => e.element.classList.add("functionBtnGroupIcon"))
                ]
            ]);
            button.element.id = "iiroseForgeMenuButton";

            functionHolder.insChild(button, 1); // 添加菜单到左侧菜单栏第二个按钮前
        })();

        iframeCt.iframeDocument = iframeDocument;
        iframeCt.iframeWindow = iframeWindow;

        iframeCt.socket = iframeWindow["socket"];

        (() => // 注入socket
        {
            iframeCt.socket._onmessage = proxyFunction(iframeCt.socket._onmessage.bind(iframeCt.socket), (data) =>
            {
                return false;
            });
        });

        iframeWindow["iiroseForgeInjected"] = true; // iframe上下文已注入标记
    }, 1000);
}