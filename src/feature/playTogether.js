import { showNotice } from "../ui/notice.js";
import { getNElement, NList, createNStyle as style, NTagName, NAsse, NEvent, NElement, createNStyleList as styles, eventName } from "../../lib/qwqframe.js";
import { showMenu } from "../ui/menu.js";
import { body } from "../ui/body.js";
import { NAttr } from "../../lib/qwqframe.js";
import { showInfoBox, showInputBox } from "../ui/infobox.js";
import { iframeContext } from "../injectIframe/iframeContext.js";
import { mouseBind } from "../../lib/qwqframe.js";
import { touchBind } from "../../lib/qwqframe.js";
import { RcoContext } from "../../lib/jsRco.js";
import { forgeApi } from "../forgeApi/forgeApi.js";
import { domPath } from "../../lib/plugToolsLib.js";
import { readForgePacket, writeForgePacket } from "../protocol/forgePacket.js";
import { buttonAsse } from "../ui/button.js";
import { protocolEvent } from "../protocol/protocolEvent.js";

let hostnameWhiteList = new Set([
    "qwq0.github.io",
    "localhost",
]);

/**
 * @type {NElement}
 */
let oldPage = null;

/**
 * @type {RcoContext}
 */
let rcoContext = null;
let partyId = "";
/**
 * @type {Set<string>}
 */
let partyMemberSet = new Set();
/**
 * @type {Map<string, number>}
 */
let partyMemberJoinTimeMap = new Map();
let partyHostUserId = "";

/**
 * 一起玩
 * @param {string} urlStr
 * @param {string} [inviteSenderId]
 * @param {string} [inviteId]
 */
export async function playTogether(urlStr, inviteSenderId = "", inviteId = "")
{
    if (oldPage != null)
    {
        let confirm = await showInfoBox("forge一起玩", "当前有正在运行的一起玩\n是否关闭并运行新的一起玩?", true);
        if (confirm)
        {
            oldPage.remove();
            oldPage = null;
        }
        else
            return;
    }

    if (!enabled)
    {
        showInfoBox("forge一起玩", "请先在附加功能中启用forge一起玩功能");
        return;
    }

    partyId = "";
    partyMemberSet.clear();
    partyMemberJoinTimeMap.clear();

    if (inviteId)
    {
        partyId = inviteId;
        partyHostUserId = inviteSenderId;
        partyMemberSet.add(inviteSenderId);
    }

    let url = new URL(urlStr);

    let loaded = false;
    let inited = false;

    if (hostnameWhiteList.has(url.hostname))
    {
        /**
         * @type {NElement<HTMLIFrameElement>}
         */
        let iframe = null;
        let page = NList.getElement([
            styles({
                position: "absolute",
                left: "0",
                top: "0",
                width: "100%",
                height: "100%",
                backgroundColor: "rgb(160, 160, 160)"
            }),

            [
                new NTagName("iframe"),

                new NAttr("src", urlStr),

                styles({
                    position: "absolute",
                    left: "0",
                    top: "0",
                    width: "100%",
                    height: "100%",
                    border: "none"
                }),

                ele => { iframe = ele; },

                eventName.load((e, ele) =>
                {
                    if (loaded)
                        return;
                    loaded = true;

                    /**
                     * @type {HTMLIFrameElement}
                     */
                    let iframe = ele.element;


                    let channel = new MessageChannel();
                    let port = channel.port1;

                    rcoContext = new RcoContext();
                    rcoContext.addGlobalNamedFunctions({
                        init: () =>
                        {
                            if (inited)
                                return;
                            inited = true;
                            if (inviteId)
                            {
                                rcoContext.callNamedFunction("joinInvite", inviteId, "iirose:" + inviteSenderId);
                                forgeApi.operation.sendPrivateForgePacket(inviteSenderId, {
                                    plug: "forge",
                                    label: "playTogether",
                                    type: "join",
                                    id: inviteId
                                });
                                showNotice("forge一起玩", "正在等待加入派对");
                            }
                            else
                                showNotice("forge一起玩", "初始化完成");
                        },
                        sendInvite: async (name, inviteGameId, url) =>
                        {
                            partyId = inviteGameId;
                            let confirm = await showInfoBox("forge一起玩", `要在当前房间中发送邀请吗?\n邀请好友一起玩 ${name}`);
                            if (confirm)
                            {
                                let forgepacket = writeForgePacket({
                                    label: "playTogether",
                                    type: "invite",
                                    url: url,
                                    id: inviteGameId,
                                    expirationTime: Date.now() + 30 * 60 * 1000
                                });
                                if (typeof (forgepacket) == "string")
                                    forgeApi.operation.sendRoomMediaCard(1, {
                                        title: `邀请您一起玩 ${name}`,
                                        singerName: `需使用 iiroseForge v1.22 以上版本加入 - playTogether`,
                                        resolutionRatio: forgepacket
                                    });
                                else
                                    showNotice("forge一起玩", "发送邀请失败");
                            }
                        },
                        sendSlowPacket: (targetId, data) =>
                        {
                            if (targetId.startsWith("iirose:"))
                                targetId = targetId.slice(7);
                            if (partyId && partyMemberSet.has(targetId))
                            {
                                forgeApi.operation.sendPrivateForgePacket(targetId, {
                                    plug: "forge",
                                    label: "playTogether",
                                    id: partyId,
                                    type: "slow",
                                    data: data
                                });
                            }
                        },
                        getVersionNumber: () =>
                        {
                            return 1;
                        }
                    });
                    port.addEventListener("message", e => { rcoContext.onData(e.data); });
                    rcoContext.bindOutStream(data => { port.postMessage(data); }, "raw");

                    port.start();
                    iframe.contentWindow.postMessage(
                        {
                            type: "setMessagePort",
                            label: "qwq-playTogether",
                            port: channel.port2
                        },
                        "*",
                        [channel.port2]
                    ); // 初始化通信管道
                })
            ],

            [
                styles({
                    position: "absolute",
                    right: "59px",
                    top: "30px",
                    width: "30px",
                    height: "30px",

                    color: "rgb(255, 255, 255)",
                    backgroundColor: "rgba(0, 0, 0, 0.8)",
                    border: "1px solid rgb(255, 255, 255)",
                    borderTopLeftRadius: "5px",
                    borderBottomLeftRadius: "5px",
                    boxSizing: "border-box",

                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center"
                }),

                "_",

                new NEvent("click", () =>
                {
                    page.setStyle("display", "none");
                    showFloatingButton();
                })
            ],
            [
                styles({
                    position: "absolute",
                    right: "30px",
                    top: "30px",
                    width: "30px",
                    height: "30px",

                    color: "rgb(255, 255, 255)",
                    backgroundColor: "rgba(0, 0, 0, 0.8)",
                    border: "1px solid rgb(255, 255, 255)",
                    borderTopRightRadius: "5px",
                    borderBottomRightRadius: "5px",
                    boxSizing: "border-box",

                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center"
                }),

                "x",

                new NEvent("click", () =>
                {
                    page.remove();
                    oldPage = null;
                    rcoContext = null;
                    partyMemberSet.forEach(targetId =>
                    {
                        forgeApi.operation.sendPrivateForgePacket(targetId, {
                            plug: "forge",
                            label: "playTogether",
                            id: partyId,
                            type: "leave"
                        });
                    });
                })
            ]
        ]);
        body.addChild(page);
        oldPage = page;
    }
    else
    {
        showNotice("Forge Play Together", "正在打开的的一起玩链接不在白名单中");
    }
}

let enabled = false;

/**
 * 启用一起玩
 */
export function enablePlayTogether()
{
    if (!enabled)
    {
        protocolEvent.forge.privateForgePacket.add((e) => // 注册协议
        {
            if (rcoContext && partyId)
            {
                if (e.content.label == "playTogether" && e.content.id == partyId)
                {
                    switch (e.content.type)
                    {
                        case "join": {
                            if (!partyMemberSet.has(e.senderId))
                            {
                                if ((!partyMemberJoinTimeMap.has(e.senderId)) || partyMemberJoinTimeMap.get(e.senderId) < Date.now() - 10 * 1000)
                                {
                                    partyMemberJoinTimeMap.set(e.senderId, Date.now());
                                    showNotice("forge一起玩", `${e.senderName} 想要加入派对\n点击接受`, undefined, () =>
                                    {
                                        partyMemberSet.add(e.senderId);
                                        rcoContext.callNamedFunction("onInviteAccept", "iirose:" + e.senderId, e.senderName);
                                        forgeApi.operation.sendPrivateForgePacket(e.senderId, {
                                            plug: "forge",
                                            label: "playTogether",
                                            type: "allowJoin",
                                            id: partyId
                                        });
                                    });
                                }
                            }
                            break;
                        }
                        case "allowJoin": {
                            if (e.senderId == partyHostUserId)
                            {
                                showNotice("forge一起玩", "已成功加入派对");
                                rcoContext.callNamedFunction("onJoinComplete", partyId, "iirose:" + partyHostUserId, e.senderName);
                            }
                            break;
                        }
                        case "leave": {
                            if (partyMemberSet.has(e.senderId))
                            {
                                partyMemberSet.delete(e.senderId);
                                showNotice("forge一起玩", `${e.senderName} 已离开派对`);
                                rcoContext.callNamedFunction("onMemberLeave", "iirose:" + e.senderId);
                            }
                            break;
                        }
                        case "slow": {
                            if (partyMemberSet.has(e.senderId))
                            {
                                rcoContext.callNamedFunction("onSlowPacket", "iirose:" + e.senderId, e.content.data);
                            }
                            break;
                        }
                    }
                }
            }
        });

        enabled = true;
    }

    // 聊天消息列表节点(房间消息)
    let msgBox = iframeContext.iframeDocument.getElementsByClassName("msgholderBox")[0];
    Array.from(msgBox.children).forEach(o =>
    { // 处理已有的消息
        processingMessageCardElement(/** @type {HTMLElement} */(o));
    });
    (new MutationObserver(mutationsList =>
    {
        for (let mutation of mutationsList)
        {
            if (mutation.type == "childList")
            {
                Array.from(mutation.addedNodes).forEach((/** @type {HTMLElement} */element) =>
                { // 处理新增的消息
                    if (element.classList != undefined && element.classList.contains("msg")) // 是消息
                    {
                        processingMessageCardElement(element);
                    }
                });
            }
        }
    })).observe(msgBox, { attributes: false, childList: true, subtree: true, characterData: true, characterDataOldValue: true });
}

/**
 * @type {WeakSet<HTMLElement>}
 */
let alreadyProcessedSet = new WeakSet();

/**
 * @param {HTMLElement} messageElement
 */
function processingMessageCardElement(messageElement)
{
    if (messageElement.classList.length == 1 && messageElement.classList.item(0) == "msg")
    {
        if (alreadyProcessedSet.has(messageElement))
            return;
        alreadyProcessedSet.add(messageElement);

        try
        {
            let pubChatUserSettingsElement = (/** @type {HTMLElement} */(domPath(messageElement, [0, 0, -1, 0])));

            let rawMessageData = pubChatUserSettingsElement?.dataset?.raw;

            if (rawMessageData && rawMessageData.startsWith("\'4=1>") && rawMessageData.endsWith(":end"))
            {
                let part = rawMessageData.split(">");
                let forgePacket = readForgePacket(part[5], "");
                if (forgePacket && typeof (forgePacket) == "object")
                {
                    if (forgePacket.label == "playTogether" && forgePacket.type == "invite")
                    {
                        let uid = (/** @type {HTMLElement} */(domPath(messageElement, [0, -1])))?.dataset?.uid ||
                            (/** @type {HTMLElement} */(domPath(messageElement, [0, -1, 0])))?.dataset?.uid ||
                            pubChatUserSettingsElement.dataset?.uid;

                        (/** @type {HTMLElement} */(domPath(messageElement, [0, 0, 0, -1, 0, 0, 1]))).innerText = "forge一起玩 邀请";
                        (/** @type {HTMLElement} */(domPath(messageElement, [0, 0, 0, -1, 0, 0, 2]))).innerText = "forge一起玩";


                        if (uid != forgeApi.operation.getUserUid())
                        {
                            let expired = (forgePacket.expirationTime && forgePacket.expirationTime < Date.now() - 15 * 1000);
                            (/** @type {HTMLElement} */(domPath(messageElement, [0, 0, 0, -1, 0]))).appendChild(NList.getElement([
                                styles({
                                    position: "absolute",
                                    right: "14px",
                                    bottom: "8px",
                                    padding: "8px",
                                    paddingLeft: "15px",
                                    paddingRight: "15px",
                                    backgroundColor: (!expired ? "rgb(42, 195, 69)" : "rgb(190, 190, 190)"),
                                    color: "rgb(255, 255, 255)",
                                    borderRadius: "5px",
                                    boxShadow: "2px 2px 2px rgb(0, 0, 0)"
                                }),

                                ...(!expired ? [
                                    buttonAsse,
                                    "加入",
                                    eventName.click(() =>
                                    {
                                        if (forgePacket.expirationTime && forgePacket.expirationTime < Date.now() - 15 * 1000)
                                            showNotice("forge一起玩", "无法加入已过期的邀请");
                                        else
                                            playTogether(String(forgePacket.url), uid, String(forgePacket.id));
                                    })
                                ] : [
                                    "已过期"
                                ])
                            ]).element);
                        }
                    }
                }
            }
        }
        catch (err)
        {
            console.error(err);
        }
    }
}

let recommendedList = [
    {
        name: "osu mania online - 在线下落式定轨音游",
        url: "https://qwq0.github.io/osuManiaOnline/?type=playTogether"
    },
    // {
    //     name: "[debug] osu mania online - 在线下落式定轨音游",
    //     url: "http://localhost:5510/test/test.html?type=playTogether"
    // },
];

/**
 * 一起玩菜单
 */
export async function showPlayTogetherMenu()
{
    if (!enabled)
    {
        showInfoBox("forge一起玩", "请先在附加功能中启用forge一起玩功能");
        return;
    }

    showMenu([
        ...(oldPage ? [
            NList.getElement([
                "[ 正在运行的一起玩 ]",
                new NEvent("click", async () =>
                {
                    oldPage.setStyle("display", "block");
                    hideFloatingButton();
                }),
            ])
        ] : []),
        ...recommendedList.map(o =>
        {
            return NList.getElement([
                o.name,
                new NEvent("click", async () =>
                {
                    playTogether(o.url);
                }),
            ]);
        }),
        NList.getElement([
            "[ 自定义地址 ]",
            new NEvent("click", async () =>
            {
                let urlStr = await showInputBox("forge一起玩", "请输入支持forge一起玩的网页地址", true);
                if (urlStr != undefined)
                {
                    try
                    {
                        let url = new URL(urlStr);
                        if (hostnameWhiteList.has(url.hostname))
                        {
                            playTogether(urlStr);
                        }
                        else
                        {
                            showNotice("forge一起玩", "当前仅支持白名单内的一起玩页面地址");
                        }
                    }
                    catch (err)
                    {
                        showNotice("forge一起玩", "解析地址时发生错误");
                        console.error(err);
                    }
                }
            }),
        ]),
    ]);
}

/**
 * @type {NElement}
 */
let buttonElement = null;
let buttonAddedSymbol = Symbol();

/**
 * 显示悬浮窗
 */
function showFloatingButton()
{
    if (buttonElement && iframeContext.iframeWindow[buttonAddedSymbol])
    {
        buttonElement.setDisplay("block");
        return;
    }

    let x = iframeContext.iframeDocument.body.clientWidth - 180, y = 30;
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
            minWidth: "50px",

            left: `${x}px`,
            top: `${y}px`
        }),

        [
            styles({
                height: "100%",
                paddingLeft: "1em",
                paddingRight: "1em",

                display: "flex",
                justifyContent: "center",
                alignItems: "center",
            }),

            "回到一起玩",

            new NEvent("mousedown", e => e.preventDefault()),
            new NEvent("mouseup", e => e.preventDefault()),
            new NEvent("click", () =>
            {
                if (!allowClick)
                    return;

                hideFloatingButton();
                if (oldPage)
                {
                    oldPage.setStyle("display", "block");
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
    iframeContext.iframeWindow[buttonAddedSymbol] = true;
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