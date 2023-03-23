import { iframeCt } from "../injectIframe/initInjectIframe";

export function runCommand(command)
{
    if (iframeCt.iframeWindow.Probe.init.shellHolder)
        iframeCt.iframeWindow.Init.movePanel(6);
    let inputBox = getNode(shellHolder, [2, 0, -1, 0]);
    let old = inputBox.value;
    inputBox.value = command;
    inputBox.oninput();
    inputBox.dispatchEvent(new KeyboardEvent("keydown", { keyCode: 13 }));
    inputBox.value = old;
}