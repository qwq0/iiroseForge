import { forgeApi } from "../forgeApi/forgeApi.js";
import { iframeContext } from "../injectIframe/iframeContext.js";
import { protocolEvent } from "../protocol/protocolEvent.js";
import { storageContext, storageLocalSave } from "../storage/storage.js";
import { showNotice } from "../ui/notice.js";
import { uniqueIdentifierString } from "../util/uniqueIdentifier.js";

let waitForId = "";
let waitStartTime = 0;

/**
 * 尝试同步聊天记录
 */
export function trySyncChatRecord()
{
    showNotice("聊天记录同步", "正在尝试获取聊天记录");
    let requestId = uniqueIdentifierString();
    forgeApi.operation.sendSelfPrivateForgePacket({
        plug: "forge",
        type: "syncPrivateChatRecordRQ",
        id: requestId,
        startTime: Math.max(
            Date.now() - 3 * 24 * 60 * 60 * 1000,
            storageContext.local.lastCloseTime - 30 * 60 * 60 * 1000,
            storageContext.local.syncChatRecordTo - 15 * 60 * 1000
        ),
        endTime: Date.now() + 30 * 1000
    });
    waitForId = requestId;
    waitStartTime = Date.now();
}

let registedReturnChatRecord = false;
/**
 * 启用聊天记录同步
 */
export function enableSyncChatRecord()
{
    if (registedReturnChatRecord)
        return;
    registedReturnChatRecord = true;
    protocolEvent.forge.selfPrivateForgePacket.add(e =>
    {
        if (waitForId)
        {
            if (
                e.content.type == "syncPrivateChatRecordCB" &&
                e.content.id == waitForId &&
                waitStartTime + 35 * 1000 >= Date.now()
            ) // 收到请求回调
            {
                if (e.content.content)
                {
                    let diffCount = checkRecordDiff(e.content.content, e.content.startTime);
                    // console.log(e.content.content);
                    if (diffCount == 0)
                        showNotice("聊天记录同步", "本地聊天记录已为最新");
                    else
                        showNotice("聊天记录同步", `从其他设备获取到 ${diffCount} 条记录\n点击合并记录到当前设备`, undefined, () =>
                        {
                            storageContext.local.syncChatRecordTo = Math.min(Date.now(), e.content.endTime);
                            if (Number.isNaN(storageContext.local.syncChatRecordTo))
                                storageContext.local.syncChatRecordTo = Date.now();
                            storageLocalSave();
                            mergeRecordToLocal(e.content.content, e.content.startTime);
                        });
                }
            }
        }

        if (e.content.type == "syncPrivateChatRecordRQ")
        { // 收到同步请求
            let startTime = Number(e.content.startTime);
            let endTime = Number(e.content.endTime);
            if (
                Number.isNaN(startTime) ||
                Number.isNaN(endTime) ||
                !(startTime < endTime)
            )
                return;

            let recordList = getLocalRecordList();

            let callbackContent = [];

            recordList.forEach(o =>
            {
                if (
                    o.records.length == 0 ||
                    !(processSingleRecord(o.records.at(-1))[1] >= startTime)
                )
                    return;

                let needSendRecords = [];
                for (let i = o.records.length - 1; i >= 0; i--)
                {
                    let nowRecord = processSingleRecord(o.records[i]);
                    let time = nowRecord[1];
                    if (time < startTime)
                        break;
                    if (startTime <= time && time < endTime)
                        needSendRecords.push(nowRecord);
                }
                if (needSendRecords.length > 0)
                {
                    needSendRecords.sort((a, b) => a[1] - b[1]);
                    callbackContent.push({
                        name: o.name,
                        info: o.info,
                        uid: o.uid,
                        otherInfo: o.otherInfo,
                        records: needSendRecords
                    });
                }
            });

            let requestId = e.content.id;
            forgeApi.operation.sendSelfPrivateForgePacket({
                plug: "forge",
                type: "syncPrivateChatRecordCB",
                id: requestId,
                content: callbackContent,
                startTime: startTime,
                endTime: endTime
            });
            showNotice("聊天记录同步", "其他设备正在拉取本机聊天记录");
        }
    });
}

/**
 * 获取本地记录
 * @returns {Array<{
 *  uid: string,
 *  name: string,
 *  info: Array<string>,
 *  records: Array<string | [boolean, number, ...Array<string>]>,
 *  otherInfo: Array<string>
 * }>}
 */
function getLocalRecordList()
{
    iframeContext.iframeWindow["Utils"]?.service?.saveStatus?.(7, 1);
    let rawRecordStr = localStorage.getItem(`pmLog_${forgeApi.operation.getUserUid()}`);
    if (rawRecordStr)
        return rawRecordStr.split("<").map(o =>
        {
            let part = o.split(`"`).map(o => o.split(`>`));
            return {
                uid: part[0]?.[0],
                name: part[1]?.[2],
                info: part[1],
                records: part[2],
                otherInfo: part[3]
            };
        });
    else
        return [];
}

/**
 * 设置本地记录
 * @param {ReturnType<typeof getLocalRecordList>} recordList 
 */
function setLocalRecordList(recordList)
{
    let rawRecordStr = recordList.map(o =>
        ([
            o.uid,
            o.info.map((e, ind) =>
            {
                if ((ind == 7 || ind == 8) && o.records.length > 0)
                    return processSingleRecord(o.records.at(-1))[3];
                return e;
            }).join(`>`),

            o.records.map(o =>
            {
                if (typeof (o) == "string")
                    return o;
                else
                    return [
                        (o[0] ? "1" : ""),
                        Math.floor(o[1] / 1000).toString(10),
                        ...o.slice(2)
                    ].join(`'`);
            }).join(`>`),

            o.records.length.toString(10)
            // o.otherInfo.join(`>`)
        ]).join(`"`)
    ).join("<");
    localStorage.setItem(`pmLog_${forgeApi.operation.getUserUid()}`, rawRecordStr);
}

/**
 * 处理单条记录
 * @param {string | [boolean, number, ...Array<string>]} record
 * @returns {[boolean, number, ...Array<string>]}
 */
function processSingleRecord(record)
{
    if (typeof (record) == "string")
    {
        let part = record.split(`'`);

        let time = Number(part[1]) * 1000;
        let sendBySelf = (part[0] == "1");

        return [
            sendBySelf,
            time,
            ...part.slice(2)
        ];
    }
    else
        return record;
}

/**
 * 检查本地记录中不存在的记录
 * @param {ReturnType<typeof getLocalRecordList>} remoteRecordList
 * @param {number} startTime
 * @returns {number}
 */
function checkRecordDiff(remoteRecordList, startTime)
{
    let diffCount = 0;

    let localRecordList = getLocalRecordList();
    let localRecordMap = new Map(localRecordList.map(o => [o.uid, o]));

    remoteRecordList.forEach(o =>
    {
        let localRecordInfo = localRecordMap.get(o.uid);
        if (localRecordInfo)
        {
            let localRecordMessageMap = new Map();
            for (let i = localRecordInfo.records.length - 1; i >= 0; i--)
            {
                let nowRecord = processSingleRecord(localRecordInfo.records[i]);
                let time = nowRecord[1];
                let messageId = nowRecord[3];
                if (time < startTime - 60 * 1000)
                    break;
                localRecordMessageMap.set(messageId, nowRecord);
            }

            o.records.forEach(o =>
            {
                let nowRecord = processSingleRecord(o);
                let messageId = nowRecord[3];
                if (!localRecordMessageMap.has(messageId))
                    diffCount++;
            });
        }
        else
            diffCount += o.records.length;
    });

    return diffCount;
}

/**
 * 合并记录到本地
 * 将刷新内侧iframe
 * @param {ReturnType<typeof getLocalRecordList>} remoteRecordList
 * @param {number} startTime
 */
function mergeRecordToLocal(remoteRecordList, startTime)
{
    let localRecordList = getLocalRecordList();
    let localRecordMap = new Map(localRecordList.map(o => [o.uid, o]));

    remoteRecordList.forEach(o =>
    {
        let localRecordInfo = localRecordMap.get(o.uid);
        if (localRecordInfo)
        {
            let localRecordMessageMap = new Map();
            for (let i = localRecordInfo.records.length - 1; i >= 0; i--)
            {
                let nowRecord = processSingleRecord(localRecordInfo.records[i]);
                let time = nowRecord[1];
                let messageId = nowRecord[3];
                if (time < startTime - 5 * 60 * 1000)
                    break;
                localRecordMessageMap.set(messageId, nowRecord);
            }

            let localRecordIndex = localRecordInfo.records.length;
            for (let i = o.records.length - 1; i >= 0; i--)
            {
                let nowRecord = processSingleRecord(o.records[i]);
                let time = nowRecord[1];
                let messageId = nowRecord[3];
                if (!localRecordMessageMap.has(messageId))
                {
                    if (
                        localRecordIndex > 0 &&
                        processSingleRecord(localRecordInfo.records[localRecordIndex - 1])[1] > time
                    )
                        localRecordIndex--;
                    localRecordInfo.records.splice(localRecordIndex, 0, nowRecord);
                }
            };
        }
        else
        {
            localRecordList.push(o);
        }
    });

    setLocalRecordList(localRecordList);

    let oldSaveState = (iframeContext.iframeWindow["Utils"].service.saveStatus).bind(iframeContext.iframeWindow["Utils"].service);
    iframeContext.iframeWindow["Utils"].service.saveStatus = () =>
    {
        for (let i = 0; i <= 11; i++)
            if (i != 7)
                oldSaveState(i, 1);
    };

    iframeContext.iframeWindow.location.reload();
}