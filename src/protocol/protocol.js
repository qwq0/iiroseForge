import { forgeApi } from "../forgeApi/forgeApi.js";
import { Trie } from "./Trie.js";
import { readForgePacket } from "./forgePacket.js";

let toServerTrie = new Trie();
let toClientTrie = new Trie();
/**
 * 数据包内容
 * 将改变实际发送或接收的包的内容
 * @type {[string]}
 */
let packageData = [""];

toClientTrie.addPath(`"`, (data) =>
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

            let forgePacket = readForgePacket(content);
            if (forgePacket != undefined)
            {
                forgeApi.event.roomForgePacket.trigger({
                    senderId: senderId,
                    senderName: senderName,
                    content: forgePacket
                });
                // console.log("forgePacket", senderId, senderName, forgePacket);
                return undefined;
            }
            else
                forgeApi.event.roomMessage.trigger({
                    senderId: senderId,
                    senderName: senderName,
                    content: content
                });
        }
        return data;
    }).filter(o => o != undefined).reverse().join("<");
});

toClientTrie.addPath(`""`, (data) =>
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
                forgeApi.event.privateMessage.trigger({
                    senderId: senderId,
                    senderName: senderName,
                    content: content
                });
            }
            else if (part[1] == userId && part[11] == userId)
            {
                forgeApi.event.selfPrivateMessage.trigger({
                    content: part[4]
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