import { iframeContext } from "../../injectIframe/iframeContext.js";
import { NElement, NList, createNStyleList as styles } from "../../../lib/qwqframe.js";
import { registAnimationFrame } from "../../util/registAnimationFrame.js";
import { ForgeSuperMenuColumn } from "./ForgeSuperMenuColumn.js";

/**
 * forge超级菜单
 */
export class ForgeSuperMenu
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
     * 光标移动的x方向刻度
     */
    cursorScaleSizeX = 375;
    /**
     * 光标移动的y方向刻度
     */
    cursorScaleSizeY = 75;

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
                zIndex: "10000000",
            }),

            (
                !iframeContext.iframeWindow?.["isMobile"] ?
                    [
                        styles({
                            width: "100%",
                            left: "0",
                            bottom: "2px",
                            position: "fixed",
                            color: "rgba(0, 0, 0, 0.8)",
                            textAlign: "center"
                        }),

                        "鼠标 或 WASD 移动 | 松开右键 确认 | E 选项设置 | Q 放弃选择"
                    ] :
                    null
            ),

            this.cursorIndicator.element = NList.getElement([
                styles({
                    display: "none",
                    position: "absolute",

                    top: "50%",
                    left: "50%",
                    width: "0px",
                    height: "0px",
                    border: "5px rgba(255, 255, 255, 0.7) solid",
                    boxShadow: "0px 0px 5px 1px rgba(13, 14, 17, 0.7)",
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
        let minX = -(this.startColumnIndex + 0.5) * this.cursorScaleSizeX;
        let maxX = (this.menuList.length - this.startColumnIndex - 0.5) * this.cursorScaleSizeX;
        if (this.menuPointerX >= maxX)
            this.menuPointerX = maxX - 1;
        else if (this.menuPointerX < minX)
            this.menuPointerX = minX;

        let columnIndex = this.startColumnIndex + Math.round(this.menuPointerX / this.cursorScaleSizeX);
        this.setCurrentColumn(columnIndex);



        let nowColumn = this.menuList[this.currentColumnIndex];

        let minY = -(nowColumn.startRowIndex + 0.5) * this.cursorScaleSizeY;
        let maxY = (nowColumn.list.length - nowColumn.startRowIndex - 0.5) * this.cursorScaleSizeY;
        if (this.menuPointerY >= maxY)
            this.menuPointerY = maxY - 1;
        else if (this.menuPointerY < minY)
            this.menuPointerY = minY;

        let rowIndex = nowColumn.startRowIndex + Math.round(this.menuPointerY / this.cursorScaleSizeY);
        nowColumn.setCurrentRow(rowIndex);

        let verticalRemainderPercentage = (this.menuPointerY / this.cursorScaleSizeY) - Math.round(this.menuPointerY / this.cursorScaleSizeY) + 0.5;
        let horizontalRemainderPercentage = (this.menuPointerX / this.cursorScaleSizeX) - Math.round(this.menuPointerX / this.cursorScaleSizeX) + 0.5;

        if (this.cursorIndicator.visible)
        {
            this.cursorIndicator.element.setStyle(
                "borderImage",
                `linear-gradient(0deg, rgb(170, 170, 170), rgb(255, 255, 255) ${((1 - verticalRemainderPercentage) * 100).toFixed(1)}%, rgb(170, 170, 170)) 30`
            );
        }
        this.menuElement.setStyle(
            "backgroundImage",
            `linear-gradient(90deg, rgba(170, 170, 170, 0.5), rgba(235, 235, 235, 0.6) ${(horizontalRemainderPercentage * 100).toFixed(1)}%, rgba(170, 170, 170, 0.5))`
        );
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

        if (!iframeContext.iframeDocument.body.contains(this.menuElement.element))
        {
            iframeContext.iframeDocument.body.appendChild(this.menuElement.element);
        }

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
        this.menuPointerX += offsetX * 1;
        this.menuPointerY += offsetY * 1;
    }
    /**
     * 菜单指针位置重置
     */
    menuPointerReset()
    {
        this.startColumnIndex = this.currentColumnIndex;
        this.menuList.forEach(o => o.startRowIndex = o.currentRowIndex);
        this.menuPointerX = 0;
        this.menuPointerY = 0;
    }

    /**
     * 触发当前选择的项
     */
    triggerCurrent()
    {
        try
        {
            this.menuList[this.currentColumnIndex]?.triggerCurrent();
        }
        catch (err)
        {
            console.error(err);
        }
    }

    /**
     * 触发当前选择的项的选项菜单
     */
    triggerCurrentOptionMenu()
    {
        try
        {
            this.menuList[this.currentColumnIndex]?.triggerCurrentOptionMenu();
        }
        catch (err)
        {
            console.error(err);
        }
    }

    /**
     * 设置光标指示器
     * @param {{ x: number; y: number; width: number; height: number; }} rect
     */
    setCursorIndicator(rect)
    {
        if (rect)
        {
            const eps = 0.001;
            if (
                Math.abs(rect.x - this.cursorIndicator.x) >= eps ||
                Math.abs(rect.y - this.cursorIndicator.y) >= eps ||
                Math.abs(rect.width - this.cursorIndicator.width) >= eps ||
                Math.abs(rect.height - this.cursorIndicator.height) >= eps ||
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
                    {},
                    {
                        left: this.cursorIndicator.x.toFixed(3) + "px",
                        top: this.cursorIndicator.y.toFixed(3) + "px",
                        width: this.cursorIndicator.width.toFixed(3) + "px",
                        height: this.cursorIndicator.height.toFixed(3) + "px",
                    }
                ], {
                    duration: 120,
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
