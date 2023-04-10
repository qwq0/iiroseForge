import { SandboxContext } from "../../lib/iframeSandbox.js";
import { storageContext, storageSave } from "../storage/storage.js";
import { loadPlugIn } from "./plug.js";

/**
 * 插件列表
 */
class PlugList
{
    /**
     * @type {Map<string, { url: string, sandbox: SandboxContext }>}
     */
    map = new Map();

    /**
     * 添加插件
     * @param {string} name 
     * @param {string} url 
     */
    async addPlug(name, url)
    {
        if (!this.map.has(name))
            this.map.set(name, { url: url, sandbox: await loadPlugIn(name, url) });
    }

    /**
     * 移除插件
     * @param {string} name
     */
    removePlug(name)
    {
        if (this.map.has(name))
        {
            this.map.get(name).sandbox.destroy();
            this.map.delete(name);
        }
    }

    /**
     * 保存插件列表
     */
    savePlugList()
    {
        /**
         * @type {Array<[string, string]>}
         */
        let plugInfo = [];
        this.map.forEach((o, name) =>
        {
            plugInfo.push([name, o.url]);
        });
        storageContext.iiroseForge.plugInfo = plugInfo;
        storageSave();
    }

    /**
     * 读取插件列表
     */
    readPlugList()
    {
        try
        {
            storageContext.iiroseForge.plugInfo.forEach(([name, url]) =>
            {
                this.addPlug(name, url);
            });
        }
        catch (err)
        {
        }
    }
}

export const plugList = new PlugList();
plugList.readPlugList();