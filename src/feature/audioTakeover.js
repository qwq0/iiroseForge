import { proxyFunction } from "../../lib/plugToolsLib";
import { createHookObj } from "../../lib/qwqframe";
import { NElement, touchBind } from "../../lib/qwqframe";
import { bindValue } from "../../lib/qwqframe";
import { NEvent } from "../../lib/qwqframe";
import { mouseBind } from "../../lib/qwqframe";
import { NList, createNStyleList as styles } from "../../lib/qwqframe.js";
import { iframeContext } from "../injectIframe/iframeContext.js";
import { body } from "../ui/body";
import { showNotice } from "../ui/notice.js";

let showedNotice = false;

/**
 * 启用音频接管
 */
export function enableAudioTakeover()
{
    /**
     * @type {NElement}
     */
    let buttonElement = null;
    let buttonData = createHookObj({
        text: ""
    });
    /**
     * @type {{ type: "roomMedia" } | { type: "infoMedia", src: string }}
     */
    let targetMediaState = null;

    /**
     * @param {HTMLAudioElement | HTMLVideoElement} audioObj
     */
    function isAudioHearable(audioObj)
    {
        return audioObj && audioObj.src != "" && !audioObj.paused && audioObj.volume > 0;
    }

    let tryMuteRoomMedia = false;
    let tryUnmuteRoomMedia = false;
    let tryMuteInfoMedia = false;

    /** @type {HTMLVideoElement} */
    let old_shareMediaObj = iframeContext.iframeWindow?.["shareMediaObj"];
    /** @type {HTMLAudioElement} */
    let old_shareMediaObjAudio = iframeContext.iframeWindow?.["shareMediaObjAudio"];
    /** @type {HTMLAudioElement} */
    let old_radioPlayer = iframeContext.iframeWindow?.["radioPlayer"];
    /**
     * @type {(...arg: Array<any>) => void}
     */
    let old_playerSoundOff = iframeContext.iframeWindow?.["playerSoundOff"];

    /**
     * @type {HTMLAudioElement}
     */
    let old_infosound = iframeContext.iframeWindow?.["infosound"];

    if (!(
        old_shareMediaObj &&
        old_shareMediaObjAudio &&
        old_radioPlayer &&
        old_playerSoundOff &&
        old_infosound
    ))
        return;

    old_infosound.removeAttribute("loop");
    old_infosound.removeAttribute("autoplay");
    iframeContext.iframeWindow["infosound"] = new Proxy(old_infosound, {
        get: (_target, key) =>
        {
            // console.log("info media do get", key);
            let srcValue = old_infosound[key];
            switch (key)
            {
                case "play": {
                    return () =>
                    {
                        old_infosound.play();
                    };
                }
                case "pause": {
                    return () =>
                    {
                        old_infosound.pause();
                    };
                }
                case "": {
                    return (targetMediaState?.type == "infoMedia" ? targetMediaState.src : "");
                }
                case "getAttribute": {
                    return (/** @type {string} */ attrKey) =>
                    {
                        // console.log("get", attrKey);
                        if (attrKey == "src")
                        {
                            return (targetMediaState?.type == "infoMedia" ? targetMediaState.src : "");
                        }
                        return old_infosound.getAttribute(attrKey);
                    };
                }
                case "setAttribute": {
                    return (/** @type {string} */ attrKey, /** @type {string} */ attrValue) =>
                    {
                        // console.log("set", attrKey, attrValue);
                        if (attrKey == "src")
                        {
                            if (attrValue == "")
                            {
                                tryMuteInfoMedia = true;

                                targetMediaState = { type: "roomMedia" };
                                refreshButton();
                            }
                            else
                            {
                                targetMediaState = { type: "infoMedia", src: attrValue };
                            }
                        }
                        else
                            old_infosound.setAttribute(attrKey, attrValue);
                    };
                }
            }
            if (typeof (srcValue) == "function")
                return srcValue.bind(old_infosound);
            else
                return srcValue;
        },
        set: (_target, key, value) =>
        {
            // console.log("info media do set", key, value);
            switch (key)
            {
                case "src": {
                    targetMediaState = { type: "infoMedia", src: value };
                    if (old_infosound.src == value)
                        void 0;
                    else if (
                        (
                            tryMuteInfoMedia
                        ) ||
                        (
                            tryMuteRoomMedia &&
                            (
                                isAudioHearable(old_shareMediaObjAudio)
                            )
                        )
                    )
                    {
                        setTimeout(() => { refreshButton(); }, 10);
                    }
                    else
                    {
                        old_infosound.src = value;
                        old_infosound.play();
                        if (tryMuteRoomMedia)
                        {
                            old_playerSoundOff();
                            tryMuteRoomMedia = false;
                        }
                        if (tryMuteInfoMedia)
                        {
                            old_infosound.play();
                            tryMuteInfoMedia = false;
                        }
                    }
                    break;
                }
                case "currentTime": {
                    if (tryMuteInfoMedia)
                        void 0;
                    else
                        old_infosound.currentTime = value;
                    break;
                }
                default:
                    old_infosound[key] = value;
            }
            return true;
        },
    });


    iframeContext.iframeWindow["playerSoundOff"] = proxyFunction(old_playerSoundOff, (param) =>
    {
        setTimeout(() =>
        {
            refreshButton();
        }, 10);

        if (
            param[0] == undefined &&
            (
                isAudioHearable(old_shareMediaObjAudio)
            )
        )
        {
            tryMuteRoomMedia = true;
            return true;
        }
        else if (param[0] == 1)
        {
            targetMediaState = { type: "roomMedia" };

            if (
                isAudioHearable(old_infosound)
            )
            {
                tryUnmuteRoomMedia = true;
                return true;
            }
        }
        tryMuteRoomMedia = false;
        return false;
    });


    /**
     * 刷新按钮 按需显示
     */
    function refreshButton()
    {
        if (
            targetMediaState?.type == "roomMedia" &&
            isAudioHearable(old_infosound)
        )
        {
            buttonData.text = "转回房间音频";
            showFloatingButton();
        }
        else if (
            targetMediaState?.type == "infoMedia" &&
            (
                targetMediaState.src != old_infosound.src ||
                !isAudioHearable(old_infosound)
            )
        )
        {
            buttonData.text = "转到资料音频";
            showFloatingButton();
        }
        else
            hideFloatingButton();
    }

    /**
     * 显示悬浮窗
     */
    function showFloatingButton()
    {
        if (buttonElement)
        {
            buttonElement.setDisplay("block");
            return;
        }

        if (!showedNotice)
        {
            showNotice("接管音频", "您正在使用forge测试功能(接管音频)\n如果存在问题请在 附加功能 中关闭");
            showedNotice = true;
        }

        let x = 0, y = 0;
        let width = 50, height = 50;
        let allowClick = false;

        buttonElement = NList.getElement([
            styles({
                position: "fixed",
                overflow: "hidden",
                border: "1px white solid",
                backgroundColor: "rgba(30, 30, 30, 0.55)",
                backdropFilter: "blur(2px)",
                color: "rgba(255, 255, 255)",
                alignItems: "center",
                justifyContent: "center",
                flexFlow: "column",
                lineHeight: "1.1em",
                boxSizing: "border-box",
                padding: "1px",
                borderRadius: "2.5px",
                zIndex: "90000001",
                height: "50px",
                minWidth: "50px"
            }),

            [
                styles({
                    display: "flex",
                    height: "100%",
                    paddingLeft: "1em",
                    paddingRight: "1em",
                    justifyContent: "center",
                    alignItems: "center",
                }),

                bindValue(buttonData, "text"),

                new NEvent("mousedown", e => e.preventDefault()),
                new NEvent("mouseup", e => e.preventDefault()),
                new NEvent("click", () =>
                {
                    if (!allowClick)
                    {
                        allowClick = false;
                        return;
                    }

                    if (targetMediaState?.type == "roomMedia")
                    {
                        old_infosound.setAttribute("src", "");
                        // if (tryUnmuteRoomMedia)
                        {
                            old_playerSoundOff(1);
                            tryUnmuteRoomMedia = false;
                        }
                        if (tryMuteInfoMedia)
                        {
                            tryMuteInfoMedia = false;
                        }
                        hideFloatingButton();
                    }
                    else if (targetMediaState?.type == "infoMedia")
                    {
                        showFloatingButton();
                        old_infosound.src = targetMediaState?.src;
                        old_infosound.play();
                        if (tryMuteRoomMedia)
                        {
                            old_playerSoundOff();
                            tryMuteRoomMedia = false;
                        }
                        if (tryMuteInfoMedia)
                        {
                            old_infosound.play();
                            tryMuteInfoMedia = false;
                        }
                        hideFloatingButton();
                    }
                })
            ],

            e =>
            {
                let ox = 0, oy = 0;

                /**
                 * 按下的时间
                 */
                let startPressTime = 0;
                /**
                 * 位置未移动
                 */
                let notMove = false;
                let proc = (/** @type {{ sx: number, sy: number, x: number, y: number, pressing: boolean,hold: boolean }} */ e) =>
                {
                    let now = Date.now();
                    if (e.pressing)
                    {
                        startPressTime = now;
                        notMove = true;
                        allowClick = false;
                    }
                    if (Math.abs(e.x - e.sx) > 10 || Math.abs(e.y - e.sy) > 10)
                        notMove = false;
                    if (!e.hold)
                    {
                        if (notMove && now - startPressTime < 150)
                        {
                            let startTargetElement = iframeContext.iframeDocument.elementFromPoint(e.sx, e.sy);
                            let endTargetElement = iframeContext.iframeDocument.elementFromPoint(e.x, e.y);
                            if (startTargetElement == endTargetElement)
                            {
                                allowClick = true;
                                startTargetElement.dispatchEvent(new MouseEvent("click"));
                            }
                        }
                    }

                    if (e.pressing)
                    {
                        ox = x;
                        oy = y;
                        // pageManager.moveToTop(this);
                    }
                    x = ox + e.x - e.sx;
                    y = oy + e.y - e.sy;
                    if (x < 0)
                        x = 0;
                    else if (x >= body.element.clientWidth - buttonElement.element.offsetWidth)
                        x = body.element.clientWidth - buttonElement.element.offsetWidth;
                    if (y < 0)
                        y = 0;
                    else if (y >= body.element.clientHeight - buttonElement.element.offsetHeight)
                        y = body.element.clientHeight - buttonElement.element.offsetHeight;
                    buttonElement.setStyle("left", `${x}px`);
                    buttonElement.setStyle("top", `${y}px`);
                };

                e.addEventListener("mousedown", e => e.preventDefault(), true);
                e.addEventListener("mouseup", e => e.preventDefault(), true);
                mouseBind(e, proc, 0, iframeContext.iframeWindow);
                touchBind(e, proc);

                e.addEventListener("mousedown", e => e.stopPropagation());
                e.addEventListener("mouseup", e => e.stopPropagation());
                e.addEventListener("touchstart", e => e.stopPropagation());
                e.addEventListener("touchend", e => e.stopPropagation());
                e.addEventListener("touchcancel", e => e.stopPropagation());
            },
        ]);

        iframeContext.iframeBody.addChild(buttonElement);
    }

    /**
     * 隐藏悬浮窗
     */
    function hideFloatingButton()
    {
        if (buttonElement)
        {
            buttonElement.setDisplay("none");
        }
    }
}