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
    let referElement = iframeContext.iframeDocument?.querySelector("div#functionHolder div.functionButton.functionButtonGroup");

    let buttonBackgroundColor = (referElement ? getComputedStyle(referElement).backgroundColor : "rgb(255, 255, 255)");
    let buttonTextColor = (referElement ? getComputedStyle(referElement).color : "rgb(33, 33, 33)");

    let button = NList.getElement([
        style("backgroundColor", buttonBackgroundColor),
        style("boxShadow", "0 0 1px rgb(0,0,0,0.12),0 1px 1px rgb(0,0,0,0.24)"),
        style("position", "relative"),
        style("zIndex", "1"),

        style("color", buttonTextColor),
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
            iframeContext.iframeWindow?.["functionHolderDarker"]?.click();
            iframeContext.iframeBody.addChild(getForgeMenu());
        }),

        new NEvent("mouseenter", (_e, ele) =>
        {
            if (ele.getStyle("backgroundColor") == "transparent")
            {
                buttonBackgroundColor = "transparent";
                ele.setStyle("backgroundColor", "rgba(127, 127, 127, 0.3)");
            }
            else
                ele.setStyle("backgroundColor", (
                    (
                        buttonBackgroundColor == "#202020" ||
                        buttonBackgroundColor == "rgb(32, 32, 32)"
                    ) ?
                        "rgb(42, 42, 42)" :
                        "rgb(245, 245, 245)"
                ));
            iframeContext.iframeWindow?.["Utils"]?.Sound?.play?.(0);
        }),
        new NEvent("mouseleave", (_e, ele) =>
        {
            ele.setStyle("backgroundColor", buttonBackgroundColor);
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