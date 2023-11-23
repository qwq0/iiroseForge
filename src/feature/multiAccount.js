import { NList } from "../../lib/qwqframe.js";
import { NEvent } from "../../lib/qwqframe.js";
import { forgeApi } from "../forgeApi/forgeApi.js";
import { protocolEvent } from "../protocol/protocolEvent.js";
import { storageContext, storageRoamingSave, storageRoamingSet } from "../storage/storage.js";
import { showInputBox } from "../ui/infobox.js";
import { showMenu } from "../ui/menu.js";
import { showNotice } from "../ui/notice.js";
import { uniqueIdentifierString } from "../util/uniqueIdentifier.js";


let waitForId = "";

export async function showMultiAccountMenu()
{
    /**
     * @param {string} uid
     */
    function showAccountMenu(uid)
    {
        showMenu([
            NList.getElement([
                "拉取此账号的配置",
                new NEvent("click", () =>
                {
                    showNotice("多账户", "正在尝试获取配置");
                    let requestId = uniqueIdentifierString();
                    forgeApi.operation.sendPrivateForgePacket(uid, {
                        plug: "forge",
                        type: "multiAccount",
                        option: "syncConfigRQ",
                        id: requestId
                    });
                    waitForId = requestId;
                })
            ]),
            NList.getElement([
                "前往我所在的房间",
                new NEvent("click", () =>
                {
                    showNotice("多账户", "正在发送命令");
                    forgeApi.operation.sendPrivateForgePacket(uid, {
                        plug: "forge",
                        type: "multiAccount",
                        option: "switchRoom",
                        roomId: forgeApi.operation.getUserRoomId()
                    });
                })
            ]),
            NList.getElement([
                "下线",
                new NEvent("click", () =>
                {
                    showNotice("多账户", "正在发送命令");
                    forgeApi.operation.sendPrivateForgePacket(uid, {
                        plug: "forge",
                        type: "multiAccount",
                        option: "quit"
                    });
                })
            ]),
            NList.getElement([
                "移除账号",
                new NEvent("click", () =>
                {
                    storageContext.roaming.myAccountList = storageContext.roaming.myAccountList.filter(o => o != uid);
                    storageRoamingSave();
                    showNotice("绑定账号", `目标账号(${uid})与当前账号(${forgeApi.operation.getUserUid()})的单向绑定已解除`);
                })
            ])
        ]);
    }

    showMenu([
        NList.getElement([
            "[ 添加账号 ]",
            new NEvent("click", async () =>
            {
                let uid = await showInputBox("添加账号", "请输入您其他账号的唯一标识\n必须双向绑定才能进行管理", true);
                if (uid != undefined)
                {
                    let myUid = forgeApi.operation.getUserUid();
                    if (uid != myUid)
                    {
                        storageContext.roaming.myAccountList.push(uid);
                        storageRoamingSave();
                        showNotice("绑定账号", `你需要同时在目标账号(${uid})上绑定当前账号(${myUid})来完成反向绑定`);
                    }
                    else
                        showNotice("无法绑定", `不能绑定此账号本身`);
                }
            }),
        ]),
        ...(Array.from(storageContext.roaming.myAccountList).map(uid =>
        {
            let userInfo = forgeApi.operation.getOnlineUserInfoById(uid);
            return NList.getElement([
                `${uid}${userInfo ? ` (${userInfo.name})` : ""}`,
                new NEvent("click", async () =>
                {
                    showAccountMenu(uid);
                }),
            ]);
        }))
    ]);
}

let registedEvent = false;
/**
 * 启用多账号
 */
export function enableMultiAccount()
{
    if (registedEvent)
        return;
    registedEvent = true;

    protocolEvent.forge.privateForgePacket.add(e =>
    {
        if (e.content.type == "multiAccount")
        {
            if (storageContext.roaming.myAccountList.indexOf(e.senderId) == -1)
                return;

            let userInfo = forgeApi.operation.getOnlineUserInfoById(e.senderId);
            let isCallback = false;

            try
            {
                switch (e.content.option)
                {
                    case "switchRoom": {
                        forgeApi.operation.changeRoom(e.content.roomId);
                        break;
                    }
                    case "quit": {
                        setTimeout(() =>
                        {
                            location.replace("about:blank");
                            window.close();
                        }, 1000);
                        break;
                    }
                    case "syncConfigRQ": {
                        let requestId = e.content.id;
                        forgeApi.operation.sendPrivateForgePacket(e.senderId, {
                            plug: "forge",
                            type: "multiAccount",
                            option: "syncConfigCB",
                            id: requestId,
                            storageObject: storageContext.roaming
                        });
                        break;
                    }
                    case "syncConfigCB": {
                        if (waitForId && e.content.id == waitForId)
                        {
                            waitForId = "";
                            /**
                             * @type {typeof storageContext.roaming}
                             */
                            let storageObj = e.content.storageObject;
                            if (storageObj)
                            {
                                if (storageObj?.userRemark)
                                { // 覆盖备注配置
                                    Object.keys(storageContext.roaming.userRemark).forEach(userId =>
                                    {
                                        if (!storageObj.userRemark[userId])
                                            storageObj.userRemark[userId] = storageContext.roaming.userRemark[userId];
                                    });
                                }
                                delete storageObj.myAccountList;
                                storageRoamingSet(storageObj);
                                storageRoamingSave();
                                showNotice("多账号", "拉取其他账号的配置成功");
                            }
                        }
                        isCallback = true;
                        break;
                    }
                }
            }
            catch (err)
            {
                console.error(err);
            }

            if (!isCallback)
                showNotice("多账号", `您的账号(${e.senderId}${userInfo ? ` - ${userInfo.name}` : ""})\n正在操作`);
        }
    });
}