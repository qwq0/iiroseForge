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
 * @param {Function} [callback]
 */
export function showNotice(title, text, additional = "iiroseForge", callback = null)
{
    let notice = expandElement({
        style: {
            backgroundColor: cssG.rgb(255, 255, 255, 0.5),
            backdropFilter: "blur(2px)",
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
            boxShadow: `${cssG.rgb(0, 0, 0, 0.35)} 5px 5px 10px`
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
                fontWeight: "bolder",
                textShadow: "0px 0px 5px rgb(255, 255, 255), 0px 0px 3px rgba(255, 255, 255, 0.7)"
            }
        }, { // 通知正文
            text: text,
            style: {
                textShadow: "0px 0px 5px rgb(255, 255, 255), 0px 0px 3px rgba(255, 255, 255, 0.7)"
            }
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
                click: (/** @type {Event} */e) =>
                {
                    e.stopPropagation();
                    closeThisNotice();
                }
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

    let startClosing = false;
    function closeThisNotice()
    {
        if (startClosing)
            return;
        startClosing = true;
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
    }, 2500 + Math.min(15 * 1000, text.length * 255));

    if (callback)
    {
        notice.asse(buttonAsse);
        notice.addEventListener("click", () =>
        {
            if (!startClosing)
            {
                callback();
                closeThisNotice();
            }
        });
    }
}