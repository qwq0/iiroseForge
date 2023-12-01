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
            }
        ]).map(o => NList.getElement([
            (storageContext.local.patch[o.key] ? " (已启用)" : "(已禁用)") + o.name,
            new NEvent("click", async () =>
            {
                let targetState = !storageContext.local.patch[o.key];
                let confirm = await showInfoBox("设置补丁", `切换 ${o.name} 补丁到 ${targetState ? "启用" : "禁用"} 状态\n可能需要重载以生效`, true);
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