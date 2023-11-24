import { getNElement } from "../../lib/qwqframe.js";
import { NList } from "../../lib/qwqframe.js";
import { NElement } from "../../lib/qwqframe.js";
import { createPlugWindow } from "../plug/plugWindow.js";
import { createNStyleList as styles } from "../../lib/qwqframe.js";
import { NTagName } from "../../lib/qwqframe.js";
import { NAttr } from "../../lib/qwqframe.js";
import { cssG } from "../../lib/qwqframe.js";
import { NEvent } from "../../lib/qwqframe.js";
import { forgeApi } from "../forgeApi/forgeApi.js";

/**
 * 房间消息历史
 * @type {Array<{
 *  sender: string,
 *  content: string
 * }>}
 */
let roomMessageHistory = [{
    sender: "系统",
    content: `forge已加载 ${(new Date()).toLocaleString()}`
}];
/**
 * 房间消息历史更新回调
 * @type {(x: Array<{
 *  sender: string,
 *  content: string
 * }>) => void}
 */
let newRoomMessageHistoryCB = null;

/**
 * 设置监视的操作者
 * @param {(x: Array<{
 *  sender: string,
 *  content: string
 * }>) => void} callback
 */
export function setMonitorOperator(callback)
{
    if (callback)
    {
        callback(roomMessageHistory.slice(-100));
        newRoomMessageHistoryCB = callback;
    }
    else
        newRoomMessageHistoryCB = null;
}


let enabledMonitor = false;

/**
 * 启用监视
 * 允许跨账号查看房间消息
 */
export function enableMonitor()
{
    if (enabledMonitor)
        return;
    enabledMonitor = true;

    let lastRoomId = "";
    let lastRoomName = "";

    /**
     * @param {{ senderName: string, content: string }} e
     */
    function onNewRoomMessage(e)
    {
        let newHistory = [];
        let nowRoomId = forgeApi.operation.getUserRoomId();
        if (nowRoomId != lastRoomId)
        {
            let nowRoomName = forgeApi.operation.getRoomInfoById(nowRoomId)?.name;
            newHistory.push({
                sender: "系统",
                content: `房间切换 ${lastRoomName}->${nowRoomName ? nowRoomName : nowRoomId}`
            });
            lastRoomId = nowRoomId;
            lastRoomName = nowRoomName;
        }

        newHistory.push({
            sender: e.senderName,
            content: e.content
        });

        if (newHistory.length > 0)
        {
            roomMessageHistory.push(...newHistory);
            while (roomMessageHistory.length >= 500)
                roomMessageHistory.shift();
            if (newRoomMessageHistoryCB)
                newRoomMessageHistoryCB(newHistory);
        }
    }

    forgeApi.event.roomMessage.add(o =>
    {
        onNewRoomMessage(o);
    });
}

/**
 * @type {ReturnType<createPlugWindow>}
 */
let monitorWindow = null;
/**
 * @type {Window}
 */
let monitorContextWindow = null;
/**
 * @type {NElement}
 */
let monitorMessageContainer = null;
/**
 * @type {NElement<HTMLInputElement>}
 */
let monitorInput = null;
/**
 * @type { (x: string) => void }
 */
let monitorSendMessageCB = null;

/**
 * 创建监视器窗口
 */
export async function showMonitorWindow()
{
    if (!monitorWindow)
    {
        monitorWindow = createPlugWindow(true);
        monitorWindow.iframe.element.src = "about:blank";
        await (new Promise(resolve =>
        {
            monitorWindow.iframe.addEventListener("load", () => { resolve(); });
        }));
        monitorContextWindow = monitorWindow.iframe.element.contentWindow;
        let body = getNElement(monitorContextWindow.document.body);
        body.setStyles({
            margin: "0",
            position: "absolute",
            left: "0",
            top: "0",
            width: "100%",
            height: "100%",
        });

        body.addChild(NList.getElement([
            styles({
                position: "absolute",
                left: "0",
                top: "0",
                width: "100%",
                height: "100%",
            }),

            monitorMessageContainer = NList.getElement([
                styles({
                    position: "absolute",
                    left: "0",
                    top: "0",
                    width: "100%",
                    bottom: "27px",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                    color: "white",
                    overflow: "auto",
                    scrollbarWidth: "thin",
                    scrollbarColor: "rgb(120, 120, 120) rgb(160, 160, 160)"
                })
            ]),

            monitorInput = NList.getElement([
                new NTagName("input"),
                new NAttr("type", "text"),
                new NAttr("placeholder", "远程发送"),
                new NAttr("size", "1000"),

                styles({
                    position: "absolute",
                    left: "0",
                    bottom: "0",
                    width: "100%",
                    height: "27px",
                    lineHeight: "27px",
                    backgroundColor: cssG.rgb(150, 150, 150, 0.3),
                    color: cssG.rgb(255, 255, 255)
                }),

                new NEvent("keydown", (e, ele) =>
                {
                    if (e.key == "Enter")
                    {
                        e.stopPropagation();
                        e.preventDefault();
                        if (monitorSendMessageCB)
                        {
                            let value = ele.element.value;
                            ele.element.value = "";
                            monitorSendMessageCB(value);
                        }
                    }
                })
            ])
        ]));
    }
    monitorWindow.windowElement.setDisplay("block");
    monitorWindow.windowElement.setStyle("pointerEvents", "auto");
}

/**
 * 监视器窗口清空消息
 */
export function monitorClearMessage()
{
    if (!monitorMessageContainer)
        return;
    monitorMessageContainer.removeChilds();
}

/**
 * 监视器窗口添加消息
 * @param {Array<{
 *  sender: string,
 *  content: string
 * }>} messages
 */
export function monitorAddMessage(messages)
{
    if (!monitorMessageContainer)
        return;
    monitorMessageContainer.addChilds(messages.map(o => NList.getElement([
        styles({
            margin: "2px",
            border: "1.5px rgba(255, 255, 255, 0.5) solid",
            padding: "3px"
        }),
        `${o.sender}: ${o.content}`,
    ])));
}

/**
 * 设置监视器窗口中的文本框占位提示文本
 * @param {string} text
 */
export function monitorSetPlaceholderText(text)
{
    if (!monitorInput)
        return;
    monitorInput.element.placeholder = text;
}

/**
 * 监视器窗口绑定发送消息回调
 * @param { (x: string) => void } sendCB
 */
export function monitorBindSendCB(sendCB)
{
    monitorSendMessageCB = sendCB;
}