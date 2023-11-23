import { iframeContext } from "../../injectIframe/iframeContext.js";
import { getNElement, NList, createNStyle as style, NTagName, NAsse, NEvent, NElement, createNStyleList as styles, mouseBind } from "../../../lib/qwqframe.js";
import { domPath } from "../../../lib/plugToolsLib.js";
import { className } from "../../ui/className.js";
import { NAttr } from "../../../lib/qwqframe.js";
import { ForgeSuperMenu } from "./ForgeSuperMenu.js";
import { ForgeSuperMenuColumn } from "./ForgeSuperMenuColumn.js";
import { forgeApi } from "../../forgeApi/forgeApi.js";
import { touchBind } from "../../../lib/qwqframe.js";

/**
 * 启用超级菜单
 */
export function enableSuperMenu()
{
    let supperMenuDisplay = false;
    /**
     * @type {null | number | NodeJS.Timeout}
     */
    let supperMenuDisplayTimeOutId = null;

    let supperMenu = new ForgeSuperMenu();

    let leftColumn = new ForgeSuperMenuColumn();
    let midColumn = new ForgeSuperMenuColumn();
    let rightColumn = new ForgeSuperMenuColumn();

    supperMenu.addColumn(leftColumn);
    supperMenu.addColumn(midColumn);
    supperMenu.addColumn(rightColumn);
    supperMenu.setCurrentColumn(1);

    /**
     * 刷新列表项
     */
    function refreshListItem()
    {
        // 中间的列表
        {
            midColumn.clearChild();
            let currentIndex = 0;
            let nowIndex = 0;
            Array.from(
                iframeContext.iframeDocument.querySelector("div#sessionHolder > div.sessionHolderPmTaskBox")?.children
            ).forEach(o =>
            {
                if (o.classList.contains("sessionHolderPmTaskBoxItem"))
                {
                    let copyElement = /** @type {HTMLElement} */(o.cloneNode(true));
                    copyElement.classList.remove("whoisTouch2");
                    let onClick = copyElement.onclick;
                    copyElement.removeAttribute("onclick");
                    copyElement.removeAttribute("oncontextmenu");
                    midColumn.addChild(getNElement(copyElement), () =>
                    {
                        onClick.call(o, new MouseEvent(""));
                    });

                    let cornerMark =  /** @type {HTMLElement} */(domPath(o, [-1]));
                    if (cornerMark.style.display != "none" && cornerMark.innerText == "@")
                        currentIndex = nowIndex;
                    nowIndex++;
                }
            });
            midColumn.currentRowIndex = currentIndex;
        }
        // 右侧的列表
        {
            rightColumn.clearChild();

            let nowRoomId = forgeApi.operation.getUserRoomId();
            rightColumn.addChild(createRoomListItemById(nowRoomId), () => { });
            try
            {
                /** @type {Array<string>} */
                let roomHistory = JSON.parse(localStorage.getItem("database"))?.["roomHistory"]?.split?.(",");
                if (roomHistory)
                    roomHistory.forEach(o =>
                    {
                        if (o != nowRoomId)
                            rightColumn.addChild(createRoomListItemById(o, "历史"), () =>
                            {
                                forgeApi.operation.switchRoom(o);
                            });
                    });
            }
            catch (err)
            {
                console.error("forge supper menu:", err);
            }

            rightColumn.currentRowIndex = 0;
        }
        // 左侧的列表
        {
            leftColumn.clearChild();

            leftColumn.addChild(createListItem("", "无动作", ""), () => { });
            leftColumn.addChild(createListItem("mdi-mailbox", "打开信箱", ""), () =>
            {
                iframeContext.iframeWindow?.["functionBtnDo"]?.(2);
            });
            leftColumn.addChild(createListItem("mdi-music", "切换媒体开关", ""), () =>
            {
                iframeContext.iframeWindow?.["functionBtnDo"]?.(90);
            });
            leftColumn.addChild(createListItem("mdi-music-box-multiple", "打开播放列表", ""), () =>
            {
                iframeContext.iframeWindow?.["functionBtnDo"]?.(1, iframeContext.iframeDocument?.createElement("div"));
            });
            leftColumn.addChild(createListItem("mdi-store", "打开商店", ""), () =>
            {
                iframeContext.iframeWindow?.["functionBtnDo"]?.(10, iframeContext.iframeDocument?.createElement("div"));
            });
            leftColumn.addChild(createListItem("mdi-camera-iris", "打开朋友圈", ""), () =>
            {
                iframeContext.iframeWindow?.["functionBtnDo"]?.(5);
            });
            leftColumn.addChild(createListItem("mdi-forum", "打开论坛", ""), () =>
            {
                iframeContext.iframeWindow?.["functionBtnDo"]?.(3);
            });
            leftColumn.addChild(createListItem("mdi-clipboard-check-multiple", "打开任务版", ""), () =>
            {
                iframeContext.iframeWindow?.["functionBtnDo"]?.(4);
            });

            leftColumn.currentRowIndex = 0;
        }

        supperMenu.setCurrentColumn(1);
    }

    /**
     * @param {{ movementX: number, movementY: number }} e
     */
    let mouseMove = (e) =>
    {
        if (supperMenuDisplay)
            supperMenu.menuPointerMove(e.movementX, e.movementY);
    };

    iframeContext.iframeWindow.addEventListener("mousedown", e =>
    {
        if (e.button != 2)
            return;
        if (supperMenuDisplay)
            return;
        supperMenuDisplayTimeOutId = setTimeout(() =>
        {
            supperMenuDisplay = true;
            supperMenuDisplayTimeOutId = null;
            refreshListItem();
            supperMenu.menuPointerReset();
            supperMenu.show();
            iframeContext.iframeWindow.addEventListener("mousemove", mouseMove, true);
            supperMenu.menuElement.element.requestPointerLock({
                unadjustedMovement: true
            });
        }, 125);
    }, true);
    iframeContext.iframeWindow.addEventListener("mouseup", e =>
    {
        if (e.button != 2)
            return;
        if (supperMenuDisplayTimeOutId != null)
        {
            clearTimeout(supperMenuDisplayTimeOutId);
            supperMenuDisplayTimeOutId = null;
        }
        if (!supperMenuDisplay)
            return;
        supperMenu.triggerCurrent();
        iframeContext.iframeWindow.removeEventListener("mousemove", mouseMove, true);

        document.exitPointerLock();
        iframeContext.iframeDocument.exitPointerLock();

        setTimeout(() =>
        {
            supperMenuDisplay = false;
            supperMenu.hide();
        }, 10);
    }, true);

    if (iframeContext.iframeWindow?.["isMobile"])
    { // 适配手机版
        touchBind(getNElement(iframeContext.iframeDocument.body), e =>
        {
            if (supperMenuDisplay)
            {
                mouseMove({
                    movementX: e.vx * 1.8,
                    movementY: e.vy * 1.8
                });
                if (!e.hold)
                    setTimeout(() =>
                    {
                        supperMenu.triggerCurrent();
                        supperMenuDisplay = false;
                        supperMenu.hide();
                    }, 10);
            }
        }, false);
        let msgholderElement = iframeContext.iframeDocument.getElementById("msgholder");
        msgholderElement?.addEventListener("contextmenu", e =>
        {
            let target = /** @type {HTMLElement} */(e.target);
            if (
                (
                    target.classList.contains("fullBox") ||
                    target.classList.contains("pubMsgTime")
                ) &&
                (
                    target == msgholderElement ||
                    target.parentElement == msgholderElement ||
                    target.parentElement?.parentElement == msgholderElement ||
                    target.parentElement?.parentElement?.parentElement == msgholderElement
                )
            )
            {
                e.stopImmediatePropagation();
                supperMenuDisplay = true;
                refreshListItem();
                supperMenu.menuPointerReset();
                supperMenu.show();
            }
        }, true);
    }
}


/**
 * 通过房间id创建列表项
 * @param {string} roomId 
 * @param {string} [addition]
 * @returns 
 */
function createRoomListItemById(roomId, addition = "")
{
    let roomInfo = forgeApi.operation.getRoomInfoById(roomId);
    if (roomInfo)
        return createListItem(
            "http" + roomInfo.roomImage,
            roomInfo.name,
            roomInfo.description,
            (roomInfo.currentUserNum != "hidden" ? `${roomInfo.currentUserNum}人` : "隐藏人数"),
            addition,
            `rgba(${roomInfo.color}, 0.8)`
        );
    else
        return createListItem(
            "",
            "不存在的房间",
            "",
            "",
            "",
            `rgba(0, 0, 0, 0.8)`
        );
}

/**
 * 创建列表项
 * @param {string} image
 * @param {string} title
 * @param {string} text
 * @param {string} [addition]
 * @param {string} [cornerMark]
 * @returns {NElement}
 */
function createListItem(image, title, text, addition = "", cornerMark = "", color = "rgba(240, 240, 240, 0.8)")
{
    /**
     * 检测是亮色或暗色
     * @param {string} colorStr
     */
    function rgbLightOrDark(colorStr)
    {
        let braceIndex = color.indexOf("(");
        if (braceIndex != -1)
            colorStr = colorStr.slice(braceIndex + 1, colorStr.lastIndexOf(")"));
        let part = colorStr.split(",").map(o => Number.parseInt(o));
        return (part[0] * 0.299 + part[1] * 0.587 + part[2] * 0.114 > 186);
    }

    let textColor = (rgbLightOrDark(color) ? "rgba(0, 0, 0, 0.75)" : "rgba(255, 255, 255, 0.75)");
    return NList.getElement([
        className("sessionHolderPmTaskBoxItem"),
        styles({
            backgroundColor: color,
            color: textColor
        }),
        [
            styles({
                height: "100px",
                width: "100px",
                position: "relative",
                WebkitMaskImage: "linear-gradient(to right,#000 50%,transparent)",
                display: (image ? "block" : "none")
            }),
            [
                className("bgImgBox"),
                (
                    image.startsWith("mdi-") ?
                        [
                            styles({
                                width: "100%",
                                height: "100%",
                                textAlign: "center"
                            }),
                            [
                                styles({
                                    lineHeight: "100px",
                                    fontSize: "50px",
                                    fontFamily: "md",
                                    height: "100%",
                                }),
                                className(image),
                                new NTagName("span"),
                            ]
                        ] :
                        [
                            className("bgImg"),
                            new NTagName("img"),
                            new NAttr("loading", "lazy"),
                            new NAttr("decoding", "async"),
                            new NAttr("src", image),
                        ]
                ),
                [
                    className("fullBox")
                ]
            ]
        ],
        [
            styles({
                height: "100%",
                position: "absolute",
                top: "0",
                left: "100px",
                right: "0"
            }),
            [
                className("sessionHolderPmTaskBoxItemName textOverflowEllipsis"),
                [
                    styles({
                        fontSize: "inherit",
                        fontWeight: "inherit"
                    }),
                    title
                ]
            ],
            [
                className("sessionHolderPmTaskBoxItemTime textOverflowEllipsis"),
                addition
            ],
            [
                className("sessionHolderPmTaskBoxItemMsg textOverflowEllipsis"),
                text
            ]
        ],
        [
            styles({
                position: "absolute",
                top: "1px",
                right: "1px",
                backgroundColor: textColor,
                color: color,
                fontSize: "16px",
                fontWeight: "bold",
                padding: "0px 8px",
                height: "26.5px",
                lineHeight: "26.5px",
                transition: "transform 0.25s ease 0s",
                borderRadius: "0px 0px 0px 2px",
                display: (cornerMark ? "block" : "none")
            }),
            cornerMark
        ]
    ]);
}