import { domPath } from "../../lib/plugToolsLib.js";
import { iframeContext } from "../injectIframe/iframeContext.js";

/**
 * 在 蔷薇终端 中运行命令
 * @param {string} command
 */
export function runTerminalCommand(command)
{
    if (iframeContext.iframeWindow?.["Probe"]?.init?.shellHolder)
        iframeContext.iframeWindow?.["Init"]?.movePanel(6);
    let inputBox = /** @type {HTMLInputElement} */(domPath(iframeContext.iframeDocument.getElementById("shellHolder"), [2, 0, -1, 0]));
    let old = inputBox.value;
    inputBox.value = command;
    inputBox.oninput(null);
    inputBox.dispatchEvent(new KeyboardEvent("keydown", { keyCode: 13 }));
    inputBox.value = old;
}