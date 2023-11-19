import { forgeApi, forgeOccupyPlugNameSet } from "../forgeApi/forgeApi.js";
import { htmlSpecialCharsDecode } from "../util/htmlSpecialChars.js";
import { Trie } from "./Trie.js";
import { readForgePacket, unfinishedSliceSymbol } from "./forgePacket.js";
import { protocolEvent } from "./protocolEvent.js";

let toServerTrie = new Trie();
let toClientTrie = new Trie();
/**
 * 数据包内容
 * 将改变实际发送或接收的包的内容
 * @type {[string]}
 */
let packageData = [""];

toClientTrie.addPath(`"`, (data) => // 房间消息
{
    packageData[0] = `"` + data.split("<").reverse().map(data =>
    {
        let part = data.split(">");
        // console.log(part);

        if (part[4] != "s" && part[3][0] != `'`)
        {
            let senderId = part[8];
            let senderName = part[2];
            let content = part[3];

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
        return data;
    }).filter(o => o != undefined).reverse().join("<");
});

toClientTrie.addPath(`""`, (data) => // 私聊消息
{
    let userId = forgeApi.operation.getUserUid();
    packageData[0] = `""` + data.split("<").map(data =>
    {
        let part = data.split(">");
        if (part[6] == "")
        {
            let senderId = part[1];
            let senderName = part[2];
            let content = part[4];

            if (part[1] != userId)
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
            else if (part[1] == userId && part[11] == userId)
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
        }
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