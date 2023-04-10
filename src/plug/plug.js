import { SandboxContext } from "../../lib/iframeSandbox.js";
import { apiPermission } from "../forgeApi/apiPermission.js";
import { forgeApi } from "../forgeApi/forgeApi.js";
import { showInfoBox } from "../ui/infobox.js";

/**
 * 加载插件
 * @param {string} pluginName
 * @param {string} scriptUrl
 * @returns {Promise<SandboxContext>}
 */
export async function loadPlugIn(pluginName, scriptUrl)
{
    let sandbox = new SandboxContext();
    await sandbox.waitAvailable();
    let operationPermissionSet = new Set();
    let eventPermissionSet = new Set();
    let apiBindObj = {};
    apiBindObj.applyPermission = async (operationList, eventList) =>
    {
        let permit = await showInfoBox("权限申请", ([
            `是否允许 ${pluginName} 获取以下权限?`,
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
                if (apiPermission.eventList[o])
                    eventPermissionSet.add(o);
            });
        }
        return (permit ? true : false);
    };
    Object.keys(forgeApi.operation).forEach(key =>
    {
        if (apiPermission.operation[key])
            apiBindObj[key] = (...param) =>
            {
                if (operationPermissionSet.has(key))
                    forgeApi.operation[key](...param);
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

    return sandbox;
}