import { domPath, proxyFunction } from "../../lib/plugToolsLib";
import { NList } from "../../lib/qwqframe";
import { keyboardBind } from "../../lib/qwqframe";
import { iframeContext } from "../injectIframe/iframeContext";
import { toClientTrie } from "../protocol/protocol";
import { storageContext, storageLocalSave } from "../storage/storage";
import { showNotice } from "../ui/notice";
import { createNStyleList as styles } from "../../lib/qwqframe.js";
import { cssG } from "../../lib/qwqframe";
import { NEvent } from "../../lib/qwqframe";
import { showMenu } from "../ui/menu";
import { showInfoBox, showInputBox } from "../ui/infobox";
import { delayPromise } from "../../lib/qwqframe";


/**
 * 启用补丁
 */
export async function enablePatch()
{
    await delayPromise(1100);
    ([
        {
            key: "disableDoubleClickFullScreen",
            cb: () =>
            {
                iframeContext.iframeBody.addEventListener("dblclick", e => e.stopPropagation());
            }
        },
        {
            key: "disableRightEdgeTrigger",
            cb: () =>
            {
                Array.from(
                    iframeContext.iframeDocument.getElementById("msgholderDisplay").children
                ).some(o =>
                {
                    let onMouseEnterStr = o.getAttribute("onmouseenter");
                    if (typeof (onMouseEnterStr) == "string" && onMouseEnterStr.indexOf("buttonProcesser(12)") != -1)
                    {
                        o.remove();
                        return true;
                    }
                    return false;
                });
            }
        },
        {
            key: "f5RefreshInside",
            cb: () =>
            {
                iframeContext.iframeWindow?.addEventListener("keydown", e =>
                {
                    if (e.key == "F5")
                    {
                        e.preventDefault();
                        e.stopPropagation();
                        iframeContext.iframeWindow?.location?.reload?.();
                    }
                }, true);
            }
        },
        {
            key: "fixHoverSound",
            cb: () =>
            {
                if (iframeContext.iframeWindow["Utils"].Sound)
                    iframeContext.iframeWindow["Utils"].Sound.gameAudioPlayer = (e, t) =>
                    {
                        let a = ["select", "click", "check", "cancel", "animationEnter", "animationBack", "animationShow", "animationHide", "animationSwitch", "effect"];
                        let url = iframeContext.iframeWindow["github"] +
                            "lib/system/sound/" +
                            (iframeContext.iframeWindow["panelOpacity"] || e < 4 || 8 < e ? "" : "solid/") +
                            (9 == e ? "effect/" + t : a[e]) +
                            ".mp3";
                        let audio = new Audio(url);
                        audio.volume = iframeContext.iframeWindow[(0 == e ? "selectsound" : 9 == e ? "effectsound" : 0 < e && e < 4 ? "clicksound" : "animationsound") + "probe"] / 10;
                        audio.play();
                    };
            }
        },
        {
            key: "proxyTitle",
            cb: () =>
            {
                if (!Object.getOwnPropertyDescriptor(document, "title"))
                {
                    let nowTitle = document.title;
                    let setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(Object.getPrototypeOf(document)), "title").set;
                    if (!setter)
                        return;
                    /**
                     * @param {string} str
                     */
                    function getNumberFromStringEnd(str)
                    {
                        let index = -1;
                        for (let i = str.length - 1; i >= 0; i--)
                        {
                            let charCode = str.charCodeAt(i);
                            if (
                                (48 <= charCode && charCode <= 57) ||
                                charCode == 32
                            )
                                index = i;
                            else
                                break;
                        }
                        if (index != -1)
                            return Number(str.slice(index));
                        else
                            return NaN;
                    }
                    Object.defineProperty(document, "title", {
                        get: () =>
                        {
                            return nowTitle;
                        },
                        set: (value) =>
                        {
                            nowTitle = value;
                            if (nowTitle.indexOf(",") != -1)
                            {
                                let part = nowTitle.split(",");
                                let firstPart = part[0];
                                while (firstPart.length > 0)
                                {
                                    let charCode = firstPart.at(-1).charCodeAt(0);
                                    if (
                                        (48 <= charCode && charCode <= 57) ||
                                        charCode == 32
                                    )
                                        firstPart = firstPart.slice(0, -1);
                                    else
                                        break;
                                }

                                if (firstPart.length <= 2)
                                {
                                    if (
                                        getNumberFromStringEnd(part[1]) == 0 &&
                                        getNumberFromStringEnd(part[2]) == 0
                                    )
                                    {
                                        setter("蔷薇花园");
                                        return true;
                                    }
                                    part.shift();
                                }
                                else
                                    part[0] = firstPart.slice(0, -2);

                                if (part[0].startsWith(" "))
                                    part[0] = part[0].slice(1);

                                setter.call(document, part.join(","));
                            }
                            else
                                setter.call(document, nowTitle);
                            return true;
                        }
                    });
                }
            }
        }
    ]).forEach(o =>
    {
        let value = storageContext.local.patch[o.key];
        if (value)
        {
            try
            {
                o.cb();
            }
            catch (err)
            {
                console.error(err);
            }
        }
    });
}

/**
 * 显示补丁菜单
 */
export function showPatchMenu()
{
    showMenu([
        ...(([
            {
                name: "禁用双击全屏",
                key: "disableDoubleClickFullScreen"
            },
            {
                name: "禁用右侧边缘显示聊天列表",
                key: "disableRightEdgeTrigger"
            },
            {
                name: "F5键仅刷新iframe内侧",
                key: "f5RefreshInside"
            },
            {
                name: "修复悬停音效",
                key: "fixHoverSound"
            },
            {
                name: "去除标签页标题中的群聊消息",
                key: "proxyTitle"
            }
        ]).map(o => NList.getElement([
            (storageContext.local.patch[o.key] ? " (已启用)" : "(已禁用)") + o.name,
            new NEvent("click", async () =>
            {
                let targetState = !storageContext.local.patch[o.key];
                let confirm = await showInfoBox("设置补丁", `切换 ${o.name} 补丁到 ${targetState ? "启用" : "禁用"} 状态\n可能需要 重载 或 深度重载(刷新页面) 以生效`, true);
                if (confirm)
                {
                    if (targetState)
                        storageContext.local.patch[o.key] = targetState;
                    else
                        delete storageContext.local.patch[o.key];
                    storageLocalSave();
                }
            }),
        ])))
    ]);
}