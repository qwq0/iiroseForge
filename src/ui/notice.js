import { cssG, expandElement, runOnce } from "../../lib/qwqframe.js";
import { body } from "./body.js";
import { buttonAsse } from "./button.js";

var noticeContainer = expandElement({
    position: "absolute",
    right: "0px",
    style: {
        userSelect: "none",
        pointerEvents: "none",
        zIndex: "30000"
    }
});
body.addChild(noticeContainer);

/**
 * 推送通知
 * @param {string} title 
 * @param {string} text 
 * @param {string} [additional]
 */
export function showNotice(title, text, additional = "iiroseForge")
{
    var notice = expandElement({
        style: {
            backgroundColor: cssG.rgb(255, 255, 255, 0.95),
            marginRight: "1em",
            marginTop: "1em",
            marginLeft: "1em",
            float: "right",
            clear: "both",
            overflow: "hidden hidden",
            padding: "1em",
            boxSizing: "border-box",
            minWidth: "180px",
            borderRadius: "0.2em",
            boxShadow: `${cssG.rgb(0, 0, 0, 0.5)} 5px 5px 10px`
        },
        position: "relative",
        child: [{ // 通知图标
            tagName: "i",
            classList: ["fa", "fa-info-circle"]
        }, { // 通知标题
            text: title,
            style: {
                fontSize: "1.2em",
                lineHeight: "1.5em",
                fontWeight: "bolder"
            }
        }, { // 通知正文
            text: text
        }, { // 通知附加内容
            text: additional,
            style: {
                fontSize: "0.9em",
                float: "right"
            }
        }, { // 通知右上角关闭按钮
            text: "×",
            position: "absolute",
            right: "4px",
            top: "1px",
            assembly: [buttonAsse],
            style: {
                fontSize: "25px",
                lineHeight: "1em"
            },
            event: {
                click: runOnce(() =>
                {
                    closeThisNotice();
                })
            }
        }]
    });
    noticeContainer.addChild(notice);
    notice.animate([
        {
            transform: "translateX(180%) translateY(10%) scale(0.6)"
        },
        {
        }
    ], {
        duration: 180
    });
    setTimeout(() => { notice.setStyle("pointerEvents", "auto"); }, 180);

    function closeThisNotice()
    {
        notice.setStyle("pointerEvents", "none");
        notice.animate([
            {
            },
            {
                transform: "translateX(180%)"
            }
        ], {
            duration: 270,
            fill: "forwards"
        });
        setTimeout(() =>
        {
            notice.setStyle("visibility", "hidden");
            notice.animate([
                {
                    height: (/** @type {HTMLDivElement} */(notice.element)).clientHeight + "px"
                },
                {
                    marginTop: 0,
                    height: 0,
                    padding: 0
                }
            ], {
                duration: 150,
                fill: "forwards"
            });
            setTimeout(() =>
            {
                notice.remove();
            }, 150);
        }, 270);
    }

    setTimeout(() =>
    {
        closeThisNotice();
    }, 3900 + Math.min(10000, text.length * 115));
}