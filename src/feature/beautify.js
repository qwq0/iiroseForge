import { domPath, proxyFunction } from "../../lib/plugToolsLib";
import { NList } from "../../lib/qwqframe";
import { keyboardBind } from "../../lib/qwqframe";
import { iframeContext } from "../injectIframe/iframeContext";
import { toClientTrie } from "../protocol/protocol";
import { storageContext, storageRoamingSave } from "../storage/storage";
import { showNotice } from "../ui/notice";
import { createIiroseMenuElement } from "./tools";
import { createNStyleList as styles } from "../../lib/qwqframe.js";
import { cssG } from "../../lib/qwqframe";
import { NEvent } from "../../lib/qwqframe";
import { showMenu } from "../ui/menu";
import { showInputBox } from "../ui/infobox";
import { delayPromise } from "../../lib/qwqframe";

/**
 * 启用美化功能
 */
export async function enableBeautify()
{
    await delayPromise(2000);
    ([
        { // 侧边栏顶部图片
            key: "sidebarTopPicture",
            cb: (/** @type {string} */ o) =>
            {
                let imgElement = /** @type {HTMLImageElement} */(domPath(iframeContext.iframeDocument?.getElementById("functionHolderImg"), [0, 0]));
                if (imgElement)
                    imgElement.src = o;
            }
        },
        { // 选择菜单背景图片
            key: "selectMenuBackground",
            cb: (/** @type {string} */ o) =>
            {
                let selectHolderBox = iframeContext.iframeDocument?.getElementById("selectHolderBox");
                if (selectHolderBox)
                    selectHolderBox.style.backgroundImage = `url("${o}")`;
            }
        }
    ]).forEach(o =>
    {
        let value = storageContext.roaming.beautify[o.key];
        if (value)
        {
            try
            {
                o.cb(value);
            }
            catch (err)
            {
                console.error(err);
            }
        }
    });
}

/**
 * 显示美化菜单
 */
export function showBeautifyMenu()
{
    showMenu([
        ...(([
            {
                name: "侧边栏顶部图片",
                key: "sidebarTopPicture",
                type: "text"
            },
            {
                name: "选择菜单背景图片",
                key: "selectMenuBackground",
                type: "text"
            }
        ]).map(o => NList.getElement([
            o.name,
            new NEvent("click", async () =>
            {
                let oldValue = storageContext.roaming.beautify[o.key];
                let value = await showInputBox("美化设置", `设置 ${o.name}`, true, (oldValue ? oldValue : ""));
                if (value != undefined)
                {
                    storageContext.roaming.beautify[o.key] = value;
                    storageRoamingSave();
                }
            }),
        ])))
    ]);
}