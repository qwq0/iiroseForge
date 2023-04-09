
/**
 * 使用当前页面中的输入框发送消息
 * @param {string} content
 */
export function sendMessageOnCurrentPage(content)
{
    var inputBox = /** @type {HTMLInputElement} */(document.getElementById("moveinput"));
    var old = inputBox.value;
    inputBox.value = content;
    inputBox.oninput(null);
    (/** @type {HTMLElement} */(document.getElementsByClassName("moveinputSendBtn")[0]))?.onclick(null);
    inputBox.value = old;
};