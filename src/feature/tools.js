import { NElement, NEvent, NList, bindValue } from "../../lib/qwqframe.js";
import { className } from "../ui/className.js";
import { createNStyleList as styles } from "../../lib/qwqframe.js";

/**
 * 创建蔷薇菜单元素
 * @param {string} icon
 * @param {string} title
 * @param {(e: MouseEvent) => void} callback
 * @returns {NElement}
 */
export function createIiroseMenuElement(icon, title, callback)
{
    return NList.getElement([
        className("selectHolderBoxItem selectHolderBoxItemIcon"),
        [
            className(icon),
            styles({
                fontFamily: "md",
                fontSize: "28px",
                textAlign: "center",
                lineHeight: "100px",
                height: "100px",
                width: "100px",
                position: "absolute",
                top: "0",
                opacity: ".7",
                left: "0",
            })
        ],
        title,
        [
            className("fullBox whoisTouch3")
        ],
        new NEvent("click", callback)
    ]);
}