import { NList } from "../../lib/qwqframe.js";
import { NEvent } from "../../lib/qwqframe.js";
import { forgeApi } from "../forgeApi/forgeApi.js";
import { iframeContext } from "../injectIframe/iframeContext.js";
import { protocolEvent } from "../protocol/protocolEvent.js";
import { storageContext, storageRoamingSave, storageRoamingSet } from "../storage/storage.js";
import { showInfoBox, showInputBox } from "../ui/infobox.js";
import { showMenu } from "../ui/menu.js";
import { showNotice } from "../ui/notice.js";
import { uniqueIdentifierString } from "../util/uniqueIdentifier.js";
import { monitorAddMessage, monitorBindSendCB, monitorClearMessage, monitorSetPlaceholderText, setMonitorOperator, showMonitorWindow } from "./monitor.js";
import { createNStyleList as styles } from "../../lib/qwqframe.js";



let waitForId = "";
let monitorId = "";
let monitorUserId = "";

export async function showMultiAccountMenu()
{
    /**
     * @param {string} targetUid
     * @param {string | undefined} targetUserName
     */
    function showAccountMenu(targetUid, targetUserName)
    {
        showMenu([
            NList.getElement([
                "拉取此账号的配置",
                new NEvent("click", () =>
                {
                    showNotice("多账户", "正在尝试获取配置");
                    let requestId = uniqueIdentifierString();
                    forgeApi.operation.sendPrivateForgePacket(targetUid, {
                        plug: "forge",
                        type: "multiAccount",
                        option: "syncConfigRQ",
                        id: requestId
                    });
                    waitForId = requestId;
                })
            ]),
            NList.getElement([
                "戴上他的眼睛",
                new NEvent("click", () =>
                {
                    if (monitorId)
                    {
                        forgeApi.operation.sendPrivateForgePacket(monitorUserId, {
                            plug: "forge",
                            type: "multiAccount",
                            option: "monitorQuit",
                            id: monitorId
                        });
                        monitorId = "";
                        monitorUserId = "";
                    }

                    showNotice("多账户", `正在连接 ${targetUid}`);
                    monitorId = uniqueIdentifierString();
                    monitorUserId = targetUid;
                    forgeApi.operation.sendPrivateForgePacket(targetUid, {
                        plug: "forge",
                        type: "multiAccount",
                        option: "monitorRQ",
                        id: monitorId
                    });

                    showMonitorWindow();
                    monitorClearMessage();
                    monitorBindSendCB(o =>
                    {
                        if (o)
                            forgeApi.operation.sendPrivateForgePacket(monitorUserId, {
                                plug: "forge",
                                type: "multiAccount",
                                option: "monitorSend",
                                id: monitorId,
                                content: o
                            });
                    });
                    monitorSetPlaceholderText("正在连接中");
                })
            ]),
            NList.getElement([
                "前往我所在的房间",
                new NEvent("click", () =>
                {
                    showNotice("多账户", "正在发送命令");
                    forgeApi.operation.sendPrivateForgePacket(targetUid, {
                        plug: "forge",
                        type: "multiAccount",
                        option: "switchRoom",
                        roomId: forgeApi.operation.getUserRoomId()
                    });
                })
            ]),
            NList.getElement([
                "下线",
                new NEvent("click", async () =>
                {
                    if (await showInfoBox("远程下线", "确认发送下线指令吗?\n您必须手动重新上线此账号", true))
                    {
                        showNotice("多账户", "正在发送命令");
                        forgeApi.operation.sendPrivateForgePacket(targetUid, {
                            plug: "forge",
                            type: "multiAccount",
                            option: "quit"
                        });
                    }
                })
            ]),
            NList.getElement([
                "移除账号",
                new NEvent("click", () =>
                {
                    storageContext.processed.myAccountSet.delete(targetUid);
                    storageContext.roaming.myAccountList = storageContext.roaming.myAccountList.filter(o => o != targetUid);
                    storageRoamingSave();
                    showNotice("绑定账号", `目标账号(${targetUid})与当前账号(${forgeApi.operation.getUserUid()})的单向绑定已解除`);
                })
            ])
        ]);
    }

    showMenu([
        NList.getElement([
            "[ 添加账号 ]",
            new NEvent("click", async () =>
            {
                let uid = await showInputBox("添加账号", "请输入您其他账号的唯一标识\n必须双向绑定才能进行管理", true);
                if (uid != undefined)
                {
                    let myUid = forgeApi.operation.getUserUid();
                    if (uid != myUid)
                    {
                        storageContext.processed.myAccountSet.add(uid);
                        storageContext.roaming.myAccountList.push(uid);
                        storageRoamingSave();
                        showNotice("绑定账号", `你需要同时在目标账号(${uid})上绑定当前账号(${myUid})来完成反向绑定`);
                    }
                    else
                        showNotice("无法绑定", `不能绑定此账号本身`);
                }
            }),
        ]),
        ...(
            monitorId ?
                [
                    NList.getElement([
                        "正在戴着的眼睛",
                        new NEvent("click", () =>
                        {
                            showMonitorWindow();
                        })
                    ]),
                    NList.getElement([
                        "停止戴着眼睛",
                        new NEvent("click", () =>
                        {
                            monitorBindSendCB(null);
                            monitorAddMessage([{
                                sender: "系统",
                                content: "您已断开远程连接"
                            }]);
                            forgeApi.operation.sendPrivateForgePacket(monitorUserId, {
                                plug: "forge",
                                type: "multiAccount",
                                option: "monitorQuit",
                                id: monitorId
                            });
                            monitorId = "";
                            monitorUserId = "";
                            monitorSetPlaceholderText("已断开");
                        })
                    ])
                ] :
                []
        ),
        ...(storageContext.roaming.myAccountList.map(uid =>
        {
            let userInfo = forgeApi.operation.getOnlineUserInfoById(uid);
            return NList.getElement([
                `${uid}${userInfo ? ` (${userInfo.name})` : ""}`,
                new NEvent("click", async () =>
                {
                    showAccountMenu(uid, userInfo?.name);
                }),
            ]);
        }))
    ]);
}


let monitorOperatorStartTime = 0;
let monitorOperatorId = "";
let monitorOperatorUserId = "";
let registedEvent = false;
/**
 * 启用多账号
 */
export function enableMultiAccount()
{
    if (registedEvent)
        return;
    registedEvent = true;

    protocolEvent.forge.privateForgePacket.add(e =>
    {
        if (e.content.type == "multiAccount")
        {
            if (!storageContext.processed.myAccountSet.has(e.senderId))
                return;

            let userInfo = forgeApi.operation.getOnlineUserInfoById(e.senderId);
            let isCallback = false;

            try
            {
                switch (e.content.option) // 远程指令类别
                {
                    case "switchRoom": { // 切换房间
                        forgeApi.operation.changeRoom(e.content.roomId);
                        break;
                    }
                    case "quit": { // 下线 (退出)
                        setTimeout(() =>
                        {
                            let reload = iframeContext.iframeWindow?.location?.reload?.bind(iframeContext.iframeWindow.location);
                            iframeContext.iframeBody?.addChild(NList.getElement([
                                styles({
                                    position: "absolute",
                                    left: "0",
                                    top: "0",
                                    width: "100%",
                                    height: "100%",
                                    zIndex: "9999999",
                                    backgroundColor: "rgb(28, 28, 28)",
                                    cursor: "default",
                                    whiteSpace: "pre-wrap",
                                    textAlign: "center",
                                    color: "rgb(255, 255, 255)"
                                }),

                                [
                                    styles({
                                        position: "absolute",
                                        inset: "0 0 0 0",
                                        height: "fit-content",
                                        width: "fit-content",
                                        margin: "auto",
                                        backgroundColor: "rgb(21, 21, 21)",
                                        padding: "10px",
                                        borderRadius: "3px"
                                    }),

                                    `已通过远程指令下线\n下线时间: ${(new Date()).toLocaleString()}\n点击恢复`,
                                    new NEvent("click", () =>
                                    {
                                        reload();
                                    })
                                ]
                            ]));
                            iframeContext.iframeWindow["Utils"]?.service?.saveStatus?.(0);
                            if (iframeContext.socket)
                            {
                                try
                                {
                                    iframeContext.socket.onclose = null;
                                    iframeContext.socket.onerror = null;
                                    iframeContext.socket.send = () => { };
                                    iframeContext.socket.onmessage = () => { };
                                    iframeContext.socket?.close();
                                }
                                catch (err)
                                {
                                    console.error(err);
                                }
                            }
                            iframeContext.iframeWindow.addEventListener("keydown", e => e.stopImmediatePropagation(), true);
                            iframeContext.iframeWindow.addEventListener("keyup", e => e.stopImmediatePropagation(), true);
                            iframeContext.iframeWindow.addEventListener("keypress", e => e.stopImmediatePropagation(), true);
                            iframeContext.iframeWindow.addEventListener("mousemove", e => e.stopImmediatePropagation(), true);
                            iframeContext.iframeWindow.addEventListener("mousedown", e => e.stopImmediatePropagation(), true);
                            iframeContext.iframeWindow.addEventListener("mouseup", e => e.stopImmediatePropagation(), true);
                            if (iframeContext.iframeWindow.location)
                                iframeContext.iframeWindow.location["_reload"] = () => { };
                        }, 1000);
                        break;
                    }
                    case "syncConfigRQ": { // 请求拉取远程配置
                        let requestId = e.content.id;
                        forgeApi.operation.sendPrivateForgePacket(e.senderId, {
                            plug: "forge",
                            type: "multiAccount",
                            option: "syncConfigCB",
                            id: requestId,
                            storageObject: storageContext.roaming
                        });
                        break;
                    }
                    case "syncConfigCB": { // 收到请求的配置
                        if (waitForId && e.content.id == waitForId)
                        {
                            waitForId = "";
                            /**
                             * @type {typeof storageContext.roaming}
                             */
                            let storageObj = e.content.storageObject;
                            if (storageObj)
                            {
                                if (storageObj?.userRemark)
                                { // 覆盖备注配置
                                    Object.keys(storageContext.roaming.userRemark).forEach(userId =>
                                    {
                                        if (!storageObj.userRemark[userId])
                                            storageObj.userRemark[userId] = storageContext.roaming.userRemark[userId];
                                    });
                                }
                                delete storageObj.myAccountList;
                                storageRoamingSet(storageObj);
                                storageRoamingSave();
                                showNotice("多账号", "拉取其他账号的配置成功");
                            }
                        }
                        isCallback = true;
                        break;
                    }
                    case "monitorRQ": { // 监视开始请求
                        let requestId = e.content.id;

                        if (monitorOperatorId)
                        {
                            forgeApi.operation.sendPrivateForgePacket(monitorUserId, {
                                plug: "forge",
                                type: "multiAccount",
                                option: "monitorQuit",
                                id: monitorOperatorId
                            });
                        }

                        monitorOperatorId = requestId;
                        monitorOperatorUserId = e.senderId;
                        monitorOperatorStartTime = Date.now();

                        setMonitorOperator(o =>
                        {
                            if (Date.now() > monitorOperatorStartTime + 12 * 60 * 60 * 1000)
                            {
                                setMonitorOperator(null);
                                monitorOperatorId = "";
                                monitorOperatorUserId = "";
                                return;
                            }
                            forgeApi.operation.sendPrivateForgePacket(e.senderId, {
                                plug: "forge",
                                type: "multiAccount",
                                option: "monitorCB",
                                id: requestId,
                                messages: o
                            });
                        });
                        break;
                    }
                    case "monitorSend": { // 监视发送信息
                        let requestId = e.content.id;
                        if (requestId == monitorOperatorId)
                        {
                            forgeApi.operation.sendRoomMessage(e.content.content);
                        }
                        break;
                    }
                    case "monitorQuit": { // 断开监视
                        let requestId = e.content.id;
                        if (requestId == monitorOperatorId)
                        {
                            setMonitorOperator(null);
                            monitorOperatorId = "";
                            monitorOperatorUserId = "";
                            showNotice("多账号", "多账号监视已断开");
                        }
                        else if (requestId == monitorId)
                        {
                            monitorBindSendCB(null);
                            monitorAddMessage([{
                                sender: "系统",
                                content: "连接被远端断开"
                            }]);
                            monitorId = "";
                            monitorUserId = "";
                            monitorSetPlaceholderText("已断开");
                        }
                        isCallback = true;
                        break;
                    }
                    case "monitorCB": { // 监视回调 (收到消息时)
                        let requestId = e.content.id;
                        if (requestId == monitorId)
                        {
                            monitorAddMessage(e.content.messages);
                            monitorSetPlaceholderText(`使用 ${e.senderName} 发送消息`);
                        }
                        isCallback = true;
                        break;
                    }
                }
            }
            catch (err)
            {
                console.error(err);
            }

            if (!isCallback)
                showNotice("多账号", `您的账号(${e.senderId}${userInfo ? ` - ${userInfo.name}` : ""})\n正在操作`);
        }
    });
}