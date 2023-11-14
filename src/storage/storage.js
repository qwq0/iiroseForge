import { createHookObj } from "../../lib/qwqframe.js";
import { showNotice } from "../ui/notice.js";

/**
 * 储存上下文
 * 将使用json进行序列化
 */
export const storageContext = {
    roaming: {
        /**
         * 插件信息
         * @type {Array<[string, string, Array<string>, Array<string>]>}
         */
        plugInfo: [],
        /**
         * 侧载脚本
         * @type {Array<[string, string, boolean]>}
         */
        sideLoadedScript: [],
        /**
         * 用户备注
         * 用户uid 到 用户备注
         * @type {Object<string, string>}
         */
        userRemark: {}
    },
    local: {
        enableSyncChatRecord: false,
        enableUserRemark: true,
        lastCloseTime: 0,
        syncChatRecordTo: 0
    }
};

/**
 * 设置储存
 * @param {Object} storageObj
 */
export function storageRoamingSet(storageObj)
{
    try
    {
        Object.keys(storageObj).forEach(key =>
        {
            storageContext.roaming[key] = storageObj[key];
        });
        Object.keys(storageContext.roaming).forEach(key =>
        {
            if (
                typeof (storageContext.roaming[key]) == "object" &&
                !Array.isArray(storageContext.roaming[key])
            )
                storageContext.roaming[key] = createHookObj(storageContext.roaming[key]);
        });
    }
    catch (err)
    {
        showNotice("错误", "无法设置储存 这可能导致iiroseForge配置丢失");
    }
}

export function storageRoamingRead()
{
    try
    {
        let storageJson = localStorage.getItem("iiroseForge");
        let storageObj = (storageJson ? JSON.parse(storageJson) : {});
        storageRoamingSet(storageObj);
    }
    catch (err)
    {
        showNotice("错误", "无法读入储存 这可能导致iiroseForge配置丢失");
    }
}

export function storageRoamingSave()
{
    try
    {
        let storageJson = JSON.stringify(storageContext.roaming);
        localStorage.setItem("iiroseForge", storageJson);
    }
    catch (err)
    {
        showNotice("错误", "无法写入储存 这可能导致iiroseForge配置丢失");
    }
}

export function storageLocalRead()
{
    try
    {
        let storageJson = localStorage.getItem("iiroseForgeLocal");
        let storageObj = (storageJson ? JSON.parse(storageJson) : {});
        Object.keys(storageObj).forEach(key =>
        {
            storageContext.local[key] = storageObj[key];
        });
    }
    catch (err)
    {
        showNotice("错误", "无法读入本地储存 这可能导致iiroseForge配置丢失");
    }
}

export function storageLocalSave()
{
    try
    {
        let storageJson = JSON.stringify(storageContext.local);
        localStorage.setItem("iiroseForgeLocal", storageJson);
    }
    catch (err)
    {
        showNotice("错误", "无法写入本地储存 这可能导致iiroseForge配置丢失");
    }
}