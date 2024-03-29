import { messageNeedBlock } from "../feature/blacklist.js";
import { forgeApi, forgeOccupyPlugNameSet } from "../forgeApi/forgeApi.js";
import { storageContext } from "../storage/storage.js";
import { htmlSpecialCharsDecode } from "../util/htmlSpecialChars.js";
import { Trie } from "./Trie.js";
import { readForgePacket, unfinishedSliceSymbol } from "./forgePacket.js";
import { protocolEvent } from "./protocolEvent.js";

export let toServerTrie = new Trie();
export let toClientTrie = new Trie();
/**
 * 数据包内容
 * 将改变实际发送或接收的包的内容
 * @type {[string]}
 */
let packageData = [""];

/**
 * @param {string} data
 */
export function setPackageData(data)
{
    packageData[0] = data;
}

toClientTrie.addPath(`"`, (data) => // 房间消息
{
    packageData[0] = `"` + data.split("<").reverse().map(data =>
    {
        let part = data.split(">");
        // console.log(part);
        let senderId = part[8];
        let senderName = htmlSpecialCharsDecode(part[2]);
        let content = part[3];

        if (part[4] != "s" && content[0] != `'`)
        {

            let forgePacket = readForgePacket(content, senderId);
            if (forgePacket != undefined)
            {
                if (forgePacket != unfinishedSliceSymbol)
                {
                    if (typeof (forgePacket) != "object")
                        return undefined;
                    if (forgeOccupyPlugNameSet.has(forgePacket.plug))
                        protocolEvent.forge.roomForgePacket.trigger({
                            senderId: senderId,
                            senderName: senderName,
                            content: forgePacket
                        });
                    else
                        forgeApi.event.roomForgePacket.trigger({
                            senderId: senderId,
                            senderName: senderName,
                            content: forgePacket
                        });
                }
                return undefined;
            }
            else
                forgeApi.event.roomMessage.trigger({
                    senderId: senderId,
                    senderName: senderName,
                    content: htmlSpecialCharsDecode(content)
                });
        }

        if (messageNeedBlock(senderId, content, senderName))
            return undefined;

        return data;
    }).filter(o => o != undefined).reverse().join("<");
});

/**
 * @type {Map<string, number>}
 */
let lastAutoReplyTime = new Map();

toClientTrie.addPath(`""`, (data) => // 私聊消息
{
    let userId = forgeApi.operation.getUserUid();
    packageData[0] = `""` + data.split("<").map(data =>
    {
        let part = data.split(">");

        let senderId = part[1];
        let senderName = htmlSpecialCharsDecode(part[2]);
        let content = part[4];
        let receiverId = part[11];

        if (part[6] == "")
        {
            if (senderId != userId)
            {
                let forgePacket = readForgePacket(content, senderId);
                if (forgePacket != undefined)
                {
                    if (forgePacket != unfinishedSliceSymbol)
                    {
                        if (typeof (forgePacket) != "object")
                            return undefined;
                        if (forgeOccupyPlugNameSet.has(forgePacket.plug))
                            protocolEvent.forge.privateForgePacket.trigger({
                                senderId: senderId,
                                senderName: senderName,
                                content: forgePacket
                            });
                        else
                            forgeApi.event.privateForgePacket.trigger({
                                senderId: senderId,
                                senderName: senderName,
                                content: forgePacket
                            });
                    }
                    return undefined;
                }
                else
                    forgeApi.event.privateMessage.trigger({
                        senderId: senderId,
                        senderName: senderName,
                        content: htmlSpecialCharsDecode(content)
                    });
            }
            else if (senderId == userId && receiverId == userId)
            {
                let forgePacket = readForgePacket(content, senderId);
                if (forgePacket != undefined)
                {
                    if (forgePacket != unfinishedSliceSymbol)
                    {
                        if (typeof (forgePacket) != "object")
                            return undefined;
                        if (forgeOccupyPlugNameSet.has(forgePacket.plug))
                            protocolEvent.forge.selfPrivateForgePacket.trigger({
                                content: forgePacket
                            });
                        else
                            forgeApi.event.selfPrivateForgePacket.trigger({
                                content: forgePacket
                            });
                    }
                    return undefined;
                }
                else
                    forgeApi.event.selfPrivateMessage.trigger({
                        content: htmlSpecialCharsDecode(content)
                    });
            }
            else if (senderId == userId && receiverId != userId)
            {
                let forgePacket = readForgePacket(content, senderId);
                if (forgePacket != undefined)
                    return undefined;
            }

            if (messageNeedBlock(senderId, content, senderName))
            {
                if (storageContext.roaming.blacklistAutoReply) // 黑名单自动回复
                {
                    if (!lastAutoReplyTime.has(senderId) || lastAutoReplyTime.get(senderId) < Date.now() - 15 * 1000)
                    {
                        lastAutoReplyTime.set(senderId, Date.now());
                        forgeApi.operation.sendPrivateMessageSilence(senderId, `[自动回复] ${storageContext.roaming.blacklistAutoReply}`);
                    }
                }
                return undefined;
            }
        }

        if (messageNeedBlock(senderId, content, senderName))
            return undefined;

        return data;
    }).filter(o => o != undefined).join("<");
});



toServerTrie.addPath(`{`, (_, data) =>
{
    try
    {
        let obj = JSON.parse(data);
        // console.log("send message", obj);
        let objJsob = JSON.stringify(obj);
        if (objJsob[0] == "{")
            packageData[0] = objJsob;
    }
    catch (err)
    {
    }
});



/**
 * 客户端到服务器
 * @param {[string]} data 
 */
export function toServer(data)
{
    packageData = data;
    return toServerTrie.matchPrefix(data[0]);
}

/**
 * 服务器到客户端
 * @param {[string]} data 
 */
export function toClient(data)
{
    packageData = data;
    return toClientTrie.matchPrefix(data[0]);
}