import { globalState } from "../globalState";
import { iframeContext } from "../injectIframe/iframeContext";

export let debugModeContext = {
    /**
     * 发送数据包
     * @param {string} packet 
     */
    send: (packet) =>
    {
        iframeContext.socketApi.send(packet);
    },

    /**
     * 模拟客户端发送数据包
     * @param {string} packet 
     */
    clientSend: (packet) =>
    {
        iframeContext.socket.send(packet);
    },

    /**
     * 模拟收到数据包
     * @param {string} packet 
     */
    receive: (packet) =>
    {
        iframeContext.socket._onmessage(packet);
    },
};

/**
 * 启用调试模式
 * @param {Boolean} enable 
 */
export function enableForgeDebugMode(enable)
{
    enable = Boolean(enable);

    globalState.debugMode = enable;

    if (enable)
    {
        window["fdb"] = debugModeContext;
        if (iframeContext.iframeWindow)
            iframeContext.iframeWindow["fdb"] = debugModeContext;
    }
    else
    {
        if (window["fdb"])
            delete window["fdb"];
        if (iframeContext.iframeWindow?.["fdb"])
            delete iframeContext.iframeWindow["fdb"];
    }
}