import { iframeContext } from "../../injectIframe/iframeContext.js";
import { getNElement, NList, createNStyle as style, NTagName, NAsse, NEvent, NElement, createNStyleList as styles, mouseBind } from "../../../lib/qwqframe.js";
import { domPath } from "../../../lib/plugToolsLib.js";
import { className } from "../../ui/className.js";
import { NAttr } from "../../../lib/qwqframe.js";
import { ForgeSuperMenu } from "./ForgeSuperMenu.js";
import { ForgeSuperMenuColumn } from "./ForgeSuperMenuColumn.js";
import { forgeApi } from "../../forgeApi/forgeApi.js";

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
                    copyElement.onclick = null;
                    copyElement.oncontextmenu = null;
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
            leftColumn.currentRowIndex = 0;
        }

        supperMenu.setCurrentColumn(1);
    }

    let mouseMove = (/** @type {MouseEvent} */ e) =>
    {
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
        iframeContext.iframeWindow.removeEventListener("mousemove", mouseMove, true);
        supperMenu.triggerCurrent();

        document.exitPointerLock();
        iframeContext.iframeDocument.exitPointerLock();

        setTimeout(() =>
        {
            supperMenuDisplay = false;
            supperMenu.hide();
        }, 10);
    }, true);
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
    return createListItem("http" + roomInfo.roomImage, roomInfo.name, roomInfo.description, "", addition, `rgba(${roomInfo.color}, 0.8)`);
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
        className("sessionHolderPmTaskBoxItem whoisTouch2"),
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
                [
                    className("bgImg"),
                    new NTagName("img"),
                    new NAttr("loading", "lazy"),
                    new NAttr("decoding", "async"),
                    new NAttr("src", image),
                ],
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