import { getNElement, NList, createNStyle as style, NTagName, NAsse, NEvent, NElement } from "../../lib/qwqframe.js";
import { body } from "../ui/body.js";
import { getForgeMenu } from "./forgeMenu.js";
import { iframeContext } from "./iframeContext.js";

/**
 * 获取forge按钮
 * @returns {NElement}
 */
export function getMenuButton()
{
    let button = NList.getElement([
        style("background", "#fff"),
        style("boxShadow", "0 0 1px rgb(0,0,0,0.12),0 1px 1px rgb(0,0,0,0.24)"),
        style("position", "relative"),
        style("zIndex", "1"),

        style("color", "#212121"),
        style("paddingLeft", "16px"),
        style("paddingRight", "56px"),
        style("transition", "background-color 0.1s ease 0s, color 0.1s ease 0s"),
        style("cursor", "url(images/cursor/2.cur), pointer"),
        style("width", "100%"),
        style("height", "56px"),
        style("boxSizing", "border-box"),
        style("lineHeight", "56px"),
        style("whiteSpace", "nowrap"),

        new NEvent("click", () =>
        {
            iframeContext.iframeBody.addChild(getForgeMenu());
        }),

        [
            new NTagName("span"),
            new NAsse(e => e.element.classList.add("functionBtnIcon", "mdi-anvil"))
        ],
        [
            new NTagName("span"),
            "Forge菜单",
            new NAsse(e => e.element.classList.add("functionBtnFont"))
        ],
        [
            new NTagName("span"),
            style("transform", "rotate(-90deg)"),
            new NAsse(e => e.element.classList.add("functionBtnGroupIcon"))
        ]
    ]);
    button.element.id = "iiroseForgeMenuButton";

    return button;
}