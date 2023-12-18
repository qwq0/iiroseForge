import { domPath, proxyFunction } from "../../lib/plugToolsLib";
import { NList } from "../../lib/qwqframe";
import { keyboardBind } from "../../lib/qwqframe";
import { iframeContext } from "../injectIframe/iframeContext";
import { toClientTrie } from "../protocol/protocol";
import { storageContext, storageRoamingSave } from "../storage/storage";
import { showNotice } from "../ui/notice";
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
    let styleStr = "";
    await delayPromise(1100);
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
        { // 侧边栏列表背景图片
            key: "sidebarListPicture",
            cb: (/** @type {string} */ o) =>
            {
                let functionHolder = iframeContext.iframeDocument?.getElementById("functionHolder");
                if (functionHolder)
                {
                    functionHolder.style.backgroundImage = `url("${o}")`;
                    functionHolder.style.backgroundSize = `cover`;
                    functionHolder.style.backgroundPosition = `top ${functionHolder.children[0].children[0]["style"].height} left 0px`;
                    Array.from(functionHolder.children[0].children).forEach((/** @type {HTMLElement} */ o) =>
                    {
                        if (o.classList.contains("functionItemBox"))
                            o.style.backgroundColor = "rgba(127, 127, 127, 0.1)";
                        else
                            o.style.backgroundColor = "transparent";
                    });
                    styleStr += ([
                        ".functionButtonGroup:hover, .functionButton:hover",
                        "{",
                        "background: rgba(127, 127, 127, 0.3) !important;",
                        "}",
                    ]).join("\n");
                }
            }
        },
        { // 选择菜单背景图片
            key: "selectMenuBackground",
            cb: (/** @type {string} */ o) =>
            {
                let selectHolderBox = iframeContext.iframeDocument?.getElementById("selectHolderBox");
                if (selectHolderBox)
                {
                    selectHolderBox.style.backgroundImage = `url("${o}")`;
                    selectHolderBox.style.backgroundSize = `cover`;
                }
            }
        },
        { // 选择菜单圆角半径
            key: "selectMenuBorderRadius",
            cb: (/** @type {string} */ o) =>
            {
                let selectHolderBox = iframeContext.iframeDocument?.getElementById("selectHolderBox");
                if (selectHolderBox)
                {
                    selectHolderBox.style.borderRadius = o + "px";
                }
            }
        },
        { // 消息图片圆角半径
            key: "messageImgBorderRadius",
            cb: (/** @type {string} */ o) =>
            {
                styleStr += ([
                    ".roomChatContentBox img, .privatemsgMessagesBodyItemBodyBox img",
                    "{",
                    `border-radius: ${o}px !important;`,
                    "}",
                ]).join("\n");
            }
        },
        { // 消息头像圆角半径
            key: "messageAvatarBorderRadius",
            cb: (/** @type {string} */ o) =>
            {
                styleStr += ([
                    ".msgavatar, .msgavatar img, .privatemsgMessagesBodyItem .privatemsgMessagesBodyItemIcon, .privatemsgMessagesBodyItem .privatemsgMessagesBodyItemIcon img",
                    "{",
                    `border-radius: ${o}px !important;`,
                    "}",
                ]).join("\n");
            }
        },
        { // 系统消息圆角半径
            key: "systemMessageBorderRadius",
            cb: (/** @type {string} */ o) =>
            {
                styleStr += ([
                    ".pubMsgSystem span",
                    "{",
                    `border-radius: ${o}px !important;`,
                    "}",
                ]).join("\n");
            }
        },
        { // 系统消息图片圆角半径
            key: "systemMessageImgBorderRadius",
            cb: (/** @type {string} */ o) =>
            {
                styleStr += ([
                    ".pubMsgSystem .pubMsgSystemIcon, .pubMsgSystem img",
                    "{",
                    `border-radius: ${o}px !important;`,
                    "}",
                ]).join("\n");
            }
        },
        { // 会话列表项目圆角半径
            key: "sessionListItemBorderRadius",
            cb: (/** @type {string} */ o) =>
            {
                styleStr += ([
                    ".sessionHolderPmTaskBoxItem, .sessionHolderPmTaskBoxItem img",
                    "{",
                    `border-radius: ${o}px !important;`,
                    "}",
                ]).join("\n");
            }
        },
        { // 面板项圆角半径
            key: "panelItemBorderRadius",
            cb: (/** @type {string} */ o) =>
            {
                styleStr += ([
                    "#panelHolder .shopItem, #panelHolder img, .contentItemContent :is(.commonBox, .commonBox .commonBoxHead, .commonBox .shopItemColor, .cardTag)",
                    "{",
                    `border-radius: ${o}px !important;`,
                    "}",
                ]).join("\n");
            }
        },
        { // 提示框背景图片
            key: "alertBackground",
            cb: (/** @type {string} */ o) =>
            {
                styleStr += ([
                    "#alertHolder > div",
                    "{",
                    `background-image: url("${o}") !important;`,
                    `background-size: cover !important;`,
                    "}",
                ]).join("\n");
            }
        },
        { // 会话消息圆角半径
            key: "sessionMessageBorderRadius",
            cb: (/** @type {string} */ o) =>
            {
                styleStr += ([
                    // 公屏
                    ".room_chat_content",
                    "{",
                    `border-radius: ${o}px;`,
                    "}",

                    `.room_chat_content[style*="border-right"]`,
                    "{",
                    `border-radius: ${o}px ${o}px 0 ${o}px;`,
                    "}",

                    `.room_chat_content[style*="border-right"] .systemCardMediaShareImg`,
                    "{",
                    `border-radius: ${o}px 0 0 ${o}px`,
                    "}",

                    ".chatContentHolder:not(.publicMsgHasBubble)",
                    "{",
                        `border-radius: ${o}px;`,
                        "overflow: hidden;",
                    "}",

                    `.room_chat_content[style*="border-right"]>div[style*="top:0;bottom:0;right:-6px;"]>div`,
                    "{",
                    `width: ${o}px !important;`,
                    `border-radius: 0 ${o}px 0 0;`,
                    "}",

                    `.room_chat_content[style*="border-right"]>div[style*="top:0;bottom:0;right:-6px;"]>svg`,
                    "{",
                    "right:-7.5px !important;",
                    "}",

                    `.room_chat_content[style*="border-left"]`,
                    "{",
                    "overflow: visible;",
                    `border-radius: ${o}px ${o}px ${o}px 0;`,
                    "}",

                    `.room_chat_content[style*="border-left"] .systemCardMediaShareImg`,
                    "{",
                    `border-radius: 0 ${o}px ${o}px 0`,
                    "}",

                    `.room_chat_content[style*="border-left"]>div[style*="top:0;bottom:0;left:-6px;"]>div`,
                    "{",
                    `width: ${o}px !important;`,
                    `border-radius: ${o}px 0 0 0;`,
                    "}",

                    // 私聊
                    ".privateMsgNoBubble",
                    "{",
                    `border-radius: ${o}px;`,
                    "overflow: hidden;",
                    "}",

                    ".privatemsgMessagesBodyItemBodyBG",
                    "{",
                    `border-radius: ${o}px;`,
                    "}",

                    `.privatemsgMessagesBodyItemBodyBG[style*="border-right"]`,
                    "{",
                    "overflow: visible;",
                    `border-radius: ${o}px ${o}px 0 ${o}px;`,
                    "}",

                    `.privatemsgMessagesBodyItemBodyBG[style*="border-right"]>div[style*="right:-6px;top:0;bottom:0;"]>div`,
                    "{",
                    `width: ${o}px !important;`,
                    `border-radius: 0 ${o}px 0 0;`,
                    "}",

                    `.privatemsgMessagesBodyItemBodyBG[style*="border-right"]>div[style*="right:-6px;top:0;bottom:0;"]>svg`,
                    "{",
                    "right:-7.5px !important;",
                    "}",

                    `.privatemsgMessagesBodyItemBodyBG[style*="border-left"]`,
                    "{",
                    `border-radius: ${o}px ${o}px ${o}px 0;`,
                    "}",

                    `.privatemsgMessagesBodyItemBodyBG[style*="border-left"]>div[style*="left:-6px;top:0;bottom:0;"]>div`,
                    "{",
                    `width: ${o}px !important;`,
                    `border-radius: ${o}px 0 0 0;`,
                    "}",

                ]).join("\n");
            }
        },
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

    if (styleStr)
    {
        let styleElement = document.createElement("style");
        styleElement.textContent = styleStr;
        iframeContext.iframeDocument.body.appendChild(styleElement);
    }
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
                name: "侧边栏列表背景图片",
                key: "sidebarListPicture",
                type: "text"
            },
            {
                name: "选择菜单背景图片",
                key: "selectMenuBackground",
                type: "text"
            },
            {
                name: "选择菜单圆角半径",
                key: "selectMenuBorderRadius",
                type: "number"
            },
            {
                name: "消息图片圆角半径",
                key: "messageImgBorderRadius",
                type: "number"
            },
            {
                name: "消息头像圆角半径",
                key: "messageAvatarBorderRadius",
                type: "number"
            },
            {
                name: "系统消息圆角半径",
                key: "systemMessageBorderRadius",
                type: "number"
            },
            {
                name: "系统消息图片圆角半径",
                key: "systemMessageImgBorderRadius",
                type: "number"
            },
            {
                name: "会话消息圆角半径",
                key: "sessionMessageBorderRadius",
                type: "number"
            },
            {
                name: "会话选择项圆角半径",
                key: "sessionListItemBorderRadius",
                type: "number"
            },
            {
                name: "面板项圆角半径",
                key: "panelItemBorderRadius",
                type: "number"
            },
            {
                name: "提示框背景图片",
                key: "alertBackground",
                type: "text"
            },
        ]).map(o => NList.getElement([
            o.name + (storageContext.roaming.beautify[o.key] ? " (已设置)" : ""),
            new NEvent("click", async () =>
            {
                let promptText = (o.type == "number" ? "填写一个数字" : "");
                let oldValue = storageContext.roaming.beautify[o.key];

                let value = await showInputBox("美化设置", `设置 ${o.name}${promptText ? "\n" + promptText : ""}`, true, (oldValue ? oldValue : ""));
                if (value != undefined)
                {
                    if (value != "")
                    {
                        if (o.type == "number")
                        {
                            if (!Number.isFinite(Number(value)))
                            {
                                showNotice("美化设置", "设置的值不是一个数字");
                                return;
                            }
                        }
                        storageContext.roaming.beautify[o.key] = value;
                        storageRoamingSave();
                    }
                    else
                    {
                        delete storageContext.roaming.beautify[o.key];
                        storageRoamingSave();
                    }
                }
            }),
        ])))
    ]);
}