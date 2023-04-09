import { SandboxContext } from "../../lib/iframeSandbox.js";

/**
 * 加载插件
 * @param {string} name
 * @param {string} scriptUrl
 */
export async function loadPlugIn(name, scriptUrl)
{
    let sandbox = new SandboxContext();
    await sandbox.waitAvailable();
    let apiBindObj = {};
    sandbox.apiObj = {
        iiroseForge: apiBindObj
    };
    let scriptCode = await (await fetch(scriptUrl)).text();
    sandbox.execJs(scriptCode);
}