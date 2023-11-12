import { JSOBin } from "../../lib/jsobin.js";
import { uniqueIdentifierString } from "../util/uniqueIdentifier.js";

const jsob = new JSOBin();

/**
 * forge分片数据包
 * 数据包id 到 分片信息 映射
 * @type {Map<string, {
 *  slices: Array<string>,
 *  createTime: number,
 *  updateTime: number,
 *  packetTime: number,
 *  creator: string,
 *  totalCount: number
 *  hasCount: number
 * }>}
 */
let forgeSliceMap = new Map();

/**
 * 未完成的分片符号
 */
export const unfinishedSliceSymbol = Symbol("unfinishedSliceSymbol");

setInterval(() =>
{
    let nowTime = Date.now();
    forgeSliceMap.forEach((o, id) =>
    {
        if (o.updateTime < nowTime - 15 * 1000)
            forgeSliceMap.delete(id);
    });
}, 5000);

/**
 * 读取forge数据包
 * @param {string} dataStr
 * @param {string} creatorId
 * @returns {Object | unfinishedSliceSymbol}
 */
export function readForgePacket(dataStr, creatorId)
{
    if (dataStr.startsWith("iiroseForge:") && dataStr.endsWith(":end"))
    {
        let data = dataStr.slice(12, -4);
        try
        {
            let commaIndex = data.indexOf(",");
            let len = Number.parseInt(data.slice(0, commaIndex), 36);
            if (Number.isNaN(len) || len < 0 || len > 8192)
                return undefined;
            data = data.slice(commaIndex + 1);
            let dataBase64 = data.slice(0, len);
            if (dataBase64.length != len)
                return undefined;

            let metaArr = data.slice(len).split(",");

            if (metaArr[1] == "single") // 单包数据
            {
                if (metaArr.length < 2)
                    return undefined;
                return jsob.decode(base64ToUint8(dataBase64));
            }
            else if (metaArr[1] == "slice") // 分片数据
            {
                if (metaArr.length < 5)
                    return undefined;
                let nowTime = Date.now();
                let packetId = metaArr[0];
                let sliceIndex = Number.parseInt(metaArr[2], 36);
                let sliceCount = Number.parseInt(metaArr[3], 36);
                let packetTime = Number.parseInt(metaArr[4], 36);
                if (
                    Number.isNaN(sliceIndex) ||
                    Number.isNaN(sliceCount) ||
                    Number.isNaN(packetTime) ||
                    sliceCount > 50 ||
                    sliceIndex < 0 ||
                    sliceIndex >= sliceCount ||
                    packetTime > nowTime + 15 * 1000 ||
                    packetTime < nowTime - 60 * 1000 ||
                    packetId == ""
                )
                    return undefined;
                let sliceInfo = forgeSliceMap.get(packetId);
                if (!sliceInfo)
                {
                    sliceInfo = {
                        slices: Array(sliceCount),
                        createTime: nowTime,
                        updateTime: nowTime,
                        packetTime: packetTime,
                        creator: creatorId,
                        hasCount: 0,
                        totalCount: sliceCount
                    };
                    forgeSliceMap.set(packetId, sliceInfo);
                }
                if (
                    sliceInfo.creator != creatorId ||
                    sliceInfo.packetTime != packetTime ||
                    sliceInfo.totalCount != sliceCount ||
                    sliceInfo.slices[sliceIndex] != undefined
                )
                    return undefined;
                sliceInfo.updateTime = nowTime;
                sliceInfo.hasCount++;
                sliceInfo.slices[sliceIndex] = dataBase64;
                if (sliceInfo.hasCount < sliceCount)
                    return unfinishedSliceSymbol;
                else
                {
                    forgeSliceMap.delete(packetId);
                    return jsob.decode(base64ToUint8(sliceInfo.slices.join("")));
                }
            }
        }
        catch (err)
        {
            console.log(err);
            return undefined;
        }
    }
    else
        return undefined;
}

/**
 * 写入forge数据包
 * @param {Object} obj
 * @returns {string | Array<string>}
 */
export function writeForgePacket(obj)
{
    const maxBodyLength = 8192;
    try
    {
        let dataBase64 = uint8ToBase64(jsob.encode(obj));
        if (dataBase64.length <= maxBodyLength)
        {
            let metaArr = ["", "single"];
            return `iiroseForge:${dataBase64.length.toString(36)},${dataBase64}${metaArr.join(",")}:end`;
        }
        else
        {
            let packetTime = Date.now();
            let packetTimeStr = packetTime.toString(36);
            let packetId = uniqueIdentifierString();
            let sliceCount = Math.ceil(dataBase64.length / maxBodyLength);
            let sliceCountStr = sliceCount.toString(36);
            return Array(sliceCount).fill(0).map((_, i) =>
            {
                let dataSlice = dataBase64.slice(i * maxBodyLength, (i + 1) * maxBodyLength);
                let metaArr = [
                    packetId,
                    "slice",
                    i.toString(36),
                    sliceCountStr,
                    packetTimeStr
                ];
                return `iiroseForge:${dataSlice.length.toString(36)},${dataSlice}${metaArr.join(",")}:end`;
            });
        }
    }
    catch (err)
    {
        return undefined;
    }
}

/**
 * uint8数组转base64
 * @param {Uint8Array} data
 * @returns {string}
 */
function uint8ToBase64(data)
{
    let binaryString = Array.from(data).map(o => String.fromCharCode(o)).join("");
    return window.btoa(binaryString);
}

/**
 * base64数组转uint8
 * @param {string} base64
 * @returns {Uint8Array}
 */
function base64ToUint8(base64)
{
    let binaryString = window.atob(base64);
    let ret = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++)
    {
        ret[i] = binaryString.charCodeAt(i);
    }
    return ret;
}