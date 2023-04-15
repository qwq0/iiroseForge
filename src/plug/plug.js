import { apiPermission } from "../forgeApi/apiPermission.js";
import { forgeApi } from "../forgeApi/forgeApi.js";
import { showInfoBox } from "../ui/infobox.js";
import { plugList } from "./plugList.js";
import { createPlugSandboxWithWindow } from "./plugWindow.js";

/**
 * 加载插件
 * @param {string} plugName
 * @param {string} scriptUrl
 * @param {{operationPermissionSet: Set, eventPermissionSet: Set }} [permission]
 */
export async function loadPlugIn(plugName, scriptUrl, permission)
{
    let { sandbox, windowElement } = createPlugSandboxWithWindow();
    await sandbox.waitAvailable();
    let operationPermissionSet = (permission?.operationPermissionSet ? permission?.operationPermissionSet : new Set());
    let eventPermissionSet = (permission?.eventPermissionSet ? permission?.eventPermissionSet : new Set());
    let apiBindObj = {};
    /**
     * 申请权限
     * @param {Array<string>} operationList 
     * @param {Array<string>} eventList 
     * @returns {Promise<boolean>}
     */
    apiBindObj.applyPermission = async (operationList, eventList) =>
    {
        operationList = operationList.filter(o => Boolean(apiPermission.operation[o]));
        eventList = eventList.filter(o => Boolean(apiPermission.event[o]));
        if (operationList.every(o => operationPermissionSet.has(o)) && eventList.every(o => eventPermissionSet.has(o)))
            return true;
        let permit = await showInfoBox("权限申请", ([
            `是否允许 ${plugName} 获取以下权限?`,
            ...operationList.map(o => "+ " + apiPermission.operation[o]),
            ...eventList.map(o => "+ " + apiPermission.event[o])
        ]).join("\n"), true);
        if (permit)
        {
            operationList.forEach(o =>
            {
                if (apiPermission.operation[o])
                    operationPermissionSet.add(o);
            });
            eventList.forEach(o =>
            {
                if (apiPermission.event[o])
                    eventPermissionSet.add(o);
            });
            plugList.savePlugList();
        }
        return (permit ? true : false);
    };
    Object.keys(forgeApi.operation).forEach(key =>
    {
        if (apiPermission.operation[key])
            apiBindObj[key] = (...param) =>
            {
                if (operationPermissionSet.has(key))
                {
                    try
                    {
                        forgeApi.state.plug = { name: plugName };
                        let ret = forgeApi.operation[key](...param);
                        forgeApi.state.plug = null;
                        return ret;
                    }
                    catch (err)
                    {
                        forgeApi.state.plug = null;
                        return undefined;
                    }
                }
            };
    });
    apiBindObj.addEventListener = (eventName, callback) =>
    {
        if (apiPermission.event[eventName] && forgeApi.event[eventName] && eventPermissionSet.has(eventName))
            forgeApi.event[eventName].add(callback);
    };
    sandbox.apiObj = {
        iiroseForge: apiBindObj
    };
    let scriptCode = await (await fetch(scriptUrl)).text();
    sandbox.execJs(scriptCode);

    return {
        sandbox: sandbox,
        windowElement: windowElement,
        operationPermissionSet: operationPermissionSet,
        eventPermissionSet: eventPermissionSet
    };
}