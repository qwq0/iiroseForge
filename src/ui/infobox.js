import { cssG, expandElement, NElement } from "../../lib/qwqframe.js";
import { body } from "./body.js";
import { buttonAsse } from "./button.js";

/**
 * 显示信息框
 * @async
 * @param {string} title
 * @param {string} text
 * @param {boolean} [allowCancel]
 * @param {Array<NElement>} [extraEle]
 * @returns {Promise<boolean>}
 */
export function showInfoBox(title, text, allowCancel = false, ...extraEle)
{
    return new Promise(resolve =>
    {
        /**
         * @type {NElement}
         */
        var infoBox = undefined;
        var infoBoxHolder = expandElement({ // 背景
            width: "100%", height: "100%",
            $position: "absolute",
            style: {
                userSelect: "none",
                backgroundColor: cssG.rgb(0, 0, 0, 0.7),
                alignItems: "center",
                justifyContent: "center",
                zIndex: "30001"
            },
            assembly: [e =>
            {
                e.animate([
                    {
                        opacity: 0.1
                    },
                    {
                        opacity: 1
                    }
                ], {
                    duration: 120
                });
            }],
            display: "flex",
            child: [{ // 信息框
                style: {
                    border: "1px white solid",
                    backgroundColor: cssG.rgb(255, 255, 255, 0.95),
                    color: cssG.rgb(0, 0, 0),
                    alignItems: "center",
                    justifyContent: "center",
                    flexFlow: "column",
                    lineHeight: "35px",
                    minHeight: "190px",
                    minWidth: "280px",
                    maxWidth: "95%",
                    boxSizing: "border-box",
                    padding: "20px",
                    borderRadius: "7px",
                    pointerEvents: "none"
                },
                assembly: [e =>
                {
                    e.animate([
                        {
                            transform: "scale(0.9) translateY(-100px)"
                        },
                        {
                        }
                    ], {
                        duration: 120
                    });
                    setTimeout(() => { e.setStyle("pointerEvents", "auto"); }, 120);
                }, e => { infoBox = e; }],
                position$: "static",
                display: "flex",
                child: [{
                    text: title
                }, {
                    text: text
                }, ...extraEle, {
                    text: "确定",
                    assembly: [buttonAsse],
                    event: {
                        click: () =>
                        {
                            closeInfoBox();
                            resolve(true);
                        }
                    }
                },
                (allowCancel ? {
                    text: "取消",
                    assembly: [buttonAsse],
                    event: {
                        click: () =>
                        {
                            closeInfoBox();
                            resolve(false);
                        }
                    }
                } : null)]
            }]
        });
        function closeInfoBox()
        {
            infoBox.setStyle("pointerEvents", "none");
            infoBox.animate([
                {
                },
                {
                    transform: "scale(0.9) translateY(-100px)"
                }
            ], {
                duration: 120,
                fill: "forwards"
            });
            infoBoxHolder.animate([
                {
                    opacity: 1
                },
                {
                    opacity: 0.1
                }
            ], {
                duration: 120,
                fill: "forwards"
            });
            setTimeout(() =>
            {
                infoBoxHolder.remove();
            }, 120);
        }
        body.addChild(infoBoxHolder);
    });
}

/**
 * 显示输入框
 * @async
 * @param {string} title
 * @param {string} text
 * @param {boolean} [allowCancel]
 * @param {string} [initValue]
 * @returns {Promise<string>}
 */
export async function showInputBox(title, text, allowCancel = false, initValue = "")
{
    let input = expandElement({
        tagName: "input",
        assembly: [buttonAsse],
        style: {
            textAlign: "center",
            margin: "15px"
        },
        attr: {
            value: initValue
        }
    });
    input.addEventListener("keydown", e => { e.stopPropagation(); }, true);
    setTimeout(() => input.element.focus(), 100);
    let confirm = await showInfoBox(title, text, allowCancel, input);
    return (confirm ? input.element.value : undefined);
}

/**
 * 显示复制框
 * @async
 * @param {string} title
 * @param {string} text
 * @param {string} copyText
 * @returns {Promise<string>}
 */
export async function showCopyBox(title, text, copyText)
{
    let copyTextarea = expandElement({
        tagName: "textarea",
        style: {
            resize: "none",
            height: "24em",
            width: "18em",
        }
    });
    copyTextarea.element.value = copyText;
    copyTextarea.addEventListener("keydown", e => { e.stopPropagation(); }, true);
    copyTextarea.addEventListener("input", () =>
    {
        copyTextarea.element.value = copyText;
    });
    setTimeout(() => copyTextarea.element.focus(), 100);
    let confirm = await showInfoBox(title, text, false, copyTextarea);
    return (confirm ? copyTextarea.element.value : undefined);
}

/**
 * 显示多行输入框
 * @param {string} title
 * @param {string} text
 * @param {boolean} [allowCancel]
 * @param {string} [initValue]
 * @returns {Promise<string>}
 */
export async function showTextareaBox(title, text, allowCancel = false, initValue = "")
{
    let textarea = expandElement({
        tagName: "textarea",
        style: {
            resize: "none",
            height: "24em",
            width: "19em",
        }
    });
    textarea.element.value = initValue;
    textarea.addEventListener("keydown", e => { e.stopPropagation(); }, true);
    setTimeout(() => textarea.element.focus(), 100);
    let confirm = await showInfoBox(title, text, allowCancel, textarea);
    return (confirm ? textarea.element.value : undefined);
}