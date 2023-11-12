import { forgeApi } from "../forgeApi/forgeApi";
import { protocolEvent } from "../protocol/protocolEvent";
import { storageContext, storageSave, storageSet } from "../storage/storage";
import { showNotice } from "../ui/notice";
import { uniqueIdentifierString } from "../util/uniqueIdentifier";

let waitForId = "";

/**
 * 启用配置同步功能
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
            if (e.content?.type == "syncConfigCB" && e.content?.id == waitForId)
            {
                waitForId = "";
                /**
                 * @type {typeof storageContext.iiroseForge}
                 */
                let storageObj = e.content?.storageObject;
                if (storageObj)
                {
                    if (storageObj?.userRemark)
                    { // 覆盖备注配置
                        Object.keys(storageContext.iiroseForge.userRemark).forEach(userId =>
                        {
                            if (!storageObj.userRemark[userId])
                                storageObj.userRemark[userId] = storageContext.iiroseForge.userRemark[userId];
                        });
                    }
                    storageSet(storageObj);
                    storageSave();
                    showNotice("配置同步", "拉取配置成功");
                }
            }
        }

        if (e.content?.type == "syncConfigRQ")
        {
            let requestId = e.content?.id;
            forgeApi.operation.sendSelfPrivateForgePacket({
                plug: "forge",
                type: "syncConfigCB",
                id: requestId,
                storageObject: storageContext.iiroseForge
            });
            showNotice("配置同步", "其他设备正在拉取本机配置");
        }
    });
}