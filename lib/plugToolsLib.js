/**
 * 代理函数
 * 在执行前调用回调
 * @param {function(...any): any} targetFunction 目标函数
 * @param {(
* 	params: Array<any>,
* 	targetFnBindThis: function(...any): any,
* 	targetFn: function(...any): any,
* 	thisObj: any
* ) => boolean} callback 回调返回true则不执行目标函数
* @returns {function(...any): any}
*/
export function proxyFunction(targetFunction, callback)
{
	return (function (...param)
	{
		let targetFunctionBindThis = targetFunction.bind(this);
		if (callback(param, targetFunctionBindThis, targetFunction, this) != true)
			return targetFunctionBindThis(...param);
	});
}

/**
* 定义循环尝试运行
* 直到运行回调时不再抛出错误
* @param {function (number, number): void} callback 第一个参数为尝试运行的次数 第二个参数为尝试运行的时间
* @param {number} interval
* @param {boolean} [immediate]
*/
export function intervalTry(callback, interval, immediate = false)
{
	let countOfCall = 0;
	let startTime = Date.now();
	let intervalId = null;
	let func = (() =>
	{
		countOfCall++;
		try
		{
			callback(countOfCall, Date.now() - startTime);
			if (intervalId != null)
				clearInterval(intervalId);
			return;
		}
		catch (err)
		{ }
	});
	intervalId = setInterval(func, interval);
	if (immediate)
		func();
}

/**
* 访问dom树上的路径
* @param {Node} start 
* @param {Array<number>} path
* @returns 
*/
export function domPath(start, path)
{
	let now = start;
	path.every(o =>
	{
		if (o < 0)
			o += now.childNodes.length;

		if (now.childNodes[o])
			now = now.childNodes[o];
		else
		{
			now = null;
			return false;
		}

		return true;
	});
	return now;
}