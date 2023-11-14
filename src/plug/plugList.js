import { SandboxContext } from "../../lib/iframeSandbox.js";
import { NElement } from "../../lib/qwqframe.js";
import { storageContext, storageRoamingSave } from "../storage/storage.js";
import { showNotice } from "../ui/notice.js";
import { loadPlugIn } from "./plug.js";

/**
 * 插件列表
 */
class PlugList
{
    /**
     * @type {Map<string, { url: string, sandbox: SandboxContext, windowElement: NElement, operationPermissionSet: Set, eventPermissionSet: Set }>}
     */
    map = new Map();

    /**
     * 添加插件
     * @param {string} name
     * @param {string} url
     * @param {{operationPermissionSet: Set, eventPermissionSet: Set }} [permission]
     */
    async addPlug(name, url, permission)
    {
        if (!this.map.has(name))
            this.map.set(name, { url: url, ...(await loadPlugIn(name, url, permission)) });
    }

    /**
     * 显示插件窗口
     * @param {string} name 
     */
    showPlugWindow(name)
    {
        if (this.map.has(name))
        {
            let windowElement = this.map.get(name).windowElement;
            windowElement.setDisplay("block");
            windowElement.setStyle("pointerEvents", "auto");
        }
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
         * @type {Array<[string, string, Array<string>, Array<string>]>}
         */
        let plugInfo = [];
        this.map.forEach((o, name) =>
        {
            plugInfo.push([
                name,
                o.url,
                Array.from(o.operationPermissionSet.values()),
                Array.from(o.eventPermissionSet.values())
            ]);
        });
        storageContext.roaming.plugInfo = plugInfo;
        storageRoamingSave();
    }

    /**
     * 读取插件列表
     */
    readPlugList()
    {
        try
        {
            let plugInfo = storageContext.roaming.plugInfo;
            if (plugInfo.length > 0)
            {
                plugInfo.forEach(([name, url, operationPermissionList, eventPermissionList]) =>
                {
                    this.addPlug(name, url, {
                        operationPermissionSet: new Set(operationPermissionList),
                        eventPermissionSet: new Set(eventPermissionList)
                    });
                });
                showNotice("iiroseForge plug-in", `已加载 ${plugInfo.length} 个插件`);
            }
        }
        catch (err)
        {
        }
    }
}

export const plugList = new PlugList();