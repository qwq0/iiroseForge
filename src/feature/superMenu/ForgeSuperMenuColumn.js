import { NList, createNStyleList as styles, cssG, NElement } from "../../../lib/qwqframe.js";

/**
 * 超级菜单的列
 */
export class ForgeSuperMenuColumn
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
     * @type {import("./ForgeSuperMenu").ForgeSuperMenu}
     */
    menu = null;

    constructor()
    {
        this.element = NList.getElement([
            styles({
                position: "absolute",
                width: "700px",
                maxWidth: cssG.diFull("50px"),
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
        if ((-1 <= position && position <= 1) ||
            (-1 <= this.relativePosition && this.relativePosition <= 1))
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
        if (this.currentRowIndex != this.startRowIndex)
            this.list[this.currentRowIndex]?.execute();
    }
}
