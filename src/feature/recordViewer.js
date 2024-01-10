import { NElement, getNElement } from "../../lib/qwqframe.js";
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

/**
 * @type {(ReturnType<getLocalRecordList>)[number]}
 */
let nowRecordInfo = null;
let nowPageIndex = 0;
let pageSize = 50;

/**
 * 获取当前记录的页数
 * @returns {number}
 */
function getPageCount()
{
    return Math.ceil(nowRecordInfo.records.length / pageSize);
}

/**
 * @param {(typeof nowRecordInfo)["records"][number]} record
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
 * @returns {Array<ReturnType<getSingleRecord>>}
 */
function getNowPageRecords()
{
    if (nowRecordInfo == null)
        return [];
    return nowRecordInfo.records.slice(nowPageIndex * pageSize, (nowPageIndex + 1) * pageSize).map(getSingleRecord);
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
            let allRecord = getLocalRecordList();

            let nowSessionRecord = null;
            for (let sessionRecord of allRecord)
            {
                if (sessionRecord.uid == e.uid)
                {
                    nowSessionRecord = sessionRecord;
                    break;
                }
            }
            nowRecordInfo = nowSessionRecord;

            nowPageIndex = 0;

            await showRecordViewerWindow();
            refreshDisplay();
        }
    );
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
    pageInfo: ""
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

    if (nowRecordInfo)
    {
        let nowPageRecords = getNowPageRecords();

        let selfName = forgeApi.operation.getUserName();
        let targetName = nowRecordInfo.name;

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
            let senderName = (o.sendBySelf ? selfName : targetName);

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

            recordsMessageContainer = NList.getElement([
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
                        if (nowRecordInfo == null || nowRecordInfo.records.length == 0)
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
                                let time = date.getTime();

                                if (time < getSingleRecord(nowRecordInfo.records[0]).time)
                                {
                                    showNotice("记录查看器", "选定时间比第一条消息更早");
                                    nowPageIndex = 0;
                                }
                                else if (time > getSingleRecord(nowRecordInfo.records.at(-1)).time)
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
                                        let lastRecordThisPage = getSingleRecord(nowRecordInfo.records[Math.min((i + 1) * pageSize - 1, nowRecordInfo.records.length - 1)]);
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