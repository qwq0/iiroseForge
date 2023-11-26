import { cssG, expandElement, NElement } from "../../lib/qwqframe.js";
import { body } from "./body.js";
import { buttonAsse } from "./button.js";

/**
 * 显示菜单
 * @async
 * @param {Array<NElement>} menuItems
 * @returns {Promise<boolean>}
 */
export function showMenu(menuItems)
{
    return new Promise(resolve =>
    {
        /**
         * @type {NElement}
         */
        var menu = null;
        var menuHolder = expandElement({ // 背景
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
            child: [{ // 菜单
                style: {
                    border: "1px white solid",
                    backgroundColor: cssG.rgb(255, 255, 255, 0.95),
                    color: cssG.rgb(0, 0, 0),
                    alignItems: "stretch",
                    justifyContent: "center",
                    flexFlow: "column",
                    lineHeight: "45px",
                    minHeight: "10px",
                    minWidth: "280px",
                    maxHeight: "100%",
                    maxWidth: "95%",
                    overflowY: "auto",
                    scrollbarWidth: "none",
                    boxSizing: "border-box",
                    padding: "10px",
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
                    e.getChilds().forEach(o =>
                    {
                        o.addEventListener("click", closeMenuBox);
                        buttonAsse(o);
                    });
                }, e => { menu = e; }],
                position$: "static",
                overflow: "auto",
                child: menuItems,
                event: {
                    click: e => { e.stopPropagation(); }
                }
            }],
            event: {
                click: closeMenuBox
            }
        });
        function closeMenuBox()
        {
            menu.setStyle("pointerEvents", "none");
            menu.animate([
                {
                },
                {
                    transform: "scale(0.9) translateY(-100px)"
                }
            ], {
                duration: 120,
                fill: "forwards"
            });
            menuHolder.animate([
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
                menuHolder.remove();
            }, 120);
        }
        body.addChild(menuHolder);
    });
}