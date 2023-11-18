/**
 * 注册动画帧
 * 每帧调用回调直到动画停止
 * @param {(time: number, timeOffset: number) => boolean | void} callback 返回true时停止动画
 * @returns {() => void} 执行此函数停止动画
 */
export function registAnimationFrame(callback)
{
    let stopped = false;
    let id = 0;
    let startTime = performance.now();
    let lastTime = startTime;
    let loop = () =>
    {
        id = 0;
        let time = performance.now();
        if ((!stopped) && callback(time - startTime, time - lastTime) != true)
        {
            lastTime = time;
            id = requestAnimationFrame(loop);
        }
    };
    id = requestAnimationFrame(loop);
    return (() =>
    {
        if (!stopped)
        {
            if (id != 0)
                cancelAnimationFrame(id);
            id = 0;
            stopped = true;
        }
    });
}