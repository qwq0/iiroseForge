import { forgeApi } from "../forgeApi/forgeApi";
import { protocolEvent } from "../protocol/protocolEvent";
import { storageContext, storageRoamingSave, storageRoamingSet } from "../storage/storage";
import { showNotice } from "../ui/notice";
import { uniqueIdentifierString } from "../util/uniqueIdentifier";

let waitForId = "";

/**
 * 尝试同步配置
 */
export function trySyncConfig()
{
    let requestId = uniqueIdentifierString();
    forgeApi.operation.sendSelfPrivateForgePacket({
        plug: "forge",
        type: "syncConfigRQ",
        id: requestId
    });
    waitForId = requestId;
}

let registedReturnConfig = false;
/**
 * 启用配置同步
 */
export function enableSyncConfig()
{
    if (registedReturnConfig)
        return;
    registedReturnConfig = true;
    protocolEvent.forge.selfPrivateForgePacket.add(e =>
    {
        if (waitForId)
        {
            if (e.content.type == "syncConfigCB" && e.content.id == waitForId)
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
                    storageRoamingSet(storageObj);
                    storageRoamingSave();
                    showNotice("配置同步", "拉取配置成功");
                }
            }
        }

        if (e.content.type == "syncConfigRQ")
        {
            let requestId = e.content.id;
            forgeApi.operation.sendSelfPrivateForgePacket({
                plug: "forge",
                type: "syncConfigCB",
                id: requestId,
                storageObject: storageContext.roaming
            });
            showNotice("配置同步", "其他设备正在拉取本机配置");
        }
    });
}