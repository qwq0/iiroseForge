import { JSOBin } from "../../lib/JSOBin.js";

const jsob = new JSOBin();

/**
 * 读取forge数据包
 * @param {string} dataStr
 * @returns {Object}
 */
export function readForgePacket(dataStr)
{
    if (dataStr.startsWith("iiroseForge:") && dataStr.endsWith(":end"))
    {
        let data = dataStr.slice(12, -4);
        try
        {
            let commaInd = data.indexOf(",");
            let len = Number.parseInt(data.slice(0, commaInd), 36);
            if (Number.isNaN(len) || len < 0 || len > 8192)
                return undefined;
            data = data.slice(commaInd + 1);
            let dataBase64 = data.slice(0, len);
            if (dataBase64.length != len)
                return undefined;
            let metaArr = data.slice(len).split(",");
            if ((!metaArr[1]) || metaArr[1] == "single")
                return jsob.decode(base64ToUint8(dataBase64));
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
 * @returns {string}
 */
export function writeForgePacket(obj)
{
    try
    {
        let dataBase64 = uint8ToBase64(jsob.encode(obj));
        let metaArr = ["", "single"];
        return `iiroseForge:${dataBase64.length.toString(36)},${dataBase64}${metaArr.join(",")}:end`;
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