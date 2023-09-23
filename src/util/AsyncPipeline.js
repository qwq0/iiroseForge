/**
 * 异步管线
 * @template T
 */
export class AsyncPipeline
{
    /**
     * @type {Array<{ order: number, f: (src: T) => T | Promise<T> }>}
     */
    pipeline = [];


    /**
     * 添加一个处理步骤
     * @param {(src: T) => T | Promise<T>} func 
     * @param {number} [order]
     */
    addStep(func, order)
    {
        if (order != undefined)
        {
            this.pipeline.push({
                f: func,
                order: order
            });
            this.pipeline.sort((a, b) => a.order - b.order);
        }
        else
        {
            if (this.pipeline.length == 0)
                this.pipeline.push({
                    f: func,
                    order: 0
                });
            else
                this.pipeline.push({
                    f: func,
                    order: this.pipeline[this.pipeline.length - 1].order + 1
                });
        }
    }

    /**
     * 使用此管线处理
     * @param {T} value
     * @returns {Promise<T>}
     */
    async pipelining(value)
    {
        let nowValue = value;
        for(let o of this.pipeline)
        {
            try
            {
                nowValue = await o.f(nowValue);
            }
            catch(err)
            {
            }
        }
        return nowValue;
    }
}