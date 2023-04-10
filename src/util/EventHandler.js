/**
 * 事件处理器
 * 可以定多个事件响应函数
 * @template {*} T
 */
export class EventHandler
{
    /**
     * 回调列表
     * @type {Array<function(T): void>}
     */
    cbList = [];
    /**
     * 单次回调列表
     * @type {Array<function(T): void>}
     */
    onceCbList = [];

    /**
     * 添加响应函数
     * @param {function(T): void} cb
     */
    add(cb)
    {
        this.cbList.push(cb);
    }

    /**
     * 添加单次响应函数
     * 触发一次事件后将不再响应
     * @param {function(T): void} cb
     */
    addOnce(cb)
    {
        this.onceCbList.push(cb);
    }

    /**
     * 移除响应函数
     * @param {function(T): void} cb
     */
    remove(cb)
    {
        let ind = this.cbList.indexOf(cb);
        if (ind > -1)
        {
            this.cbList.splice(ind, 1);
        }
        else
        {
            ind = this.onceCbList.indexOf(cb);
            if (ind > -1)
            {
                this.onceCbList.splice(ind, 1);
            }
        }
    }

    /**
     * 移除所有响应函数
     */
    removeAll()
    {
        this.cbList = [];
        this.onceCbList = [];
    }

    /**
     * 触发事件
     * @param {T} e
     */
    trigger(e)
    {
        this.cbList.forEach(async (o) => { o(e); });
        this.onceCbList.forEach(async (o) => { o(e); });
        this.onceCbList = [];
    }
}