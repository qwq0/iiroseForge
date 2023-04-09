import { NAsse, NElement } from "../../lib/qwqframe.js";

/**
 * 生成添加类名的流水线
 * @param {string} classNameStr
 */
export function className(classNameStr)
{
    let classList = classNameStr.split(" ");
    return new NAsse((/** @type {NElement} */e) =>
    {
        classList.forEach(o =>
        {
            (/** @type {HTMLElement} */(e.element)).classList.add(o);
        });
    });
}