import { iframeContext } from "../../injectIframe/iframeContext";

export function enableQuickMenu()
{
    /**
     * @type {HTMLTextAreaElement}
     */
    // @ts-ignore
    let mainInput = iframeContext.iframeDocument.getElementById("moveinput");

    mainInput.addEventListener("keydown", () =>
    {
        let value = mainInput.value;
    }, true);
}