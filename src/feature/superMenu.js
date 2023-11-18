import { iframeContext } from "../injectIframe/iframeContext.js";
import { getNElement, NList, createNStyle as style, NTagName, NAsse, NEvent, NElement, createNStyleList as styles, cssG, mouseBind } from "../../lib/qwqframe.js";
import { registAnimationFrame } from "../util/registAnimationFrame.js";

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
        midColumn.clearChild();
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
            }
        });
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
        supperMenu.menuPointerReset();
        iframeContext.iframeWindow.addEventListener("mousemove", mouseMove);
        supperMenuDisplayTimeOutId = setTimeout(() =>
        {
            supperMenuDisplay = true;
            supperMenuDisplayTimeOutId = null;
            refreshListItem();
            supperMenu.show();
        }, 135);
    }, true);
    iframeContext.iframeWindow.addEventListener("mouseup", () =>
    {
        if (supperMenuDisplayTimeOutId != null)
        {
            clearTimeout(supperMenuDisplayTimeOutId);
            supperMenuDisplayTimeOutId = null;
        }
        if (!supperMenuDisplay)
            return;
        iframeContext.iframeWindow.removeEventListener("mousemove", mouseMove);
        supperMenu.triggerCurrent();
        setTimeout(() =>
        {
            supperMenuDisplay = false;
            supperMenu.hide();
        }, 10);
    }, true);
}

/**
 * forge超级菜单
 */
class ForgeSuperMenu
{
    /**
     * 菜单可见
     * @type {boolean}
     */
    visible = false;
    /**
     * 菜单列表
     * @type {Array<ForgeSuperMenuColumn>}
    */
    menuList = [];
    /**
     * 菜单元素
     * @type {NElement}
     */
    menuElement = null;
    /**
     * 菜单指针x
     * x=0, y=0 表示打开菜单时的起点
     */
    menuPointerX = 0;
    /**
     * 菜单指针y
     * x=0, y=0 表示打开菜单时的起点
     */
    menuPointerY = 0;
    /**
     * 当前选中的列
     */
    currentColumnIndex = 0;
    /**
     * 菜单打开时选中的列
     */
    startColumnIndex = 0;
    /**
     * 光标指示器元素
     */
    cursorIndicator = {
        /** @type {NElement} */
        element: null,
        /** @type {boolean} */
        visible: false,
        /** @type {number} */
        x: 0,
        /** @type {number} */
        y: 0,
        /** @type {number} */
        width: 0,
        /** @type {number} */
        height: 0,
    };

    constructor()
    {
        this.menuElement = NList.getElement([
            styles({
                height: "100%",
                width: "100%",
                top: "0",
                left: "0",
                position: "fixed",
                backgroundColor: "rgba(230, 230, 230, 0.5)",
                zIndex: "100000",
            }),

            this.cursorIndicator.element = NList.getElement([
                styles({
                    display: "none",
                    position: "absolute",

                    top: "50%",
                    left: "50%",
                    width: "0px",
                    height: "0px",
                    border: "5px rgba(255, 255, 255, 0.7) solid",
                    boxShadow: "0px 0px 5px 0px rgb(134, 143, 168)",
                    boxSizing: "border-box",

                    zIndex: "100"
                })
            ])
        ]);
    }

    /**
     * 添加列
     * @param {ForgeSuperMenuColumn} column
     */
    addColumn(column)
    {
        this.menuList.push(column);
        column.menu = this;
        this.menuElement.addChild(column.element);
        column.setRelativePosition((this.menuList.length - 1) - this.currentColumnIndex);
    }

    /**
     * 设置当前选中的列
     * @param {number} index
     */
    setCurrentColumn(index)
    {
        if (index < 0)
            index = 0;
        else if (index >= this.menuList.length)
            index = this.menuList.length - 1;
        if (this.currentColumnIndex == index)
            return;
        this.currentColumnIndex = index;
        this.menuList.forEach((o, columnIndex) => o.setRelativePosition(columnIndex - this.currentColumnIndex));
    }

    /**
     * 菜单显示时每帧触发
     */
    draw()
    {
        let columnIndex = this.startColumnIndex + Math.round(this.menuPointerX / 245);
        this.setCurrentColumn(columnIndex);

        let nowColumn = this.menuList[this.currentColumnIndex];
        let rowIndex = nowColumn.startRowIndex + Math.round(this.menuPointerY / 65);
        nowColumn.setCurrentRow(rowIndex);
    }

    show()
    {
        if (this.visible)
            return;
        this.menuElement.animate([
            {
                opacity: "0.5"
            },
            {
                transform: "",
                opacity: "1"
            }
        ], 83);
        this.menuElement.setDisplay("block");
        iframeContext.iframeDocument.body.appendChild(this.menuElement.element);
        this.visible = true;

        this.draw();
        registAnimationFrame(() =>
        {
            this.draw();
            return !this.visible;
        });
    }

    hide()
    {
        if (!this.visible)
            return;
        this.visible = false;
        this.menuElement.setDisplay("none");
    }

    /**
     * 菜单指针移动
     * @param {number} offsetX
     * @param {number} offsetY
     */
    menuPointerMove(offsetX, offsetY)
    {
        this.menuPointerX += offsetX * 1.0;
        this.menuPointerY += offsetY * 1.0;
    }
    /**
     * 菜单指针位置重置
     */
    menuPointerReset()
    {
        this.startColumnIndex = this.currentColumnIndex;
        this.menuPointerX = 0;
        this.menuPointerY = 0;
    }

    /**
     * 触发当前选择的项
     */
    triggerCurrent()
    {
        this.menuList[this.currentColumnIndex]?.triggerCurrent();
    }

    /**
     * 设置光标指示器
     */
    setCursorIndicator(rect)
    {
        if (rect)
        {
            if (
                rect.x != this.cursorIndicator.x ||
                rect.y != this.cursorIndicator.y ||
                rect.width != this.cursorIndicator.width ||
                rect.height != this.cursorIndicator.height ||
                !this.cursorIndicator.visible
            )
            {
                this.cursorIndicator.x = rect.x;
                this.cursorIndicator.y = rect.y;
                this.cursorIndicator.width = rect.width;
                this.cursorIndicator.height = rect.height;
                this.cursorIndicator.visible = true;

                this.cursorIndicator.element.setDisplay("block");
                this.cursorIndicator.element.animate([
                    {
                    },
                    {
                        left: this.cursorIndicator.x + "px",
                        top: this.cursorIndicator.y + "px",
                        width: this.cursorIndicator.width + "px",
                        height: this.cursorIndicator.height + "px",
                    }
                ], {
                    duration: 100,
                    easing: "cubic-bezier(0.33, 1, 0.68, 1)",
                    fill: "forwards"
                });
            }
        }
        else
        {
            if (this.cursorIndicator.visible)
            {
                this.cursorIndicator.visible = false;
                this.cursorIndicator.element.setDisplay("none");
            }
        }
    }
}

/**
 * 超级菜单的列
 */
class ForgeSuperMenuColumn
{
    /**
     * 此列的
     * @type {NElement}
     */
    element = null;
    /**
     * 此列的列表
     * @type {Array<{
     *  element: NElement,
     *  execute: () => void
     * }>}
     */
    list = [];
    /**
     * 相对位置
     * 0 表示 屏幕中间的列表
     * @type {number}
     */
    relativePosition = 0;
    /**
     * 当前选中行的
     * @type {number}
     */
    currentRowIndex = 0;
    /**
     * 菜单打开时选中的行
     * @type {number}
     */
    startRowIndex = 0;
    /**
     * 此列所在的菜单
     * @type {ForgeSuperMenu}
     */
    menu = null;

    constructor()
    {
        this.element = NList.getElement([
            styles({
                position: "absolute",
                width: "700px",
                maxHeight: cssG.diFull("50px"),
                minHeight: "700px",
                inset: "0 0 0 0",
                margin: "auto",
                transform: "none",

                display: "none",

                backgroundColor: "rgba(0, 0, 0, 0.1)",
                overflow: "hidden"
            })
        ]);
    }

    /**
     * 设置相对位置
     * @param {number} position 
     */
    setRelativePosition(position)
    {
        if (
            (-1 <= position && position <= 1) ||
            (-1 <= this.relativePosition && this.relativePosition <= 1)
        )
        {
            this.element.setDisplay("block");
            this.element.animate([
                {
                    transform: ForgeSuperMenuColumn.#getTransformByPosition(this.relativePosition)
                },
                {
                    transform: ForgeSuperMenuColumn.#getTransformByPosition(position)
                }
            ], {
                duration: 140,
                easing: "cubic-bezier(0.33, 1, 0.68, 1)",
                fill: "forwards"
            });
        }
        this.relativePosition = position;
    }

    /**
     * 通过相对位置获取转换
     * @param {number} position
     */
    static #getTransformByPosition(position)
    {
        if (position == 0)
            return "none";
        else
            return `scale(0.8) translateX(${(
                (position > 0 ? 15 : -15) + 105 * position
            )}%)`;
    }

    /**
     * 添加列表项
     * @param {NElement} element
     * @param {() => void} executeCB
     */
    addChild(element, executeCB)
    {
        this.list.push({
            element: element,
            execute: executeCB
        });
        this.element.addChild(element);
    }

    /**
     * 清空列表项
     */
    clearChild()
    {
        this.list.forEach(o => o.element.remove());
        this.list = [];
    }

    /**
     * 设置当前选中的行
     * @param {number} index
     */
    setCurrentRow(index)
    {
        if (this.list.length == 0)
        {
            this.menu.setCursorIndicator(null);
            return;
        }
        if (index < 0)
            index = 0;
        else if (index >= this.list.length)
            index = this.list.length - 1;

        let nowRowElement = this.list[index].element;
        this.currentRowIndex = index;

        if (nowRowElement.element.offsetTop < this.element.element.scrollTop)
        { // 自动向上滚动
            this.element.element.scrollTop = this.list[index].element.element.offsetTop;
        }
        else if (nowRowElement.element.offsetTop + nowRowElement.element.clientHeight > this.element.element.scrollTop + this.element.element.clientHeight)
        { // 自动向下滚动
            this.element.element.scrollTop = nowRowElement.element.offsetTop + nowRowElement.element.clientHeight - this.element.element.clientHeight;
        }

        this.menu.setCursorIndicator(nowRowElement.element.getBoundingClientRect());
    }

    triggerCurrent()
    {
        this.list[this.currentRowIndex]?.execute();
    }
}