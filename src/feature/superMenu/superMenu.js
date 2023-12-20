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
import { setNotDisturbMode } from "../notDisturbMode.js";
import { createListItem, createRoomListItemById, createSortableList, getSuperMenuOption } from "./superMenuTools.js";

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
                },
                {
                    id: "勿扰模式",
                    item: createListItem("mdi-bell-minus-outline", "切换勿扰模式", ""),
                    execute: () =>
                    {
                        setNotDisturbMode("switch");
                    }
                },
                {
                    id: "状态",
                    item: createListItem("mdi-human", "打开状态面板", ""),
                    execute: () =>
                    {
                        iframeContext.iframeWindow?.["functionBtnDo"]?.(51);
                    }
                },
                {
                    id: "终端",
                    item: createListItem("mdi-powershell", "打开终端", ""),
                    execute: () =>
                    {
                        iframeContext.iframeWindow?.["functionBtnDo"]?.(21);
                    }
                },
                {
                    id: "房间推荐",
                    item: createListItem("mdi-fire", "打开房间推荐", ""),
                    execute: () =>
                    {
                        iframeContext.iframeWindow?.["functionBtnDo"]?.(101);
                    }
                },
            ];
            createSortableList(menuList, leftColumn, "left");
        }

        supperMenu.setCurrentColumn(1);
    }

    /**
     * 鼠标移动事件
     * @param {{ movementX: number, movementY: number }} e
     */
    let mouseMove = (e) =>
    {
        if (supperMenuDisplay && !canceled)
            supperMenu.menuPointerMove(e.movementX, e.movementY);
    };
    /**
     * 键盘操作事件
     * @param {KeyboardEvent} e
     */
    let keyDown = (e) =>
    {
        if (supperMenuDisplay && !canceled)
            switch (e.code)
            {
                case "KeyW":
                    e.preventDefault();
                    e.stopPropagation();
                    
                    supperMenu.menuPointerMove(0, -supperMenu.cursorScaleSizeY);
                    break;
                case "KeyA":
                    e.preventDefault();
                    e.stopPropagation();

                    supperMenu.menuPointerMove(-supperMenu.cursorScaleSizeX, 0);
                    break;
                case "KeyD":
                    e.preventDefault();
                    e.stopPropagation();

                    supperMenu.menuPointerMove(supperMenu.cursorScaleSizeX, 0);
                    break;
                case "KeyS":
                    e.preventDefault();
                    e.stopPropagation();

                    supperMenu.menuPointerMove(0, supperMenu.cursorScaleSizeY);
                    break;
                case "KeyE":
                    e.preventDefault();
                    e.stopPropagation();

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
                    e.stopPropagation();

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
    { // 鼠标右键打开超级菜单
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
        }, /** @type {number} */(getSuperMenuOption("rightButtonDelay")));
    }, true);
    iframeContext.iframeWindow.addEventListener("keydown", e =>
    { // 右Alt键打开超级菜单
        if (e.code != "AltRight" || !getSuperMenuOption("rightAltEnable"))
            return;
        if (e.repeat)
        {
            e.preventDefault();
            return;
        }
        if (supperMenuDisplay)
            return;
        e.preventDefault();
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
        }, 1);
    }, true);
    iframeContext.iframeWindow.addEventListener("mouseup", e =>
    { // 松开右键关闭菜单并确认
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
    iframeContext.iframeWindow.addEventListener("keyup", e =>
    { // 松开右Alt键关闭菜单并确认
        if (e.code != "AltRight")
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

