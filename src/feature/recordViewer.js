import { NElement, eventName, getNElement } from "../../lib/qwqframe.js";
import { createPlugWindow } from "../plug/plugWindow.js";
import { createNStyleList as styles } from "../../lib/qwqframe.js";
import { NList } from "../../lib/qwqframe";
import { NTagName } from "../../lib/qwqframe.js";
import { NAttr } from "../../lib/qwqframe.js";
import { NEvent } from "../../lib/qwqframe.js";
import { cssG } from "../../lib/qwqframe.js";
import { addMenuHook } from "./uiHook.js";
import { getLocalRecordList, processSingleRecord } from "./syncChatRecord.js";
import { createHookObj } from "../../lib/qwqframe.js";
import { bindValue } from "../../lib/qwqframe.js";
import { showNotice } from "../ui/notice.js";
import { forgeApi } from "../forgeApi/forgeApi.js";
import { htmlSpecialCharsDecode } from "../util/htmlSpecialChars.js";
import { showInfoBox } from "../ui/infobox.js";

/**
 * @type {Array<{
 *  uid: string,
 *  name: string,
 *  sendBySelf: boolean,
 *  time: number,
 *  content: string,
 *  messageId: string
 * }>}
 */
let nowRecordList = null;
let nowSessionUid = "";
let nowPageIndex = 0;
let pageSize = 50;

/**
 * 获取当前记录的页数
 * @returns {number}
 */
function getPageCount()
{
    if (!nowRecordList)
        return 0;
    return Math.ceil(nowRecordList.length / pageSize);
}

/**
 * @param {string | [boolean, number, ...string[]]} record
 * @returns {{
 *  sendBySelf: boolean,
 *  time: number,
 *  content: string,
 *  messageId: string
 * }}
 */
function getSingleRecord(record)
{
    let singleRecord = processSingleRecord(record);
    return ({
        sendBySelf: singleRecord[0],
        time: singleRecord[1],
        content: singleRecord[2],
        messageId: singleRecord[3]
    });
}

/**
 * 获取当前页的记录
 * @returns {typeof nowRecordList}
 */
function getNowPageRecords()
{
    if (nowRecordList == null)
        return [];
    return nowRecordList.slice(nowPageIndex * pageSize, (nowPageIndex + 1) * pageSize);
}

/**
 * 启用聊天记录查看器
 */
export function enableRecordViewer()
{
    addMenuHook(
        "recordViewer",
        "sessionMenu",
        e => ({ icon: "history", text: "检索历史消息" }),
        async (e) =>
        {
            showUserRecordViewer(e.uid);
        }
    );
}

/**
 * 显示与指定用户私聊的记录查看器
 * @param {string} uid
 */
async function showUserRecordViewer(uid)
{
    let allRecord = getLocalRecordList();

    let nowSessionRecord = null;
    for (let sessionRecord of allRecord)
    {
        if (sessionRecord.uid == uid)
        {
            nowSessionRecord = sessionRecord;
            break;
        }
    }

    if (nowSessionRecord == null)
    {
        showNotice("记录查看器", "无法查看空记录");
        return;
    }

    let selfName = forgeApi.operation.getUserName();
    let targetName = nowSessionRecord.name;

    nowRecordList = nowSessionRecord.records.map(o =>
    {
        let now = getSingleRecord(o);
        return ({
            uid: nowSessionRecord.uid,
            name: (now.sendBySelf ? selfName : targetName),
            ...now
        });
    });
    nowSessionUid = nowSessionRecord.uid;
    nowPageIndex = 0;

    dataObj.title = `与 ${targetName}(${uid}) 的私聊记录`;
    await showRecordViewerWindow();
    refreshDisplay();
}

/**
 * 显示记录搜索结果的记录查看器
 * @param {string} keyword
 */
export async function showSearchRecordViewer(keyword)
{
    let allRecord = getLocalRecordList();

    /**
     * @type {typeof nowRecordList}
     */
    let targetRecord = [];

    let selfName = forgeApi.operation.getUserName();

    for (let sessionRecord of allRecord)
    {
        for (let record of sessionRecord.records)
        {
            let now = getSingleRecord(record);
            if (now.content.indexOf(keyword) != -1)
            {
                targetRecord.push({
                    uid: sessionRecord.uid,
                    name: (now.sendBySelf ? `${selfName} -> ${sessionRecord.name}` : sessionRecord.name),
                    ...now
                });
            }
        }
    }
    targetRecord.sort((a, b) => (a.time - b.time));

    nowRecordList = targetRecord;
    nowSessionUid = "";
    nowPageIndex = 0;

    dataObj.title = `在私聊记录中搜索 "${keyword}" 的所有结果`;
    await showRecordViewerWindow();
    refreshDisplay();
}

/**
 * @type {ReturnType<createPlugWindow>}
 */
let recordViewerWindow = null;
/**
 * @type {Window}
 */
let recordViewerContextWindow = null;
/**
 * @type {NElement}
 */
let recordsMessageContainer = null;

let dataObj = createHookObj({
    pageInfo: "",
    title: ""
});

/**
 * @type {NElement<HTMLInputElement>}
 */
let oldDateInput = null;

/**
 * 刷新显示的内容
 */
function refreshDisplay()
{
    recordsMessageContainer.removeChilds();

    let pageCount = getPageCount();

    if (nowRecordList)
    {
        let nowPageRecords = getNowPageRecords();

        recordsMessageContainer.addChild(NList.getElement([
            styles({
                display: "flex",
                justifyContent: "center",
                alignItems: "center"
            }),
            (nowPageIndex > 0 ? "本页已经到顶了" : "前面没有更多啦")
        ]));

        nowPageRecords.forEach(o =>
        {
            let senderName = o.name;

            let time = (new Date(o.time)).toLocaleString();
            let text = (
                o.content != "&" ?
                    `${htmlSpecialCharsDecode(o.content)}` :
                    `${senderName} 撤回了一条消息`
            );

            recordsMessageContainer.addChild(NList.getElement([
                styles({
                    margin: "2px",
                    border: `2px ${o.sendBySelf ? "rgba(97, 97, 97, 0.9)" : "rgba(245, 245, 250, 0.9)"} solid`,
                    backgroundColor: (o.sendBySelf ? "rgba(97, 97, 97, 0.2)" : "rgba(245, 245, 250, 0.2)"),
                    padding: "3px"
                }),

                [
                    styles({
                        fontSize: "0.6em",
                        color: "rgb(190, 190, 190)"
                    }),
                    `${time} ${senderName}`
                ],

                text,

                (
                    o.uid != nowSessionUid ?
                        eventName.click(async () =>
                        {
                            if (o.uid != nowSessionUid)
                            {
                                if (await showInfoBox("记录查看器", "要在目标会话中查看此记录吗?", true))
                                {
                                    await showUserRecordViewer(o.uid);
                                    jumpByTime(o.time);
                                }
                            }
                        }) :
                        null
                )
            ]));
        });

        recordsMessageContainer.addChild(NList.getElement([
            styles({
                display: "flex",
                justifyContent: "center",
                alignItems: "center"
            }),
            (nowPageIndex < pageCount - 1 ? "本页已经到底啦" : "后面没有更多啦")
        ]));

        (/** @type {HTMLDivElement} */(recordsMessageContainer.element)).scrollTop = 0;
    }

    if (pageCount > 0)
        dataObj.pageInfo = `${nowPageIndex + 1} / ${pageCount} 页`;
    else
        dataObj.pageInfo = `无记录`;
}

/**
 * 根据时间跳转
 * @param {number} time
 */
function jumpByTime(time)
{
    if (time < nowRecordList[0].time)
    {
        showNotice("记录查看器", "选定时间比第一条消息更早");
        nowPageIndex = 0;
    }
    else if (time > nowRecordList.at(-1).time)
    {
        showNotice("记录查看器", "选定时间比最后一条消息更晚");
        nowPageIndex = getPageCount() - 1;
    }
    else
    {
        let pageCount = getPageCount();
        nowPageIndex = 0;
        for (let i = 0; i < pageCount; i++)
        {
            let lastRecordThisPage = nowRecordList[Math.min((i + 1) * pageSize - 1, nowRecordList.length - 1)];
            if (
                lastRecordThisPage.time >= time
            )
            {
                nowPageIndex = i;
                break;
            }
        }
        showNotice("记录查看器", "已跳转到选择的时间附近");
    }
    refreshDisplay();
}

/**
 * 创建聊天记录查看器窗口
 */
async function showRecordViewerWindow()
{
    if (!recordViewerWindow)
    {
        recordViewerWindow = createPlugWindow(true);
        recordViewerWindow.iframe.element.src = "about:blank";
        await (new Promise(resolve =>
        {
            recordViewerWindow.iframe.addEventListener("load", () => { resolve(); });
        }));
        recordViewerContextWindow = recordViewerWindow.iframe.element.contentWindow;
        let body = getNElement(recordViewerContextWindow.document.body);
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

            [
                styles({
                    position: "absolute",
                    top: "0",
                    left: "0",
                    width: "100%",
                    height: "25px",
                    whiteSpace: "pre",
                    color: "white",
                    boxShadow: "border-box",
                    borderBottom: "1px solid rgba(0, 0, 0, 0.3)",
                    overflow: "hidden"
                }),
                bindValue(dataObj, "title")
            ],

            recordsMessageContainer = NList.getElement([
                styles({
                    position: "absolute",
                    left: "0",
                    top: "25px",
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

            [
                styles({
                    position: "absolute",
                    left: "0",
                    bottom: "0",
                    width: "100%",
                    height: "27px",
                    lineHeight: "27px",
                    backgroundColor: cssG.rgb(150, 150, 150, 0.3),
                    color: cssG.rgb(255, 255, 255),

                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "space-around",

                    cursor: "default"
                }),

                [
                    styles({
                        paddingLeft: "2px",
                        paddingRight: "2px",
                        width: "fit-content"
                    }),
                    "上一页",

                    new NEvent("click", () =>
                    {
                        if (nowPageIndex > 0)
                        {
                            nowPageIndex--;
                            refreshDisplay();
                        }
                        else
                            showNotice("记录查看器", "已到达第一页");
                    })
                ],
                [
                    styles({
                        paddingLeft: "2px",
                        paddingRight: "2px",
                        width: "fit-content"
                    }),
                    "下一页",

                    new NEvent("click", () =>
                    {
                        if (nowPageIndex < getPageCount() - 1)
                        {
                            nowPageIndex++;
                            refreshDisplay();
                        }
                        else
                            showNotice("记录查看器", "已到达最后一页");
                    })
                ],
                [
                    styles({
                        paddingLeft: "2px",
                        paddingRight: "2px",
                        width: "fit-content"
                    }),
                    "转到时间",

                    new NEvent("click", () =>
                    {
                        if (oldDateInput)
                        {
                            oldDateInput.remove();
                            oldDateInput = null;
                        }
                        if (nowRecordList == null || nowRecordList.length == 0)
                            return;
                        /**
                         * @type {NElement<HTMLInputElement>}
                         */
                        let dateInput = NList.getElement([
                            new NTagName("input"),
                            new NAttr("type", "date"),
                            styles({
                                display: "none"
                            })
                        ]);
                        body.addChild(dateInput);
                        oldDateInput = dateInput;
                        dateInput.element.showPicker();
                        dateInput.addEventListener("change", () =>
                        {
                            if (dateInput.element.value)
                            {
                                let date = new Date(dateInput.element.value);
                                date.setHours(0);
                                jumpByTime(date.getTime());
                            }
                        });
                    })
                ],
                [
                    styles({
                        flex: "auto",

                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center"
                    }),
                    bindValue(dataObj, "pageInfo")
                ]
            ]
        ]));
    }
    recordViewerWindow.windowElement.setDisplay("block");
    recordViewerWindow.windowElement.setStyle("pointerEvents", "auto");
}