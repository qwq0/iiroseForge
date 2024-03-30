import { iframeContext } from "../injectIframe/iframeContext.js";
import { localServiceClient } from "../storage/localService/LocalServiceClient.js";
import { storageContext } from "../storage/storage.js";

let enabledLocalService = false;

/**
 * 启用本地服务
 */
export async function enableLocalService()
{
    if (enabledLocalService)
        return;
    enabledLocalService = true;

    let url = storageContext.local.localServiceUrl;
    if (url.at(-1) == "/")
        url = url.slice(0, -1);
    url += "/forgeLocalServer";

    localServiceClient.url = url;
    await localServiceClient.waitConnect();
    processingConsole(window);
}

export async function enableInsideLocalService()
{
    processingConsole(iframeContext.iframeWindow, "inside");
}

let processedConsoleSymbol = Symbol();
/**
 * 代理控制台日志
 * @param {Window | WindowProxy} globalObj
 * @param {string} [contextName]
 */
function processingConsole(globalObj, contextName = "")
{
    let consoleObj = globalObj["console"];
    if (consoleObj[processedConsoleSymbol])
        return;
    consoleObj[processedConsoleSymbol] = true;

    let oldConsoleInfo = consoleObj.info.bind(consoleObj);
    let oldConsoleLog = consoleObj.log.bind(consoleObj);
    let oldConsoleWarn = consoleObj.warn.bind(consoleObj);
    let oldConsoleError = consoleObj.error.bind(consoleObj);
    let oldConsoleDebug = consoleObj.debug.bind(consoleObj);

    consoleObj.info = (/** @type {any} */ ...param) =>
    {
        writeLogFile("info", param);
        return oldConsoleInfo(...param);
    };
    consoleObj.log = (/** @type {any} */ ...param) =>
    {
        writeLogFile("log", param);
        return oldConsoleLog(...param);
    };
    consoleObj.warn = (/** @type {any} */ ...param) =>
    {
        writeLogFile("warn", param);
        return oldConsoleWarn(...param);
    };
    consoleObj.error = (/** @type {any} */ ...param) =>
    {
        writeLogFile("error", param);
        return oldConsoleError(...param);
    };
    consoleObj.debug = (/** @type {any} */ ...param) =>
    {
        writeLogFile("debug", param);
        return oldConsoleDebug(...param);
    };

    /**
     * @param {string} type
     * @param {Array<any>} content
     */
    async function writeLogFile(type, content)
    {
        if (!localServiceClient.serviceAvailable)
            return;
        let fileName = (new Date()).toLocaleDateString().replaceAll("/", "-").replaceAll(" ", "_").replaceAll(":", "-");
        let timeStr = (new Date()).toLocaleString();
        await localServiceClient.operator.query.appendWriteFile({
            filePath: `consoleLog/${fileName}.log`,
            content: `${timeStr} [${type}${contextName ? `|${contextName}` : ""}] ${content.map(o => (o?.toString ? o.toString() : "[unknow string]")).join(" ")}\n`
        });
    }
}