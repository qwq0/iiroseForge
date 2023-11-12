import { createHookObj } from "../../lib/qwqframe.js";
import { showNotice } from "../ui/notice.js";

/**
 * 储存上下文
 * 将使用json进行序列化
 */
export const storageContext = {
    iiroseForge: {
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
    }
};

/**
 * 设置储存
 * @param {Object} storageObj
 */
export function storageSet(storageObj)
{
    try
    {
        Object.keys(storageObj).forEach(key =>
        {
            storageContext.iiroseForge[key] = storageObj[key];
        });
        Object.keys(storageContext.iiroseForge).forEach(key =>
        {
            if (
                typeof (storageContext.iiroseForge[key]) == "object" &&
                !Array.isArray(storageContext.iiroseForge[key])
            )
                storageContext.iiroseForge[key] = createHookObj(storageContext.iiroseForge[key]);
        });
    }
    catch (err)
    {
        showNotice("错误", "无法设置储存 这可能导致iiroseForge配置丢失");
    }
}

export function storageRead()
{
    try
    {
        let storageJson = localStorage.getItem("iiroseForge");
        if (!storageJson)
            return;
        let storageObj = JSON.parse(storageJson);
        storageSet(storageObj);
    }
    catch (err)
    {
        showNotice("错误", "无法读入储存 这可能导致iiroseForge配置丢失");
    }
}

export function storageSave()
{
    try
    {
        let storageJson = JSON.stringify(storageContext.iiroseForge);
        localStorage.setItem("iiroseForge", storageJson);
    }
    catch (err)
    {
        showNotice("错误", "无法写入储存 这可能导致iiroseForge配置丢失");
    }
}