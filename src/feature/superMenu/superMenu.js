import { iframeContext } from "../../injectIframe/iframeContext.js";
import { getNElement, NList, createNStyle as style, NTagName, NAsse, NEvent, NElement, createNStyleList as styles, mouseBind } from "../../../lib/qwqframe.js";
import { domPath } from "../../../lib/plugToolsLib.js";
import { className } from "../../ui/className.js";
import { NAttr } from "../../../lib/qwqframe.js";
import { ForgeSuperMenu } from "./ForgeSuperMenu.js";
import { ForgeSuperMenuColumn } from "./ForgeSuperMenuColumn.js";
import { forgeApi } from "../../forgeApi/forgeApi.js";
import { touchBind } from "../../../lib/qwqframe.js";
import { showMenu } from "../../ui/menu.js";
import { storageContext, storageLocalSave } from "../../storage/storage.js";

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
     * 当前选择被取消
     */
    let canceled = false;

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

            /**
             * @type {Array<{ id?: string, item: any, execute: () => void }>}
             */
            let menuList = [];

            let nowRoomId = forgeApi.operation.getUserRoomId();
            menuList.push({
                item: createRoomListItemById(nowRoomId),
                execute: () => { }
            });

            try
            {
                /** @type {Array<string>} */
                let roomHistory = JSON.parse(localStorage.getItem("database"))?.["roomHistory"]?.split?.(",");
                if (roomHistory)
                    roomHistory.forEach(o =>
                    {
                        if (o != nowRoomId)
                            menuList.push({
                                id: o,
                                item: createRoomListItemById(o, "历史"),
                                execute: () =>
                                {
                                    forgeApi.operation.switchRoom(o);
                                }
                            });
                    });
            }
            catch (err)
            {
                console.error("forge supper menu:", err);
            }

            createSortableList(menuList, rightColumn, "right");
        }
        // 左侧的列表
        {
            leftColumn.clearChild();

            let menuList = [
                {
                    item: createListItem("", "无动作", ""),
                    execute: () => { }
                },
                {
                    id: "信箱",
                    item: createListItem("mdi-mailbox", "打开信箱", ""),
                    execute: () =>
                    {
                        iframeContext.iframeWindow?.["functionBtnDo"]?.(2);
                    }
                },
                {
                    id: "媒体开关",
                    item: createListItem("mdi-music", "切换媒体开关", ""),
                    execute: () =>
                    {
                        iframeContext.iframeWindow?.["functionBtnDo"]?.(90);
                    }
                },
                {
                    id: "播放列表",
                    item: createListItem("mdi-music-box-multiple", "打开播放列表", ""),
                    execute: () =>
                    {
                        iframeContext.iframeWindow?.["functionBtnDo"]?.(1, iframeContext.iframeDocument?.createElement("div"));
                    }
                },
                {
                    id: "商店",
                    item: createListItem("mdi-store", "打开商店", ""),
                    execute: () =>
                    {
                        iframeContext.iframeWindow?.["functionBtnDo"]?.(10, iframeContext.iframeDocument?.createElement("div"));
                    }
                },
                {
                    id: "朋友圈",
                    item: createListItem("mdi-camera-iris", "打开朋友圈", ""),
                    execute: () =>
                    {
                        iframeContext.iframeWindow?.["functionBtnDo"]?.(5);
                    }
                },
                {
                    id: "论坛",
                    item: createListItem("mdi-forum", "打开论坛", ""),
                    execute: () =>
                    {
                        iframeContext.iframeWindow?.["functionBtnDo"]?.(3);
                    }
                },
                {
                    id: "任务版",
                    item: createListItem("mdi-clipboard-check-multiple", "打开任务版", ""),
                    execute: () =>
                    {
                        iframeContext.iframeWindow?.["functionBtnDo"]?.(4);
                    }
                }
            ];
            createSortableList(menuList, leftColumn, "left");
        }

        supperMenu.setCurrentColumn(1);
    }

    /**
     * @param {{ movementX: number, movementY: number }} e
     */
    let mouseMove = (e) =>
    {
        if (supperMenuDisplay && !canceled)
            supperMenu.menuPointerMove(e.movementX, e.movementY);
    };
    /**
     * @param {KeyboardEvent} e
     */
    let keyDown = (e) =>
    {
        if (supperMenuDisplay && !canceled)
            switch (e.code)
            {
                case "KeyW":
                    e.preventDefault();
                    supperMenu.menuPointerMove(0, -supperMenu.cursorScaleSizeY);
                    break;
                case "KeyA":
                    e.preventDefault();
                    supperMenu.menuPointerMove(-supperMenu.cursorScaleSizeX, 0);
                    break;
                case "KeyD":
                    e.preventDefault();
                    supperMenu.menuPointerMove(supperMenu.cursorScaleSizeX, 0);
                    break;
                case "KeyS":
                    e.preventDefault();
                    supperMenu.menuPointerMove(0, supperMenu.cursorScaleSizeY);
                    break;
                case "KeyE":
                    e.preventDefault();

                    supperMenu.triggerCurrentOptionMenu();

                    iframeContext.iframeWindow.removeEventListener("mousemove", mouseMove, true);
                    iframeContext.iframeWindow.removeEventListener("keydown", keyDown, true);
                    supperMenu.hide();
                    canceled = true;
                    supperMenuDisplay = false;
                    document.exitPointerLock();
                    iframeContext.iframeDocument.exitPointerLock();
                    break;
                case "KeyQ":
                    e.preventDefault();

                    iframeContext.iframeWindow.removeEventListener("mousemove", mouseMove, true);
                    iframeContext.iframeWindow.removeEventListener("keydown", keyDown, true);
                    supperMenu.hide();
                    canceled = true;
                    document.exitPointerLock();
                    iframeContext.iframeDocument.exitPointerLock();
                    break;
            }
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
            iframeContext.iframeWindow.addEventListener("keydown", keyDown, true);
            canceled = false;
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

        e.stopPropagation();
        e.preventDefault();
        if (!canceled)
            supperMenu.triggerCurrent();
        iframeContext.iframeWindow.removeEventListener("mousemove", mouseMove, true);
        iframeContext.iframeWindow.removeEventListener("keydown", keyDown, true);

        document.exitPointerLock();
        iframeContext.iframeDocument.exitPointerLock();

        setTimeout(() =>
        {
            supperMenuDisplay = false;
            supperMenu.hide();

            document.exitPointerLock();
            iframeContext.iframeDocument.exitPointerLock();
        }, 10);
    }, true);
    iframeContext.iframeWindow.addEventListener("contextmenu", e =>
    {
        if (supperMenuDisplay)
        {
            e.stopPropagation();
            e.preventDefault();
        }
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
                        if (!canceled)
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
                canceled = false;
            }
        }, true);
    }
}

/**
 * @param {Array<{id?: string;item: any;execute: () => void;}>} menuList
 * @param {ForgeSuperMenuColumn} column
 * @param {string} columnName
 */
function createSortableList(menuList, column, columnName)
{
    menuList.sort((a, b) =>
    {
        /**
         * @param {{ id?: string }} o
         */
        function mappingPriority(o)
        {
            if (o.id == undefined)
                return 0;
            let priorityValue = storageContext.local.superMenuPriority?.[columnName]?.[o.id];
            if (priorityValue == undefined)
                return (1 << 30);
            else if (priorityValue > 0)
                return (1 << 30) - priorityValue;
            else if (priorityValue < 0)
                return (1 << 31) - priorityValue;
        }
        return mappingPriority(a) - mappingPriority(b);
    }).forEach((o, index) =>
    {
        column.addChild(
            o.item,
            o.execute,
            () =>
            {
                if (!o.id)
                    return;
                showMenu([
                    NList.getElement([
                        "置底于无动作上方",
                        new NEvent("click", () =>
                        {
                            let mapObj = storageContext.local.superMenuPriority[columnName];
                            if (!mapObj)
                            {
                                mapObj = {};
                                storageContext.local.superMenuPriority[columnName] = mapObj;
                            }
                            let minValue = 0;
                            Object.keys(mapObj).forEach(key =>
                            {
                                if (key != o.id && mapObj[key] < 0)
                                    minValue = Math.min(minValue, mapObj[key]);
                            });
                            mapObj[o.id] = minValue - 1;
                            storageLocalSave();
                        })
                    ]),
                    NList.getElement([
                        "置顶于无动作下方",
                        new NEvent("click", () =>
                        {
                            let mapObj = storageContext.local.superMenuPriority[columnName];
                            if (!mapObj)
                            {
                                mapObj = {};
                                storageContext.local.superMenuPriority[columnName] = mapObj;
                            }
                            let maxValue = 0;
                            Object.keys(mapObj).forEach(key =>
                            {
                                if (key != o.id && mapObj[key] > 0)
                                    maxValue = Math.max(maxValue, mapObj[key]);
                            });
                            mapObj[o.id] = maxValue + 1;
                            storageLocalSave();
                        })
                    ]),
                    NList.getElement([
                        "取消自定义位置",
                        new NEvent("click", () =>
                        {
                            if (storageContext.local.superMenuPriority[columnName])
                            {
                                delete storageContext.local.superMenuPriority[columnName][o.id];
                                storageLocalSave();
                            }
                        })
                    ])
                ]);
            }
        );
        if (!o.id)
            column.currentRowIndex = index;
    });
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