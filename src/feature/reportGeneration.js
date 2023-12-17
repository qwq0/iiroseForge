import { forgeApi } from "../forgeApi/forgeApi.js";
import { iframeContext } from "../injectIframe/iframeContext.js";
import { getLocalRecordList, processSingleRecord } from "./syncChatRecord.js";
import { getNElement, NList, createNStyle as style, NTagName, NAsse, NEvent, NElement, createNStyleList as styles } from "../../lib/qwqframe.js";
import { className } from "../ui/className.js";
import { createHookObj } from "../../lib/qwqframe.js";
import { bindValue } from "../../lib/qwqframe.js";
import { delayPromise } from "../../lib/qwqframe.js";
import { touchBind } from "../../lib/qwqframe.js";
import { htmlSpecialCharsDecode } from "../util/htmlSpecialChars.js";
import { NAttr } from "../../lib/qwqframe.js";

/**
 * 用户年报生成
 */
export async function reportGeneration()
{
    let record = getLocalRecordList();

    let userUid = forgeApi.operation.getUserUid();
    let statisticsStartTime = (new Date("2023/1/1")).getTime();
    let statisticsEndTime = (new Date("2024/1/1")).getTime();
    const oneDay = 24 * 60 * 60 * 1000;
    let dayOfThisYear = Math.round((statisticsEndTime - statisticsStartTime) / oneDay);

    let sendCount = 0;
    let receiveCount = 0;
    let sendCharCount = 0;
    let receiveCharCount = 0;
    /**
     * @type {Map<string, {
     *  targetName: string,
     *  sendCount: number,
     *  receiveCount: number,
     *  nightMessageCount: number,
     *  secondHalfOfTheYear: number,
     *  continuousChatMaxDuration: number,
     *  continuousChatMaxStartTime: number,
     *  nightContinuousChatMaxDuration: number,
     *  nightContinuousChatMaxStartTime: number,
     * }>}
     */
    let sessionStatisticsMap = new Map();

    /**
     * 以每天的每半个小时分段
     * @type {Array<{
     *  count: 0,
     *  isPeakTime: boolean
     * }>}
     */
    let timePeriod = new Array(48).fill(0).map(() => ({ count: 0, isPeakTime: false }));
    /**
     * 以每半个月分段
     * @type {Array<{
     *  count: 0,
     * }>}
     */
    let datePeriod = new Array(24).fill(0).map(() => ({ count: 0 }));
    /**
     * 以每天分段
     * @type {Array<{
     *  count: 0,
     * }>}
     */
    let eachDay = new Array(400).fill(0).map(() => ({ count: 0 }));

    let sessionCount = 0;

    /**
     * @type {Map<string, number>}
     */
    let sendContentCountMap = new Map();
    /**
     * @type {Map<string, number>}
     */
    let sendImageCountMap = new Map();

    /**
     * @type {Array<{
     *  targetUid: string,
     *  sendBySelf: boolean,
     *  time: number,
     *  content: string
     * }>}
     */
    let allMessageMatch = [];

    record.forEach(session =>
    {
        if (session.uid == userUid)
            return;

        let sessionObj = sessionStatisticsMap.get(session.uid);
        if (!sessionObj)
        {
            sessionObj = {
                targetName: session.name,
                // 发出的消息
                sendCount: 0,
                // 收到的消息
                receiveCount: 0,
                // 夜间的消息数
                nightMessageCount: 0,
                // 后半年的消息数
                secondHalfOfTheYear: 0,
                // 最大持续聊天持续时间
                continuousChatMaxDuration: 0,
                // 最大持续聊天开始的时间
                continuousChatMaxStartTime: 0,
                // 夜间最大持续聊天持续时间
                nightContinuousChatMaxDuration: 0,
                // 夜间最大持续聊天开始的时间
                nightContinuousChatMaxStartTime: 0,
            };
            sessionStatisticsMap.set(session.uid, sessionObj);
        }

        let hasRecordSendByMe = false;

        let continuousChatStartTime = 0;
        let lastReceivedTime = 0;
        let lastSendByMeTime = 0;

        session.records.forEach(rawRecord =>
        {
            let record = processSingleRecord(rawRecord);

            let sendBySelf = record[0];
            let time = record[1];
            let content = record[2];

            if (!(statisticsStartTime < time && time < statisticsEndTime))
                return;

            allMessageMatch.push({
                sendBySelf,
                content,
                time,
                targetUid: session.uid
            });

            // 打断连续聊天
            if (time - lastReceivedTime > 20 * 60 * 1000 || time - lastSendByMeTime > 20 * 60 * 1000)
            {
                let continuousChatDuration = Math.max(0, Math.min(lastReceivedTime, lastSendByMeTime) - continuousChatStartTime);

                if (continuousChatDuration > sessionObj.continuousChatMaxDuration)
                {
                    sessionObj.continuousChatMaxDuration = continuousChatDuration;
                    sessionObj.continuousChatMaxStartTime = continuousChatStartTime;
                }

                if (
                    continuousChatDuration > 50 * 60 * 1000 &&
                    continuousChatDuration > sessionObj.nightContinuousChatMaxDuration &&
                    (new Date(continuousChatStartTime)).getHours() <= 1
                )
                {
                    sessionObj.nightContinuousChatMaxDuration = continuousChatDuration;
                    sessionObj.nightContinuousChatMaxStartTime = continuousChatStartTime;
                }

                continuousChatStartTime = time;
            }

            if (sendBySelf)
            {
                lastSendByMeTime = time;
                sendCount++;
                sessionObj.sendCount++;
                sendCharCount += Math.min(100, content.length);

                hasRecordSendByMe = true;
                if (content != "&")
                {
                    if (content.length < 100)
                    {
                        let oldValue = sendContentCountMap.get(content);
                        if (oldValue == undefined)
                            oldValue = 0;
                        sendContentCountMap.set(content, oldValue + 1);
                    }
                    if (content.length < 500)
                    {
                        let imageUrl = content.match(/https?:\/\/[a-zA-Z0-9\.\_\-]+\/[a-zA-Z0-9\.\_\-\/\?\=\#\&]+?(\.(png|jpg|gif|jpeg|avif|webp))/)?.[0];
                        if (imageUrl)
                        {
                            let oldValue = sendImageCountMap.get(imageUrl);
                            if (oldValue == undefined)
                                oldValue = 0;
                            sendImageCountMap.set(imageUrl, oldValue + 1);
                        }
                    }
                }
            }
            else
            {
                lastReceivedTime = time;
                receiveCount++;
                sessionObj.receiveCount++;
                receiveCharCount += Math.min(100, content.length);
            }


            let dateObj = new Date(time);

            let timePeriodIndex = dateObj.getHours() * 2 + (dateObj.getMinutes() >= 30 ? 1 : 0);
            if (0 <= timePeriodIndex && timePeriodIndex < timePeriod.length)
            {
                timePeriod[timePeriodIndex].count++;
                if (0 <= timePeriodIndex && timePeriodIndex < 10)
                    sessionObj.nightMessageCount++;
            }

            let datePeriodIndex = dateObj.getMonth() * 2 + (dateObj.getDate() >= 16 ? 1 : 0);
            if (0 <= datePeriodIndex && datePeriodIndex < datePeriod.length)
            {
                datePeriod[datePeriodIndex].count++;
                if (12 <= datePeriodIndex && datePeriodIndex < 24)
                    sessionObj.secondHalfOfTheYear++;
            }

            let eachDayIndex = Math.floor((time - statisticsStartTime) / oneDay);
            if (0 <= eachDayIndex && eachDayIndex < eachDay.length)
            {
                eachDay[eachDayIndex].count++;
            }
        });

        {
            let continuousChatDuration = Math.max(0, Math.min(lastReceivedTime, lastSendByMeTime) - continuousChatStartTime);

            if (continuousChatDuration > sessionObj.continuousChatMaxDuration)
            {
                sessionObj.continuousChatMaxDuration = continuousChatDuration;
                sessionObj.continuousChatMaxStartTime = continuousChatStartTime;
            }
        }

        if (hasRecordSendByMe)
            sessionCount++;
    });

    // 最喜欢发送的内容

    let sendContentMaxContent = "";
    let sendContentMaxValue = 0;
    sendContentCountMap.forEach((count, content) =>
    {
        if (count > sendContentMaxValue)
        {
            sendContentMaxValue = count;
            sendContentMaxContent = content;
        }
    });

    // 最喜欢发送的图片

    let sendImageMaxUrl = "";
    let sendImageMaxValue = 0;
    sendImageCountMap.forEach((count, url) =>
    {
        if (count > sendImageMaxValue)
        {
            sendImageMaxValue = count;
            sendImageMaxUrl = url;
        }
    });

    // 聊天数量排行

    let sessionList = Array.from(sessionStatisticsMap.entries()).map(o => ({ targetUid: o[0], ...o[1] }));
    sessionList.sort((a, b) =>
    {
        return (b.sendCount + b.receiveCount) - (a.sendCount + a.receiveCount);
    });


    // 夜间消息最多

    let nightMessageMaxUid = "";
    let nightMessageMaxValue = 0;
    sessionList.forEach(o =>
    {
        if (o.nightMessageCount > nightMessageMaxValue)
        {
            nightMessageMaxValue = o.nightMessageCount;
            nightMessageMaxUid = o.targetUid;
        }
    });

    // 连续聊天最长

    let continuousChatMaxUid = "";
    let continuousChatMaxDuration = 0;
    let continuousChatMaxStartTime = 0;
    sessionList.forEach(o =>
    {
        if (o.continuousChatMaxDuration > continuousChatMaxDuration)
        {
            continuousChatMaxDuration = o.continuousChatMaxDuration;
            continuousChatMaxStartTime = o.continuousChatMaxStartTime;
            continuousChatMaxUid = o.targetUid;
        }
    });

    // 后半年不再联系

    let usedToChatUid = "";
    for (let o of sessionList)
    {
        if (o.sendCount > 100 && o.receiveCount > 100 && o.secondHalfOfTheYear == 0)
        {
            usedToChatUid = o.targetUid;
            break;
        }
    }
    let usedToChatSession = usedToChatUid ? sessionStatisticsMap.get(usedToChatUid) : null;

    // 聊得最晚

    let nightContinuousChatMaxUid = "";
    let nightContinuousChatMaxDuration = 0;
    let nightContinuousChatMaxStartTime = 0;
    sessionList.forEach(o =>
    {
        if (o.nightContinuousChatMaxDuration > nightContinuousChatMaxDuration)
        {
            nightContinuousChatMaxDuration = o.nightContinuousChatMaxDuration;
            nightContinuousChatMaxStartTime = o.nightContinuousChatMaxStartTime;
            nightContinuousChatMaxUid = o.targetUid;
        }
    });

    // 最多同时聊天
    allMessageMatch.sort((a, b) => a.time - b.time);
    /** @type {Array<string>} */
    let multipleChatMaxList = [];
    let multipleChatMaxTime = 0;
    /**
     * @type {typeof allMessageMatch}
     */
    let messageQueue = [];
    /**
     * @type {Map<string, number>}
     */
    let messageInQueueCount = new Map();
    for (let o of allMessageMatch)
    {
        if (o.sendBySelf)
        {
            messageQueue.push(o);

            let oldValue = messageInQueueCount.get(o.targetUid);
            if (oldValue == undefined)
                oldValue = 0;
            messageInQueueCount.set(o.targetUid, oldValue + 1);
        }

        while (messageQueue.length > 0 && messageQueue[0].time < o.time - (15 * 60 * 1000))
        {
            let shiftMessage = messageQueue.shift();
            let oldValue = messageInQueueCount.get(shiftMessage.targetUid);
            if (oldValue >= 2)
                messageInQueueCount.set(shiftMessage.targetUid, oldValue - 1);
            else
                messageInQueueCount.delete(shiftMessage.targetUid);
        }

        if (messageInQueueCount.size > multipleChatMaxList.length)
        {
            multipleChatMaxList = Array.from(messageInQueueCount.keys());
            multipleChatMaxTime = o.time;
        }
    }

    console.log("-- 蔷薇年报 --");

    sessionStatisticsMap.forEach(o =>
    {
        if (o.sendCount == 0 && o.receiveCount == 0)
            return;
        console.log(`(你与 ${o.targetName}) `, o);
    });

    // 按时段统计

    /**
     * @type {Array<string>}
     */
    let peakTimeSclices = [];
    let peakTimeSlicesStartIndex = 0;
    /**
     * @param {number} index
     */
    function timeIndexToString(index) { return `${Math.floor(index / 2)}:${(index % 2 == 0 ? "00" : "30")}`; }
    timePeriod.forEach((o, index) =>
    {
        console.log(`(${timeIndexToString(index)} - ${timeIndexToString(index + 1)}) `, "总数量:", o.count);

        if (o.count > ((sendCount + receiveCount) / timePeriod.length) * 1.6)
        {
            o.isPeakTime = true;
        }
        else
        {
            if (peakTimeSlicesStartIndex < index)
            {
                peakTimeSclices.push(`(${timeIndexToString(peakTimeSlicesStartIndex)} - ${timeIndexToString(index)})`);
            }
            peakTimeSlicesStartIndex = index + 1;
        }
    });
    if (peakTimeSlicesStartIndex < timePeriod.length)
    {
        peakTimeSclices.push(`(${timeIndexToString(peakTimeSlicesStartIndex)} - ${timeIndexToString(timePeriod.length)})`);
    }

    // 按日期段统计

    let datePeriodMaxIndex = 0;
    let datePeriodMaxValue = 0;
    /**
     * @param {number} index
     */
    function dateIndexToString(index) { return `${(Math.floor(index / 2) % 12) + 1}月${(index % 2 == 0 ? "初" : "中旬")}`; }
    datePeriod.forEach((o, index) =>
    {
        console.log(`(${dateIndexToString(index)} - ${dateIndexToString(index + 1)}) `, "总数量:", o.count);
        if (o.count > datePeriodMaxValue)
        {
            datePeriodMaxIndex = index;
            datePeriodMaxValue = o.count;
        }
    });

    // 按每天统计

    let dayCount = 0;
    eachDay.forEach(o =>
    {
        if (o.count != 0)
        {
            dayCount++;
        }
    });
    console.log("有进行私聊的天数占今年总天数的", (Math.min(dayCount / dayOfThisYear, 1) * 100).toFixed(2), "%");

    /**
     * 时间间隔转可读字符串
     * @param {number} duration
     */
    function timeDurationToString(duration)
    {
        let ret = "";
        if (duration >= 60 * 60 * 1000)
            ret += `${Math.floor(duration / (60 * 60 * 1000))}小时`;
        if ((duration % (60 * 60 * 1000)) >= (60 * 1000))
            ret += `${Math.floor((duration % (60 * 60 * 1000)) / (60 * 1000))}分钟`;
        if ((duration % (60 * 1000)) >= 1000 || duration < 1000)
            ret += `${Math.floor((duration % (60 * 1000)) / 1000)}秒`;
        return ret;
    }

    let pageMainBody = ([
        ( // 1
            [
                [
                    "在2023年里,",
                    `你一共和 ${sessionCount} 位用户私聊过。`,
                    "",
                    `共发出了 ${sendCount}条私信,`,
                    `总共约 ${sendCharCount} 字;`,
                    `共收到了 ${receiveCount}条私信,`,
                    `总共约 ${receiveCharCount} 字。`,
                    (
                        sendCount < 1000 ?
                            "也许今年你在花园里并不常常私聊呢 > <" :
                            sendCount < 10000 ?
                                "与好友聊天 话总不嫌太多。" :
                                "获得 蔷薇花园 私聊小能手称号~"
                    )
                ].join("\n")
            ]
        ),
        ( // 2
            datePeriodMaxValue > 60 ?
                [
                    [
                        `这一年里,`,
                        `你进行过私聊的天数占今年总天数的 ${(Math.min(dayCount / dayOfThisYear, 1) * 100).toFixed(2)}%,`,
                        `${dateIndexToString(datePeriodMaxIndex)} 到 ${dateIndexToString(datePeriodMaxIndex + 1)} 是你私聊最多的时候。`,
                        `你在这半月内,`,
                        `共收发了 ${datePeriodMaxValue} 条私聊消息。`,
                        (datePeriodMaxValue > 800 ? "这段时间 或许你有很多话要诉说。" : "这段时间的自己 正在经历些什么呢?")
                    ].join("\n")
                ] :
                null
        ),
        ( // 3
            (peakTimeSclices.length > 0) ?
                [
                    [
                        "一天之中,",
                        `你偏爱的聊天时段是 ${peakTimeSclices.join(", ")}。`,
                        (peakTimeSclices.length > 3 ? "碎片的时光, 留存着与好友的点滴。" : "美好的时光格外令人珍惜。")
                    ].join("\n")
                ] :
                null
        ),
        ( // 4
            sessionList[0] ?
                [
                    [
                        `与你往来私信最多的人 非 ${sessionList[0].targetName} 莫属,`,
                        `你们之间一共往来了 ${sessionList[0].sendCount + sessionList[0].receiveCount} 条私信,`,
                        `你发出了 ${sessionList[0].sendCount} 条, ta发出了 ${sessionList[0].receiveCount} 条。`,
                        "",
                        (sessionList[1] ? `与你互发私信次多的是 ${sessionList[1].targetName} 共收发 ${sessionList[1].sendCount + sessionList[1].receiveCount} 条` : ""),
                        (sessionList[2] ? `再其次是 ${sessionList[2].targetName} 共收发 ${sessionList[2].sendCount + sessionList[2].receiveCount} 条` : "")
                    ].join("\n")
                ] :
                null
        ),
        ( // 5
            (sendContentMaxValue > 5 || sendImageMaxValue > 5) ?
                [
                    (
                        sendContentMaxValue > 5 ?
                            [
                                `今年里,`,
                                `你最喜欢发送的内容是 "${htmlSpecialCharsDecode(sendContentMaxContent)}"`,
                                `你一共发送过 ${sendContentMaxValue} 次。`
                            ].join("\n") :
                            null
                    ),
                    "\n",
                    ...(
                        sendImageMaxValue > 5 ?
                            [
                                `你最喜欢发送的图片是 "${htmlSpecialCharsDecode(sendImageMaxUrl)}"\n`,

                                [
                                    new NTagName("img"),
                                    new NAttr("src", htmlSpecialCharsDecode(sendImageMaxUrl)),
                                    styles({
                                        maxHeight: "30vh",
                                        maxWidth: "30vw",
                                        border: "1px solid white"
                                    })
                                ],

                                `\n你一共发送过 ${sendImageMaxValue} 次。`
                            ] :
                            []
                    )
                ] :
                null
        ),
        ( // 6
            (nightMessageMaxValue > 100) ?
                [
                    [
                        `夜深了,`,
                        (nightMessageMaxValue > 3000 ? `但对你来说夜生活刚刚开始,` : `你的私聊也在继续,`),
                        `夜间 你常常与 ${sessionStatisticsMap.get(nightMessageMaxUid).targetName} 畅谈,`,
                        `你们在转钟后的收发的私聊数量达到了 ${nightMessageMaxValue} 条。`
                    ].join("\n")
                ] :
                null
        ),
        ( // 7
            (continuousChatMaxDuration > 1.5 * 60 * 60 * 1000) ?
                [
                    [
                        "还记得吗,",
                        `在 ${(new Date(continuousChatMaxStartTime)).toLocaleString()},`,
                        `你与 ${sessionStatisticsMap.get(continuousChatMaxUid).targetName} 展开了一段`,
                        `长达 ${timeDurationToString(continuousChatMaxDuration)} 的超长的连续聊天!`
                    ].join("\n")
                ] :
                null
        ),
        ( // 8
            (nightContinuousChatMaxDuration > 50 * 60 * 1000 && nightContinuousChatMaxStartTime != continuousChatMaxStartTime) ?
                [
                    [
                        `在 ${(new Date(nightContinuousChatMaxStartTime)).toLocaleDateString()},`,
                        `从 ${(new Date(nightContinuousChatMaxStartTime)).toLocaleTimeString()}`,
                        `到 ${(new Date(nightContinuousChatMaxStartTime + nightContinuousChatMaxDuration)).toLocaleTimeString()}`,
                        "星月交辉,",
                        `你与 ${sessionStatisticsMap.get(nightContinuousChatMaxUid).targetName} 的交流从未停歇。`
                    ].join("\n")
                ] :
                null
        ),
        ( // 9
            multipleChatMaxList.length >= 3 ?
                [
                    [
                        `${(new Date(multipleChatMaxTime)).toLocaleDateString()},`,
                        `这一天里,`,
                        `你曾最多同时和 ${multipleChatMaxList.length} 位好友聊天,`,
                        `他们分别是 ${multipleChatMaxList.map(uid => sessionStatisticsMap.get(uid).targetName).join(", ")}。`,
                    ].join("\n")
                ] :
                null
        ),
        ( // 10
            usedToChatUid ?
                [
                    [
                        "你有过一位好友,",
                        `${usedToChatSession.targetName} 曾与你互发 ${usedToChatSession.sendCount + usedToChatSession.receiveCount} 条消息,`,
                        "今年下半,",
                        "你们不曾联系过。",
                        "也许找时间去打个招呼?"
                    ].join("\n")
                ] :
                null
        ),
    ]).filter(o => o != null);

    showReportPages(
        "2023蔷薇私聊年报",
        ([
            NList.getElement([
                "向上滑动\n领取你的2023蔷薇私聊年报"
            ]),
            ...pageMainBody.map(o => NList.getElement(o)),
            NList.getElement([
                "后面没有啦\n\n",
                [
                    styles({
                        display: "inline-block",
                        padding: "6px",
                        border: "1px solid white",
                        backgroundColor: "rgba(0, 0, 0, 0.7)",
                        fontSize: "0.8em"
                    }),
                    "生成年报长图",
                    new NEvent("click", async () =>
                    {
                        let textLines = pageMainBody.map(o => o.map(o => (typeof (o) == "string" ? o : "")).join("")).join("\n\n").split("\n");
                        let canvas = new OffscreenCanvas(1600, 350 + textLines.length * 30);

                        console.log(textLines);

                        let canvasContext = canvas.getContext("2d");

                        canvasContext.fillStyle = "rgb(30, 30, 30)";
                        canvasContext.fillRect(0, 0, canvas.width, canvas.height);


                        canvasContext.fillStyle = "rgb(255, 255, 255)";
                        canvasContext.font = `40px "Fira Sans", serif`;
                        canvasContext.textAlign = "center";
                        canvasContext.fillText("蔷薇花园2023年报", canvas.width / 2, 90);

                        textLines.forEach((lineText, index) =>
                        {
                            canvasContext.fillStyle = "rgb(255, 255, 255)";
                            canvasContext.font = `27px "Fira Sans", serif`;
                            canvasContext.textAlign = "center";
                            canvasContext.fillText(lineText, canvas.width / 2, 200 + index * 30);
                        });

                        let blob = await canvas.convertToBlob({
                            type: "image/png",
                            quality: 0.9
                        });
                        let url = URL.createObjectURL(blob);
                        let aElement = document.createElement("a");
                        aElement.download = "蔷薇私聊2023年报.png";
                        aElement.href = url;
                        aElement.click();
                    })
                ]
            ]),
        ]),
        [
            "http://r.iirose.com/i/23/10/11/21/3338-QK.jpg",
            "http://r.iirose.com/i/22/12/18/15/4513-0A.png",
            "http://r.iirose.com/i/22/5/11/15/3838-IY.jpg",
            "http://r.iirose.com/i/23/9/7/1/1047-5Y.jpg",
            "http://r.iirose.com/i/23/8/24/5/0224-LF.jpg",
            "http://r.iirose.com/i/23/12/17/16/2214-M1.jpg",
            "http://r.iirose.com/i/23/12/17/16/2223-ZH.jpg",
            "http://r.iirose.com/i/23/12/17/16/2229-EV.jpg",
            "http://r.iirose.com/i/23/12/17/16/2237-6O.jpg",
            "http://r.iirose.com/i/23/12/17/16/2242-AR.jpg",
            "http://r.iirose.com/i/23/12/17/16/2334-XA.jpg",
            "http://r.iirose.com/i/23/12/17/16/2319-TO.png"
        ]
    );
}
/*
    1   + [x] 和多少人私聊过 私聊总条数 私聊总字数
    2   + [x] 聊天月历
    3   + [x] 最多的聊天时段
    4   + [x] 聊的最多的前三
    5   + [x] 最喜欢发送的内容 最喜欢使用的图片
    6   + [x] 夜间分段第一
    7   + [x] 持续时间最长的聊天
    8   + [x] 聊得最晚(夜间聊天持续时间最长)
    9   + [x] 最多同时聊天的人数 (大于或等于3)
    10  + [x] 不再聊天的人 (去年或上半年经常聊天 下半年几乎没有聊天)
*/

/**
 * 展示报告页
 * @param {string} title
 * @param {Array<NElement>} pages
 * @param {Array<string>} backgroundList
 */
function showReportPages(title, pages, backgroundList)
{
    let nowPageIndex = 0;
    let pageData = createHookObj({
        textElement: pages[nowPageIndex]
    });
    /**
     * @type {NElement}
     */
    let textElement = null;
    /**
     * @type {NElement}
     */
    let backgroundElement = null;
    /**
     * @type {NElement}
     */
    let backgroundOverlayElement = null;
    /**
     * @type {NElement}
     */
    let upButtonElement = null;
    /**
     * @type {NElement}
     */
    let downButtonElement = null;

    let switchPageFinish = true;

    /**
     * 切换页面
     * @param {number} index
     */
    async function switchPageTo(index)
    {
        // if (index < 0 || index >= pages.length)
        //     index = (index + pages.length) % pages.length;
        if (!switchPageFinish || !pages[index])
            return;
        switchPageFinish = false;
        nowPageIndex = index;

        textElement.animate([
            {
                opacity: "1"
            },
            {
                opacity: "0"
            }
        ], {
            duration: 1000,
            easing: "ease-in",
            fill: "forwards"
        });
        await backgroundOverlayElement.animateCommit([
            {
                backgroundColor: "rgba(0, 0, 0, 0.5)"
            },
            {
                backgroundColor: "rgba(0, 0, 0, 1)"
            }
        ], 300);

        backgroundElement.setStyle("backgroundImage", `url("${backgroundList[index % backgroundList.length]}")`);
        await delayPromise(700);
        pageData.textElement = pages[index];

        textElement.animate([
            {
                opacity: "0"
            },
            {
                opacity: "1"
            }
        ], {
            duration: 1000,
            easing: "ease-in",
            fill: "forwards"
        });
        await backgroundOverlayElement.animateCommit([
            {
                backgroundColor: "rgba(0, 0, 0, 1)"
            },
            {
                backgroundColor: "rgba(0, 0, 0, 0.5)"
            }
        ], 500);

        await delayPromise(500);
        switchPageFinish = true;
    }

    let page = NList.getElement([ // 整个页面
        styles({
            position: "fixed",
            top: "0",
            left: "0",
            zIndex: "92000",
            height: "100%",
            width: "100%",
            backgroundColor: "rgb(255, 255, 255)",
        }),


        [ // 标题栏
            styles({
                opacity: "0.8",
                backgroundColor: "#303030",
                width: "100%",
                boxShadow: "0 0 1px rgb(0, 0, 0, 0.12), 0 1px 1px rgb(0, 0, 0, 0.24)",
                zIndex: "2",
                fontFamily: "md",
                height: "40px",
                lineHeight: "40px",
                fontSize: "26px",
                whiteSpace: "nowrap",
                boxSizing: "border-box",
                position: "relative",
                color: "#fff",
            }),

            [ // 返回按钮
                className("mdi-chevron-left"),
                styles({
                    display: "inline-flex",
                    opacity: "0.8",
                    backgroundColor: "#303030",
                    boxShadow: "0 0 1px rgb(0,0,0,0.12), 0 1px 1px rgb(0,0,0,0.24)",
                    borderRight: "1px solid rgb(255,255,255,0.3)",
                    zIndex: "2",
                    fontFamily: "md",
                    width: "40px",
                    height: "40px",
                    lineHeight: "40px",
                    fontSize: "26px",
                    padding: "0 0 0 0",
                    whiteSpace: "nowrap",
                    boxSizing: "border-box",
                    position: "relative",
                    color: "#fff",
                    justifyContent: "center",
                    alignItems: "center"
                }),

                new NEvent("click", () =>
                {
                    page.remove();
                })
            ],
            [
                className("mdi-fire"),
                styles({
                    display: "inline-block",
                    opacity: "0.8",
                    backgroundColor: "#303030",
                    boxShadow: "0 0 1px rgb(0,0,0,0.12), 0 1px 1px rgb(0,0,0,0.24)",
                    marginLeft: "15px",
                    zIndex: "2",
                    fontFamily: "md",
                    height: "40px",
                    lineHeight: "40px",
                    fontSize: "26px",
                    padding: "0 0 0 0",
                    whiteSpace: "nowrap",
                    boxSizing: "border-box",
                    position: "relative",
                    color: "#fff",
                })
            ],
            [
                styles({
                    display: "inline",
                    fontSize: "16px",
                    opacity: "0.7",
                    fontWeight: "bold",
                    marginLeft: "16px",
                    height: "100%",
                    lineHeight: "40px",
                    verticalAlign: "top",
                }),

                title
            ]
        ],

        [ // 内容主体
            styles({
                position: "absolute",
                left: "0",
                width: "100%",
                top: "40px",
                bottom: "0",
                overflow: "auto",
            }),

            [ // 文本内容
                styles({
                    position: "absolute",
                    inset: "0",
                    margin: "auto",
                    width: "fit-content",
                    maxWidth: "90%",
                    height: "fit-content",
                    fontSize: "1.8em",
                    whiteSpace: "pre-wrap",
                    color: "white",
                    zIndex: "5"
                }),

                ele => textElement = ele,

                bindValue(pageData, "textElement")
            ],

            [ // 背景图片
                styles({
                    position: "absolute",
                    left: "0",
                    top: "0",
                    width: "100%",
                    height: "100%",
                    backgroundImage: `url("${backgroundList[nowPageIndex]}")`,
                    backgroundPosition: "center",
                    backgroundSize: "cover",
                    zIndex: "1"
                }),

                ele => backgroundElement = ele,
            ],

            [ // 背景遮罩
                styles({
                    position: "absolute",
                    left: "0",
                    top: "0",
                    width: "100%",
                    height: "100%",
                    backgroundColor: "rgba(0, 0, 0, 0.5)",
                    zIndex: "2"
                }),

                ele => backgroundOverlayElement = ele,

                ele =>
                {
                    ele.animate([
                        {
                            backgroundColor: "rgba(0, 0, 0, 0)"
                        },
                        {
                            backgroundColor: "rgba(0, 0, 0, 0.5)"
                        }
                    ], 1000);
                }
            ],

            new NEvent("wheel", e =>
            {
                if (e.deltaY > 0)
                {
                    switchPageTo(nowPageIndex + 1);
                }
                else if (e.deltaY < 0)
                {
                    switchPageTo(nowPageIndex - 1);
                }
            }),

            e =>
            {
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
                                startTargetElement.dispatchEvent(new MouseEvent("click"));
                            }
                        }
                        else if (now - startPressTime < 600 && Math.abs(e.y - e.sy) > 100 && Math.abs(e.x - e.sx) / Math.abs(e.y - e.sy) < 0.5)
                        {
                            if (e.y - e.sy > 0)
                            {
                                switchPageTo(nowPageIndex - 1);
                            }
                            else
                            {
                                switchPageTo(nowPageIndex + 1);
                            }
                        }
                    }
                };

                e.addEventListener("mousedown", e => e.preventDefault(), true);
                e.addEventListener("mouseup", e => e.preventDefault(), true);
                touchBind(e, proc);

                e.addEventListener("mousedown", e => e.stopPropagation());
                e.addEventListener("mouseup", e => e.stopPropagation());
                e.addEventListener("touchstart", e => e.stopPropagation());
                e.addEventListener("touchend", e => e.stopPropagation());
                e.addEventListener("touchcancel", e => e.stopPropagation());
            },
        ]
    ]);
    iframeContext.iframeBody.addChild(page);
}