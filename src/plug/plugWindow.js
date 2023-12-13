import { SandboxContext } from "../../lib/iframeSandbox.js";
import { NList, createNStyle as style, getNElement, createNStyleList, NAsse, NEvent, NElement, mouseBind, touchBind } from "../../lib/qwqframe.js";
import { body } from "../ui/body.js";

/**
 * 创建悬浮窗
 */
export function createPlugWindow(noSandbox = false)
{
    let x = 0, y = 0;
    let width = 280, height = 190;
    let resizeSliderShowUpTimeout = null;
    let resizeSlider = null;
    /**
     * @type {NElement}
     */
    let iframeHolder = null;
    /**
     * @type {NElement<HTMLIFrameElement>}
     */
    let iframe = null;
    let windowElement = NList.getElement([
        createNStyleList({
            display: "none",
            position: "fixed",
            overflow: "hidden",
            border: "1px white solid",
            backgroundColor: "rgba(30, 30, 30, 0.85)",
            backdropFilter: "blur(2px)",
            color: "rgba(255, 255, 255)",
            alignItems: "center",
            justifyContent: "center",
            flexFlow: "column",
            lineHeight: "1.1em",
            boxSizing: "border-box",
            padding: "10px",
            borderRadius: "3px",
            pointerEvents: "none",
            resize: "both",
            boxShadow: `rgba(0, 0, 0, 0.5) 5px 5px 10px`,
            zIndex: "20001",
            height: "190px",
            width: "280px"
        }),

        /*
        new NAsse(e =>
        {
            e.animate([
                {
                    transform: "scale(0.9) translateY(-100px)"
                },
                {
                }
            ], {
                duration: 120
            });
            setTimeout(() => { e.setStyle("pointerEvents", "auto"); }, 120);
        }),
        */

        [
            "plug-in",
            createNStyleList({
                position: "absolute",
                left: "0",
                top: "0",
                right: "0",
                cursor: "move",
                lineHeight: "1.5em",
                backgroundColor: "rgba(100, 100, 100, 0.2)"
            }),
            e =>
            {
                let ox = 0, oy = 0;
                let proc = (/** @type {{ sx: number, sy: number, x: number, y: number, pressing: boolean,hold: boolean }} */ o) =>
                {
                    if (o.hold)
                    {
                        if (o.pressing)
                        {
                            ox = x;
                            oy = y;
                            // pageManager.moveToTop(this);
                        }
                        x = ox + o.x - o.sx;
                        y = oy + o.y - o.sy;
                        if (x < 0)
                            x = 0;
                        else if (x >= body.element.clientWidth - windowElement.element.offsetWidth)
                            x = body.element.clientWidth - windowElement.element.offsetWidth;
                        if (y < 0)
                            y = 0;
                        else if (y >= body.element.clientHeight - windowElement.element.offsetHeight)
                            y = body.element.clientHeight - windowElement.element.offsetHeight;
                        windowElement.setStyle("left", `${x}px`);
                        windowElement.setStyle("top", `${y}px`);
                        iframe.setStyle("pointerEvents", "none");
                    }
                    else
                        iframe.setStyle("pointerEvents", "auto");
                };
                mouseBind(e, proc);
                touchBind(e, proc);
            },

            new NEvent("touchend", () =>
            {
                if (resizeSliderShowUpTimeout != null)
                {
                    clearTimeout(resizeSliderShowUpTimeout);
                    resizeSliderShowUpTimeout = null;
                }
                else
                {
                    resizeSlider.setDisplay("block");
                }
                resizeSliderShowUpTimeout = setTimeout(() =>
                {
                    resizeSliderShowUpTimeout = null;
                    resizeSlider.setDisplay("none");
                }, 2500);
            }),
        ],

        [ // 右上角最小化按钮
            "-",
            createNStyleList({
                position: "absolute",
                right: "4px",
                top: "1px",
                cursor: "default",
                fontSize: "1.5em",
                lineHeight: "1em"
            }),
            new NEvent("click", () =>
            {
                windowElement.setDisplay("none");
            })
        ],

        [ // 页面主体
            createNStyleList({
                position: "absolute",
                top: "1.5em",
                bottom: "0",
                left: "0",
                right: "0",
                overflow: "auto",
            }),
            new NAsse(e => { iframeHolder = e; })
        ],

        [ // 右下角设置大小拖拽块
            createNStyleList({
                position: "absolute",
                right: "0.5px",
                bottom: "0.5px",
                height: "1.5em",
                aspectRatio: "1",
                cursor: "nwse-resize",
                display: "none",
                boxSizing: "border-box",
                borderRight: "0.75em blue solid",
                borderBottom: "0.75em blue solid",
                borderTop: "0.75em transparent solid",
                borderLeft: "0.75em transparent solid",
            }),
            new NEvent("click", () =>
            {
                windowElement.setDisplay("none");
            }),
            new NAsse(e => { resizeSlider = e; }),
            new NAsse(e =>
            {
                var ow = 0, oh = 0;
                var proc = (/** @type {{ sx: number, sy: number, x: number, y: number, pressing: boolean,hold: boolean }} */ o) =>
                {
                    if (o.hold)
                    {
                        if (o.pressing)
                        {
                            ow = width;
                            oh = height;
                            // pageManager.moveToTop(this);
                        }
                        width = ow + o.x - o.sx;
                        height = oh + o.y - o.sy;
                        windowElement.setStyle("width", `${width}px`);
                        windowElement.setStyle("height", `${height}px`);
                        iframe.setStyle("pointerEvents", "none");
                    }
                    else
                        iframe.setStyle("pointerEvents", "auto");
                };
                mouseBind(e, proc);
                touchBind(e, proc);
            })
        ],
    ]);
    body.addChild(windowElement);
    new ResizeObserver(() =>
    {
        width = windowElement.element.offsetWidth;
        height = windowElement.element.offsetHeight;
        if (x > body.element.clientWidth - width)
            windowElement.setStyle("width", `${width = (body.element.clientWidth - x)}px`);
        if (y > body.element.clientHeight - height)
            windowElement.setStyle("height", `${height = (body.element.clientHeight - y)}px`);
        if (x < 0)
        {
            x = 0;
            windowElement.setStyle("left", `${x}px`);
        }
        if (y < 0)
        {
            y = 0;
            windowElement.setStyle("top", `${y}px`);
        }
    }).observe(windowElement.element);

    /**
     * @type {SandboxContext}
     */
    let sandbox = null;
    if (!noSandbox)
    {
        sandbox = new SandboxContext(iframeHolder.element);
        iframe = getNElement(sandbox.iframe);
    }
    else
    {
        iframe = getNElement(document.createElement("iframe"));
        iframeHolder.addChild(iframe);
    }
    iframe.setStyles({
        display: "block",
        border: "none",
        height: "100%",
        width: "100%"
    });
    return ({
        windowElement: windowElement,
        sandbox: sandbox,
        iframe: iframe
    });
}
/**
 * 在悬浮窗中创建插件沙箱
 * 以便插件显示ui
 */
export function createPlugSandboxWithWindow()
{
    let plugWindow = createPlugWindow(false);
    return ({
        windowElement: plugWindow.windowElement,
        sandbox: plugWindow.sandbox
    });
}