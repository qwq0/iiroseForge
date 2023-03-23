import { cssG, NElement } from "../../lib/qwqframe.js";

/**
 * 按钮流水线
 * @param {NElement} e
 */
export function buttonAsse(e)
{
    e.setStyle("transition", "transform 50ms linear, text-shadow 150ms linear");

    e.addEventListener("mousedown", () =>
    {
        e.setStyle("transform", "scale(0.95) translateY(2px)");
    });
    e.addEventListener("mouseup", () =>
    {
        e.setStyle("transform", "");
    });

    e.addEventListener("mouseenter", () =>
    {
        e.setStyle("textShadow", `0 0 0.3em ${cssG.rgb(255, 255, 255, 0.5)}`);
        e.setStyle("transform", "translateY(-1px)");
    });
    e.addEventListener("mouseleave", () =>
    {
        e.setStyle("textShadow", "");
        e.setStyle("transform", "");
    });
}