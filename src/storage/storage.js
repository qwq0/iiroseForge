import { showNotice } from "../ui/notice.js";

/**
 * 储存上下文
 * 将使用json进行序列化
 */
export const storageContext = {
    iiroseForge: {
        /**
         * 插件信息
         * @type {Array<[string, string]>}
         */
        plugInfo: []
    }
};

storageRead();

export function storageRead()
{
    try
    {
        let storageJson = localStorage.getItem("iiroseForge");
        if (!storageJson)
            return;
        let storageObj = JSON.parse(storageJson);
        Object.keys(storageObj).forEach(key =>
        {
            storageContext.iiroseForge[key] = storageObj[key];
        });
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