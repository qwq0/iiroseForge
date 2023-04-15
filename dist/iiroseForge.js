(function () {
	'use strict';

	/**
	 * 代理函数
	 * 在执行前调用回调
	 * @param {function(...any): any} targetFunction 目标函数
	 * @param {function(Array<any>, function(...any): any): boolean} callback 回调返回true则不执行目标函数
	 * @returns {function(...any): any}
	 */
	function proxyFunction(targetFunction, callback)
	{
		return ((...param) =>
		{
			if (callback(param, targetFunction) != true)
				return targetFunction(...param);
		});
	}

	/**
	 * 定义循环尝试运行
	 * 直到运行回调时不再抛出错误
	 * @param {function (number, number): void} callback 第一个参数为尝试运行的次数 第二个参数为尝试运行的时间
	 * @param {number} interval
	 * @param {boolean} [immediate]
	 */
	function intervalTry(callback, interval, immediate = false)
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
	 * 主iframe的上下文
	 */
	let iframeContext = {
	    /**
	     * @type {Window | Object}
	     */
	    iframeWindow: null,
	    /**
	     * @type {Document}
	     */
	    iframeDocument: null,
	    /**
	     * @type {WebSocket | Object}
	     */
	    socket: null,
	    /**
	     * @type {import("../../lib/qwqframe").NElement<HTMLBodyElement>}
	     */
	    iframeBody: null,

	    socketApi: {
	        send: (/** @type {string} */ data) =>
	        {
	            iframeContext.socket.send(data);
	        }
	    }
	};

	/**
	 * 自定义序列化函数
	 */
	const serializationFunctionSymbol = Symbol("serialization function");
	/**
	 * 自定义反序列化函数
	 */
	const deserializationFunctionSymbol = Symbol("deserialization function");

	/**
	 * js内置类集合
	 */
	const jsBuiltInClassSet = new Set();
	([
	    Set,
	    Map
	]).forEach(o => { jsBuiltInClassSet.add(o); });

	const textEncoder = new TextEncoder();
	const textDecoder = new TextDecoder("utf-8");

	/**
	 * 可变长buffer类
	 */
	class VariableSizeBuffer
	{
	    arr = new Uint8Array(128);
	    endInd = 0;

	    /**
	     * @param {number} c
	     */
	    push(c)
	    {
	        if (this.endInd >= this.arr.length)
	        {
	            let old = this.arr;
	            this.arr = new Uint8Array(this.arr.length * 2);
	            this.arr.set(old);
	        }
	        this.arr[this.endInd++] = c;
	    }

	    /**
	     * @param {Uint8Array} a 
	     */
	    pushArr(a)
	    {
	        if (this.endInd + a.length > this.arr.length)
	        {
	            let old = this.arr;
	            let newLen = old.length * 2;
	            while (this.endInd + a.length > newLen)
	                newLen *= 2;
	            this.arr = new Uint8Array(newLen);
	            this.arr.set(old);
	        }
	        this.arr.set(a, this.endInd);
	        this.endInd += a.length;
	    }
	}

	/**
	 * JSOBin操作上下文
	 */
	class JSOBin
	{
	    /**
	     * 类映射
	     * 类名字符串标识 到 类(构造函数)
	     * @private
	     * @type {Map<string, object>}
	     */
	    nameToClass = new Map();

	    /**
	     * 类映射
	     * 类(构造函数) 到 类名字符串标识
	     * @private
	     * @type {Map<object, string>}
	     */
	    classToName = new Map();

	    /**
	     * 安全函数映射
	     * 安全函数字符串标识 到 函数
	     * @private
	     * @type {Map<string, function>}
	     */
	    nameToSFunction = new Map();

	    /**
	     * 安全函数映射
	     * 函数 到 安全函数字符串标识
	     * @private
	     * @type {Map<function, string>}
	     */
	    sFunctionToName = new Map();

	    /**
	     * 添加类到上下文
	     * 注册标识符和类(构造器)的相互映射
	     * @param {string} identifier 类标识符
	     * @param {function} classConstructor 类的构造器
	     */
	    addClass(identifier, classConstructor)
	    {
	        this.nameToClass.set(identifier, classConstructor);
	        this.classToName.set(classConstructor, identifier);
	    }

	    /**
	     * 添加安全函数到上下文
	     * 允许确保安全的函数注册标识符和函数的相互映射
	     * @param {string} identifier 安全函数标识符
	     * @param {function} safetyFunction 函数
	     */
	    addSafetyFunction(identifier, safetyFunction)
	    {
	        this.nameToSFunction.set(identifier, safetyFunction);
	        this.sFunctionToName.set(safetyFunction, identifier);
	    }

	    /**
	     * 编码
	     * @param {object | number | string} obj
	     * @returns {Uint8Array}
	     */
	    encode(obj)
	    {
	        /**
	         * 输出结果由此数组拼接
	         */
	        let buffer = new VariableSizeBuffer();

	        /**
	         * 序列化一个vint
	         * @param {number} num
	         */
	        const pushVint = (num) =>
	        {
	            while (true)
	            {
	                let c = (num & ((1 << 7) - 1));
	                num >>>= 7;
	                if (!num)
	                {
	                    buffer.push(c | (1 << 7));
	                    return;
	                }
	                buffer.push(c);
	            }
	        };

	        /**
	         * 写入字符串
	         * @param {string} str
	         */
	        const pushStr = str =>
	        {
	            let strBin = textEncoder.encode(str);
	            pushVint(strBin.byteLength);
	            buffer.pushArr(strBin);
	        };

	        let referenceIndCount = -1;
	        let referenceIndMap = new Map();

	        /**
	         * 遍历处理对象
	         * @param {object | number | string} now 
	         */
	        const tr = (now) =>
	        {
	            ++referenceIndCount;
	            if (!referenceIndMap.has(now))
	                referenceIndMap.set(now, referenceIndCount);
	            switch (typeof (now))
	            {
	                case "number": { // 数值型(整数或小数)
	                    if (Number.isInteger(now)) // 整数
	                    {
	                        buffer.push(1);
	                        pushVint(now);
	                    }
	                    else // 浮点数
	                    {
	                        buffer.push(2);
	                        buffer.pushArr(new Uint8Array(new Float64Array([now]).buffer));
	                    }
	                    break;
	                }

	                case "string": { // 字符串
	                    buffer.push(3);
	                    pushStr(now);
	                    break;
	                }

	                case "object": { // 对象 数组 类 null
	                    if (now == null) // null
	                        buffer.push(11);
	                    else if (referenceIndMap.get(now) < referenceIndCount) // 需要引用的对象
	                    {
	                        buffer.push(14);
	                        pushVint(referenceIndMap.get(now));
	                    }
	                    else if (Array.isArray(now)) // 数组
	                    {
	                        buffer.push(5);
	                        now.forEach(tr);
	                        buffer.push(0);
	                    }
	                    else if (this.classToName.has(Object.getPrototypeOf(now)?.constructor)) // 类(自定义类)
	                    {
	                        buffer.push(6);
	                        pushStr(this.classToName.get(Object.getPrototypeOf(now)?.constructor));
	                        let obj = now[serializationFunctionSymbol] ? now[serializationFunctionSymbol].call(now) : now; // 处理自定义序列化函数
	                        let keys = Object.getOwnPropertyNames(obj);
	                        pushVint(keys.length);
	                        keys.forEach(key =>
	                        {
	                            pushStr(key);
	                            tr(obj[key]);
	                        });
	                    }
	                    else if (jsBuiltInClassSet.has(Object.getPrototypeOf(now)?.constructor)) // js内置类
	                    {
	                        buffer.push(15);
	                        switch (Object.getPrototypeOf(now)?.constructor)
	                        {
	                            case Map: { // Map类
	                                pushVint(1);
	                                pushVint((/** @type {Map} */(now)).size);
	                                (/** @type {Map} */(now)).forEach((value, key) =>
	                                {
	                                    tr(key);
	                                    tr(value);
	                                });
	                                break;
	                            }
	                            case Set: { // Set类
	                                pushVint(2);
	                                (/** @type {Set} */(now)).forEach(tr);
	                                buffer.push(0);
	                                break;
	                            }
	                            default:
	                                buffer.push(7); // 不支持的js内置类类型
	                        }
	                    }
	                    else // 对象
	                    {
	                        buffer.push(4);
	                        let keys = Object.keys(now);
	                        pushVint(keys.length);
	                        keys.forEach(key =>
	                        {
	                            pushStr(key);
	                            tr(now[key]);
	                        });
	                    }
	                    break;
	                }

	                case "undefined": { // 未定义(undefined)
	                    buffer.push(7);
	                    break;
	                }

	                case "boolean": { // 布尔值
	                    buffer.push(now ? 9 : 8);
	                    break;
	                }

	                case "bigint": { // bigint类型
	                    /** @type {Uint8Array} */
	                    let bigintBuf = null;
	                    if (now >= 0n) // bigint正数和0
	                    {
	                        buffer.push(12);
	                        if (now > 0n) // bigint正数
	                            bigintBuf = JSOBin.writeBigint(now);
	                        else // bigint 0
	                            bigintBuf = new Uint8Array(0);
	                    }
	                    else // bigint负数
	                    {
	                        buffer.push(13);
	                        bigintBuf = JSOBin.writeBigint(-(/** @type {bigint} */(now)));
	                    }
	                    pushVint(bigintBuf.byteLength);
	                    buffer.pushArr(bigintBuf);
	                    break;
	                }

	                case "symbol": { // symbol类型
	                    if (referenceIndMap.get(now) < referenceIndCount) // 需要引用的symbol
	                    {
	                        buffer.push(14);
	                        pushVint(referenceIndMap.get(now));
	                    }
	                    else // 新的symbol
	                    {
	                        buffer.push(10);
	                        pushStr(now.description ? now.description : "");
	                    }
	                    break;
	                }

	                case "function": { // 函数
	                    if (this.sFunctionToName.has(now)) // 安全函数
	                    {
	                        buffer.push(17);
	                        pushStr(this.sFunctionToName.get(now));
	                    }
	                    else
	                        buffer.push(7); // 目前不处理其他函数
	                    break;
	                }

	                default:
	                    throw "JSObin(encode): The type of value that cannot be processed.";
	            }
	        };
	        tr(obj);

	        return buffer.arr.slice(0, buffer.endInd);
	    }

	    /**
	     * 解码
	     * @param {Uint8Array} bin
	     * @returns {object | number | string}
	     */
	    decode(bin)
	    {
	        let dataView = new DataView(bin.buffer);
	        /**
	         * 当前读到的位置
	         * @type {number}
	         */
	        let ind = 0;


	        /**
	         * 读一个vint
	         * @returns {number}
	         */
	        const getVInt = () =>
	        {
	            let ret = 0;
	            let bitPointer = 0;
	            while (!(bin[ind] & (1 << 7)))
	            {
	                ret |= bin[ind++] << bitPointer;
	                bitPointer += 7;
	                if (bitPointer > 32) // (bitPointer > 28)
	                    throw "JSOBin Decode: Unexpected vint length";
	            }
	            ret |= (bin[ind++] & ((1 << 7) - 1)) << bitPointer;
	            return ret;
	        };

	        /**
	         * 获取一个字符串(带有表示长度的vint)
	         * @returns {string}
	         */
	        const getStr = () =>
	        {
	            let len = getVInt();
	            let str = textDecoder.decode(bin.subarray(ind, ind + len));
	            ind += len;
	            return str;
	        };

	        let referenceIndList = [];

	        /**
	         * 遍历处理对象
	         * @param {number} [presetTypeId]
	         * @returns {object | number | string}
	         */
	        const tr = (presetTypeId) =>
	        {
	            if (ind >= bin.length)
	                throw "JSOBin Decode: Wrong format";
	            let typeId = (presetTypeId === undefined ? bin[ind++] : presetTypeId);
	            switch (typeId)
	            {
	                case 1: { // 变长型整数
	                    let num = getVInt();
	                    referenceIndList.push(num);
	                    return num;
	                }

	                case 2: { // 浮点数
	                    let num = dataView.getFloat64(ind, true);
	                    referenceIndList.push(num);
	                    ind += 8;
	                    return num;
	                }

	                case 3: { // 字符串
	                    let str = getStr();
	                    referenceIndList.push(str);
	                    return str;
	                }

	                case 4: { // 对象
	                    let ret = {};
	                    let childCount = getVInt();
	                    referenceIndList.push(ret);
	                    for (let i = 0; i < childCount; i++)
	                    {
	                        let key = getStr();
	                        ret[key] = tr();
	                    }
	                    return ret;
	                }

	                case 5: { // 数组
	                    let ret = [];
	                    referenceIndList.push(ret);
	                    while (bin[ind])
	                        ret.push(tr());
	                    ind++;
	                    return ret;
	                }

	                case 6: { // 类
	                    let className = getStr();
	                    let classConstructor = this.nameToClass.get(className);
	                    if (classConstructor == undefined)
	                        throw `JSOBin Decode: (class) "${className}" is unregistered class in the current context in the parsing jsobin`;
	                    if (classConstructor?.[deserializationFunctionSymbol]) // 存在自定义反序列化函数
	                    {
	                        let dataObj = Object.create(classConstructor.prototype);
	                        let childCount = getVInt();
	                        referenceIndList.push(dataObj);
	                        for (let i = 0; i < childCount; i++)
	                        {
	                            let key = getStr();
	                            dataObj[key] = tr();
	                        }
	                        return classConstructor[deserializationFunctionSymbol](dataObj);
	                    }
	                    else // 自定义类默认序列化方案
	                    {
	                        let ret = Object.create(classConstructor.prototype);
	                        let childCount = getVInt();
	                        referenceIndList.push(ret);
	                        for (let i = 0; i < childCount; i++)
	                        {
	                            let key = getStr();
	                            ret[key] = tr();
	                        }
	                        return ret;
	                    }
	                }

	                case 7: { // 未定义(undefined)
	                    referenceIndList.push(undefined);
	                    return undefined;
	                }

	                case 8: { // 布尔值假
	                    referenceIndList.push(false);
	                    return false;
	                }

	                case 9: { // 布尔值真
	                    referenceIndList.push(true);
	                    return true;
	                }

	                case 10: { // symbol类型
	                    let symbol = Symbol(getStr());
	                    referenceIndList.push(symbol);
	                    return symbol;
	                }

	                case 11: { // 无效对象(null)
	                    referenceIndList.push(null);
	                    return null;
	                }

	                case 12: { // bigint类型(正数)
	                    let len = getVInt();
	                    let num = JSOBin.readBigInt(bin, ind, len);
	                    referenceIndList.push(num);
	                    ind += len;
	                    return num;
	                }

	                case 13: { // bigint类型(负数)
	                    let len = getVInt();
	                    let num = JSOBin.readBigInt(bin, ind, len);
	                    referenceIndList.push(num);
	                    ind += len;
	                    return -num;
	                }

	                case 14: { // 引用
	                    let referenceInd = getVInt();
	                    let ret = referenceIndList[referenceInd];
	                    referenceIndList.push(ret);
	                    return ret;
	                }

	                case 15: { // js内置类
	                    let builtInClassId = getVInt();
	                    switch (builtInClassId)
	                    {
	                        case 1: { // Map类
	                            let ret = new Map();
	                            let childCount = getVInt();
	                            referenceIndList.push(ret);
	                            for (let i = 0; i < childCount; i++)
	                            {
	                                let key = tr();
	                                ret.set(key, tr());
	                            }
	                            return ret;
	                        }
	                        case 2: { // Set类
	                            let ret = new Set();
	                            referenceIndList.push(ret);
	                            while (bin[ind])
	                                ret.add(tr());
	                            ind++;
	                            return ret;
	                        }
	                        default:
	                            throw "JSOBin Decode: Unsupported js built-in class type.";
	                    }
	                }

	                case 16: { // 函数 目前不支持
	                    throw "JSOBin Decode: Function is not supported in the current version";
	                }

	                case 17: { // 安全函数
	                    let func = this.nameToSFunction.get(getStr());
	                    referenceIndList.push(func);
	                    return func;
	                }

	                default:
	                    throw "JSOBin Decode: Wrong format";
	            }
	        };
	        return tr();
	    }



	    /**
	     * 序列化一个bigint
	     * @param {bigint} num
	     * @returns {Uint8Array}
	     */
	    static writeBigint(num)
	    {
	        let buf = [];
	        while (true)
	        {
	            buf.push(Number(num & BigInt((1 << 8) - 1)));
	            num >>= 8n;
	            if (num == 0n)
	                return new Uint8Array(buf);
	        }
	    }

	    /**
	     * 反序列化一个Bigint
	     * @param {Uint8Array} buf
	     * @param {number} startInd
	     * @param {number} len
	     * @returns {bigint}
	     */
	    static readBigInt(buf, startInd, len)
	    {
	        let ret = 0n;
	        for (let ptr = startInd + len - 1; ptr >= startInd; ptr--)
	        {
	            ret <<= 8n;
	            ret += BigInt(buf[ptr]);
	        }
	        return ret;
	    }
	}

	const jsob = new JSOBin();

	/**
	 * 读取forge数据包
	 * @param {string} dataStr
	 * @returns {Object}
	 */
	function readForgePacket(dataStr)
	{
	    if (dataStr.startsWith("iiroseForge:") && dataStr.endsWith(":end"))
	    {
	        let data = dataStr.slice(12, -4);
	        try
	        {
	            let commaInd = data.indexOf(",");
	            let len = Number.parseInt(data.slice(0, commaInd), 36);
	            if (Number.isNaN(len) || len < 0 || len > 8192)
	                return undefined;
	            data = data.slice(commaInd + 1);
	            let dataBase64 = data.slice(0, len);
	            if (dataBase64.length != len)
	                return undefined;
	            let metaArr = data.slice(len).split(",");
	            if ((!metaArr[1]) || metaArr[1] == "single")
	                return jsob.decode(base64ToUint8(dataBase64));
	        }
	        catch (err)
	        {
	            console.log(err);
	            return undefined;
	        }
	    }
	    else
	        return undefined;
	}

	/**
	 * 写入forge数据包
	 * @param {Object} obj
	 * @returns {string}
	 */
	function writeForgePacket(obj)
	{
	    try
	    {
	        let dataBase64 = uint8ToBase64(jsob.encode(obj));
	        let metaArr = ["", "single"];
	        return `iiroseForge:${dataBase64.length.toString(36)},${dataBase64}${metaArr.join(",")}:end`;
	    }
	    catch (err)
	    {
	        return undefined;
	    }
	}

	/**
	 * uint8数组转base64
	 * @param {Uint8Array} data
	 * @returns {string}
	 */
	function uint8ToBase64(data)
	{
	    let binaryString = Array.from(data).map(o => String.fromCharCode(o)).join("");
	    return window.btoa(binaryString);
	}

	/**
	 * base64数组转uint8
	 * @param {string} base64
	 * @returns {Uint8Array}
	 */
	function base64ToUint8(base64)
	{
	    let binaryString = window.atob(base64);
	    let ret = new Uint8Array(binaryString.length);
	    for (let i = 0; i < binaryString.length; i++)
	    {
	        ret[i] = binaryString.charCodeAt(i);
	    }
	    return ret;
	}

	/**
	 * css生成
	 * @namespace
	 */
	const cssG = {
	    /**
	     * 100%减去指定值
	     * @param {string} value
	     * @returns {string}
	     */
	    diFull: (value) =>
	    {
	        return ("calc(100% - " + value + ")");
	    },

	    /**
	     * 构建rgb或rgba颜色颜色
	     * @param {number | string} r 0~255
	     * @param {number | string} g 0~255
	     * @param {number | string} b 0~255
	     * @param {number | string} [a] 0~1
	     */
	    rgb: (r, g, b, a = 1) =>
	    {
	        return "rgba(" + r + ", " + g + ", " + b + ", " + a + ")";
	    }
	};

	/**
	 * 正向遍历数组
	 * 在回调中返回不为false或void的值主动结束遍历
	 * 主动结束遍历 返回true
	 * 未主动结束遍历完全部内容 返回false
	 * @template T
	 * @param {ArrayLike<T>} o
	 * @param {function(T, number):(boolean | void)} callback
	 * @returns {boolean}
	 */
	function forEach(o, callback)
	{
	    if (!o)
	        return false;
	    for (let i = 0, Li = o.length; i < Li; i++)
	        if (o[i] != undefined && callback(o[i], i))
	            return true;
	    return false;
	}

	/**
	 * 判断第一个参数是否属于之后所有的参数
	 * 第一个参数与任何一个之后的参数相等 返回true
	 * 与任何一个都不相等 返回false
	 * @param {any} k
	 * @param  {...any} s
	 * @returns {boolean}
	 */
	function isAmong(k, ...s)
	{
	    return forEach(s, o => o == k);
	}
	/**
	 * 目标对象 到 引用集合 映射
	 * 确保当目标对象存活时引用集合的引用存活
	 * 目前仅在HookBindCallback中使用
	 * @type {WeakMap<object, Set<any>>}
	 */
	const targetRefMap = new WeakMap();

	/**
	 * 记录器
	 * 在目标对象销毁时销毁钩子
	 * @type {FinalizationRegistry<HookBindValue | HookBindCallback>}
	 */
	const register = new FinalizationRegistry(heldValue =>
	{
	    heldValue.destroy();
	});


	/**
	 * 钩子绑定信息
	 */
	class HookBindInfo
	{
	    /**
	     * 代理对象
	     * @type {object}
	     */
	    proxyObj = null;
	    /**
	     * 源对象
	     * @type {object}
	     */
	    srcObj = null;
	    /**
	     * 需要监听代理对象上的值
	     * @type {Array<string | symbol>}
	     */
	    keys = [];
	    /**
	     * 修改指定值时需要触发的钩子
	     * @type {Map<string | symbol, Set<HookBindValue | HookBindCallback>>}
	     */
	    hookMap = null;
	    /**
	     * 值处理函数
	     * 若存在此函数则需要调用
	     * @type {function(...any): any} 
	     */
	    ctFunc = null;

	    /**
	     * @param {object} proxyObj
	     * @param {object} srcObj
	     * @param {Array<string | symbol>} keys
	     * @param {Map<string | symbol, Set<HookBindValue | HookBindCallback>>} hookMap
	     * @param {function(...any): any} ctFunc
	     */
	    constructor(proxyObj, srcObj, keys, hookMap, ctFunc)
	    {
	        this.proxyObj = proxyObj;
	        this.srcObj = srcObj;
	        this.keys = keys;
	        this.hookMap = hookMap;
	        this.ctFunc = ctFunc;
	    }

	    /**
	     * 获取此钩子绑定的值
	     */
	    getValue()
	    {
	        return (this.ctFunc ? this.ctFunc(...this.keys.map(o => this.srcObj[o])) : this.srcObj[this.keys[0]]);
	    }

	    /**
	     * 添加钩子
	     * @package
	     * @param {HookBindValue | HookBindCallback} hookObj
	     */
	    addHook(hookObj)
	    {
	        this.keys.forEach(o =>
	        {
	            let set = this.hookMap.get(o);
	            if (set == undefined)
	            {
	                set = new Set();
	                this.hookMap.set(o, set);
	            }
	            set.add(hookObj);
	        });
	    }

	    /**
	     * 移除钩子
	     * @package
	     * @param {HookBindValue | HookBindCallback} hookObj
	     */
	    removeHook(hookObj)
	    {
	        this.keys.forEach(o =>
	        {
	            let set = this.hookMap.get(o);
	            if (set)
	            {
	                set.delete(hookObj);
	                if (set.size == 0)
	                    this.hookMap.delete(o);
	            }
	        });
	    }

	    /**
	     * 绑定到值
	     * @template {Object} T
	     * @param {T} targetObj
	     * @param {(keyof T) | (string & {}) | symbol} targetKey
	     * @returns {HookBindValue}
	     */
	    bindToValue(targetObj, targetKey)
	    {
	        return new HookBindValue(this, targetObj, (/** @type {string | symbol} */(targetKey)));
	    }

	    /**
	     * 绑定到回调函数
	     * @param {function(any): void} callback
	     * @returns {HookBindCallback}
	     */
	    bindToCallback(callback)
	    {
	        return new HookBindCallback(this, callback);
	    }
	}

	/**
	 * 钩子绑定到回调类
	 */
	class HookBindCallback
	{
	    /**
	     * 钩子信息
	     * @type {HookBindInfo}
	     */
	    info = null;

	    /**
	     * 回调函数的弱引用
	     * @type {WeakRef<function(any): void>}
	     */
	    cbRef = null;
	    /**
	     * 回调函数
	     * 当此钩子绑定自动释放时为null
	     * @type {function(any): void}
	     */
	    callback = null;

	    /**
	     * @param {HookBindInfo} info
	     * @param {function(any): void} callback
	     */
	    constructor(info, callback)
	    {
	        this.info = info;
	        this.cbRef = new WeakRef(callback);
	        this.callback = callback;
	        info.addHook(this);
	    }

	    /**
	     * 触发此钩子
	     */
	    emit()
	    {
	        let callback = this.cbRef.deref();
	        if (callback)
	        {
	            try
	            {
	                callback(this.info.getValue());
	            }
	            catch (err)
	            {
	                console.error(err);
	            }
	        }
	    }

	    /**
	     * 销毁此钩子
	     * 销毁后钩子将不再自动触发
	     */
	    destroy()
	    {
	        this.info.removeHook(this);
	        register.unregister(this);
	    }

	    /**
	     * 绑定销毁
	     * 当目标对象释放时销毁
	     * @param {object} targetObj
	     * @returns {HookBindCallback} 返回自身
	     */
	    bindDestroy(targetObj)
	    {
	        let targetRefSet = targetRefMap.get(targetObj);
	        if (targetRefSet == undefined)
	        {
	            targetRefSet = new Set();
	            targetRefMap.set(targetObj, targetRefSet);
	        }
	        targetRefSet.add(this.callback);
	        this.callback = null;
	        register.register(targetObj, this, this);
	        return this;
	    }
	}

	/**
	 * 钩子绑定到值类
	 */
	class HookBindValue
	{
	    /**
	     * 钩子信息
	     * @type {HookBindInfo}
	     */
	    info = null;

	    /**
	     * 目标对象
	     * @type {WeakRef<object>}
	     */
	    targetRef = null;
	    /**
	     * 目标对象的键
	     * @type {string | symbol}
	     */
	    targetKey = "";

	    /**
	     * @param {HookBindInfo} info
	     * @param {object} targetObj
	     * @param {string | symbol} targetKey
	     */
	    constructor(info, targetObj, targetKey)
	    {
	        this.info = info;
	        this.targetRef = new WeakRef(targetObj);
	        this.targetKey = targetKey;
	        info.addHook(this);
	        register.register(targetObj, this, this);
	    }

	    /**
	     * 触发此钩子
	     * 销毁后仍可通过此方法手动触发
	     */
	    emit()
	    {
	        let target = this.targetRef.deref();
	        if (target != undefined)
	        {
	            try
	            {
	                target[this.targetKey] = this.info.getValue();
	            }
	            catch (err)
	            {
	                console.error(err);
	            }
	        }
	    }

	    /**
	     * 销毁此钩子
	     * 销毁后钩子将不再自动触发
	     */
	    destroy()
	    {
	        this.info.removeHook(this);
	        register.unregister(this);
	    }
	}

	const symbolKey = Symbol("NElement");

	/**
	 * dom元素的封装
	 * @template {HTMLElement} ElementObjectType
	 */
	class NElement
	{
	    /**
	     * 元素对象
	     * @readonly
	     * @type {ElementObjectType}
	     */
	    element = null;
	    /**
	     * 样式名 到 钩子绑定 映射
	     * @private
	     * @type {Map<string, HookBindValue | HookBindCallback>}
	     */
	    styleHooks = new Map();

	    /**
	     * @private
	     * @param {ElementObjectType} elementObj
	     */
	    constructor(elementObj)
	    {
	        this.element = elementObj;
	    }

	    /**
	     * 添加单个子节点
	     * @param {NElement | HTMLElement} chi
	     */
	    addChild(chi)
	    {
	        if (chi instanceof NElement)
	            this.element.appendChild(chi.element);
	        else
	            this.element.appendChild(chi);
	    }

	    /**
	     * 添加多个子节点
	     * @param {Array<NElement | HTMLElement | Array<NElement | HTMLElement>>} chi
	     */
	    addChilds(...chi)
	    {
	        chi.forEach(o =>
	        {
	            if (Array.isArray(o))
	                o.forEach(s => this.addChild(s));
	            else if (typeof (o) == "object")
	                this.addChild(o);
	        });
	    }

	    /**
	     * 插入单个子节点(在中间)
	     * 如果此节点之前在树中则先移除后加入
	     * @param {NElement} chi
	     * @param {number | NElement} pos 添加到的位置 负数从后到前 超过范围添加到最后
	     */
	    insChild(chi, pos)
	    {
	        let e = this.element;
	        if (typeof (pos) == "number")
	        {
	            if (pos >= 0 || pos < e.childElementCount)
	            {
	                e.insertBefore(chi.element, e.children[pos]);
	            }
	            else if (pos < 0 || pos >= (-e.childElementCount))
	            {
	                e.insertBefore(chi.element, e.children[e.childElementCount + pos]);
	            }
	            else
	            {
	                e.appendChild(chi.element);
	            }
	        }
	        else
	            e.insertBefore(chi.element, pos.element);
	    }

	    /**
	     * 查找子节点在当前节点中的位置
	     * 从0开始
	     * 不是子节点则返回-1
	     * @param {NElement} chi
	     * @returns {number}
	     */
	    childInd(chi)
	    {
	        let ind = -1;
	        forEach(this.element.children, (o, i) =>
	        {
	            if (o == chi.element)
	            {
	                ind = i;
	                return true;
	            }
	        });
	        return ind;
	    }

	    /**
	     * 移除此节点
	     */
	    remove()
	    {
	        this.element.remove();
	    }

	    /**
	     * 移除此节点的子节点
	     * @param {number} [begin] 开始删除的子节点下标 缺省则为从0开始
	     * @param {number} [end] 结束删除的子节点下标 不包含end 缺省则为到结尾
	     */
	    removeChilds(begin = 0, end = Infinity)
	    {
	        let e = this.element;
	        if (end > e.childElementCount)
	            end = e.childElementCount;
	        for (let i = begin; i < end; i++)
	            e.children[begin].remove();
	    }

	    /**
	     * 获取子节点列表
	     * 返回的列表不会随dom树变化
	     * @returns {Array<NElement>}
	     */
	    getChilds()
	    {
	        return Array.from(this.element.children).map(o => getNElement(/** @type {HTMLElement} */(o)));
	    }

	    /**
	     * 获取第ind个子节点
	     * @param {number} ind
	     * @returns {NElement}
	     */
	    getChild(ind)
	    {
	        return getNElement(/** @type {HTMLElement} */(this.element.children[ind]));
	    }

	    /**
	     * 修改样式
	     * @param {import("../feature/NStyle").keyOfStyle} styleName
	     * @param {string | number | HookBindInfo} value
	     * @param {HookBindValue | HookBindCallback} [hookObj]
	     */
	    setStyle(styleName, value, hookObj)
	    {
	        if (hookObj != this.styleHooks.get(styleName))
	        {
	            this.styleHooks.get(styleName)?.destroy();
	            if (hookObj != undefined)
	                this.styleHooks.set(styleName, hookObj);
	            else
	                this.styleHooks.delete(styleName);
	        }
	        if (value instanceof HookBindInfo)
	            value.bindToCallback(o =>
	            {
	                this.setStyle(styleName, o, hookObj);
	            }).bindDestroy(this).emit();
	        else
	            // @ts-expect-error
	            this.element.style[styleName] = value;
	    }
	    /**
	     * 获取样式
	     * @param {import("../feature/NStyle").keyOfStyle} styleName
	     * @returns {string | number}
	     */
	    getStyle(styleName)
	    {
	        if (typeof (styleName) == "string")
	            return this.element.style[styleName];
	    }

	    /**
	     * 修改多个样式
	     * @param {{ [x in (import("../feature/NStyle").keyOfStyle)]?: string | number }} obj
	     */
	    setStyles(obj)
	    {
	        forEach(Object.keys(obj), (key) =>
	        {
	            let value = obj[key];
	            if (isAmong(typeof (value), "number", "string"))
	                this.element.style[key] = obj[key];
	        });
	    }

	    /**
	     * 修改文本
	     * @param {string} text
	     */
	    setText(text)
	    {
	        this.element.innerText = text;
	    }

	    /**
	     * 添加文本
	     * @param {string} text
	     * @returns {Text}
	     */
	    addText(text)
	    {
	        return this.element.appendChild(document.createTextNode(text));
	    }

	    /**
	     * 设置多个HTMLElement属性
	     * @param {Object<string, string>} obj
	     */
	    setAttrs(obj)
	    {
	        forEach(Object.keys(obj), (key) => { this.element[key] = obj[key]; });
	    }

	    /**
	     * 设置元素可见性
	     * @param {"block" | "inline" | "flex" | "none" | "inline-block" | string} s
	     */
	    setDisplay(s)
	    {
	        this.setStyle("display", s);
	    }

	    /**
	     * 添加事件监听器
	     * @template {keyof HTMLElementEventMap} K
	     * @param {K} eventName
	     * @param {function(HTMLElementEventMap[K]): any} callBack
	     * @param {boolean | AddEventListenerOptions} [options]
	     */
	    addEventListener(eventName, callBack, options)
	    {
	        this.element.addEventListener(eventName, callBack, options);
	    }

	    /**
	     * 移除事件监听器
	     * @param {string} eventName
	     * @param {function(Event) : void} callBack
	     * @param {boolean | EventListenerOptions} [options]
	     */
	    removeEventListener(eventName, callBack, options)
	    {
	        this.element.removeEventListener(eventName, callBack, options);
	    }

	    /**
	     * 执行动画
	     * @param {Array<Keyframe> | PropertyIndexedKeyframes} keyframes
	     * @param {number | KeyframeAnimationOptions} options
	     */
	    animate(keyframes, options)
	    {
	        this.element.animate(keyframes, options);
	    }

	    /**
	     * 流水线
	     * @param {function(NElement): void} asseFunc 流水线函数(无视返回值)
	     * @returns {NElement} 返回本身
	     */
	    asse(asseFunc)
	    {
	        asseFunc(this);
	        return this;
	    }

	    /**
	     * 获取标签名
	     * 标签名使用小写字母
	     * @returns {keyof HTMLElementTagNameMap}
	     */
	    getTagName()
	    {
	        return (/** @type {keyof HTMLElementTagNameMap} */(this.element.tagName.toLowerCase()));
	    }

	    /**
	     * 根据HTMLElement对象获取NElement对象
	     * @template {HTMLElement} ElementObjectType
	     * @param {ElementObjectType} element
	     * @returns {NElement<ElementObjectType>}
	     */
	    static byElement(element)
	    {
	        if (element[symbolKey])
	            return element[symbolKey];
	        else
	            return element[symbolKey] = new NElement(element);
	    }
	}


	/**
	 * 根据HTMLElement对象获取NElement对象
	 * @template {HTMLElement} ElementObjectType
	 * @param {ElementObjectType} element
	 * @returns {NElement<ElementObjectType>}
	 */
	function getNElement(element)
	{
	    return NElement.byElement(element);
	}

	/**
	 * 遍历展开元素
	 * @typedef {{
	 *     id?:  string, // id
	 *     left?: string, // 距左边(style)
	 *     top?: string, // 距顶边(style)
	 *     right?: string, // 距右边(style)
	 *     bottom?: string, // 距底边(style)
	 *     width?: string, // 宽度(style)
	 *     height?: string, // 高度(style)
	 *     position?: "static" | "absolute" | "relative" | "fixed" | string, // 定位方式(style)
	 *     display?: "block" | "inline" | "none" | "inline-block" | string, // 显示方式(style)
	 *     overflow?: "visible" | "hidden" | "scroll" | "auto" | string, // 超出部分(style)
	 *     tagName?: string, // html标签名(标签类型)
	 *     classList?: Array<string>, // html标签类名列表
	 *     text?: string, // 文本
	 *     style?: {[x in (keyof CSSStyleDeclaration)]?: string | number} | {[x: string]: string | number}, // 样式对象
	 *     attr?: Object<string, string>, // 属性对象(HTMLElement的附加属性)
	 *     event?: {[x in (keyof HTMLElementEventMap)]?: (function(Event) : void)} | {[x: string]: (function(Event) : void)}, // 事件绑定
	 *     child?: Array<EDObj | NElement>, // 子节点
	 *     assembly?: Array<function(NElement) : void | NElement>, // 流水线
	 *     [x: string]: any
	 * }} EDObj
	 * @param {EDObj} obj
	 * @returns {NElement}
	*/
	function expEle(obj)
	{
	    let now = getNElement(document.createElement(obj.tagName ? obj.tagName : "div"));

	    ([
	        "height",
	        "width",
	        "position",
	        "top",
	        "left",
	        "right",
	        "bottom",
	        "display",
	        "overflow"
	    ]).forEach(key =>
	    {
	        if (obj[key])
	        {
	            now.setStyle(key, obj[key]);
	        }
	    });

	    if (obj.style)
	        now.setStyles(obj.style);
	    if (obj.text)
	        now.setText(obj.text);
	    if (obj.attr)
	        now.setAttrs(obj.attr);
	    if (obj.classList)
	        now.element.classList.add(...obj.classList);
	    if (obj.event) // 如果有绑定事件
	    {
	        Object.keys(obj.event).forEach(key =>
	        {
	            if (obj.event[key])
	                now.addEventListener(/** @type {keyof HTMLElementEventMap} */(key), obj.event[key]);
	        });
	    }
	    if (obj.child) // 若有子元素
	    {
	        obj.child.forEach(o => // 遍历
	        {
	            if (o)
	            {
	                if (o instanceof NElement)
	                    now.addChild(o);
	                else
	                    now.addChild(expEle(o));
	            }
	        });
	    }
	    if (obj.assembly)
	    {
	        obj.assembly.forEach(o =>
	        {
	            let e = o(now);
	            if (e)
	                now = e;
	        });
	    }
	    return now;
	}

	/**
	 * 遍历预处理
	 * @param {EDObj} obj
	 * @param {Object<string, any>} def
	 * @returns {EDObj}
	*/
	function preC(obj, def)
	{
	    /**
	     * 当前结果
	     * @type {EDObj}
	     */
	    let now = {};
	    /**
	     * 缓存当前定义 之后回退
	     * @type {EDObj}
	     */
	    let nowDef = {};
	    Object.keys(def).forEach(key => now[key] = def[key]);
	    Object.keys(obj).forEach(key =>
	    {
	        if (key != "child")
	        {
	            if (key[0] == "$")
	            {
	                let rKey = key.slice(1);
	                nowDef[rKey] = def[rKey];
	                now[rKey] = def[rKey] = obj[key];
	            }
	            else if (key.slice(-1) == "$")
	            {
	                let rKey = key.slice(0, -1);
	                nowDef[rKey] = def[rKey];
	                def[rKey] = obj[key];
	            }
	            else
	                now[key] = obj[key];
	        }
	    });

	    if (now.left && now.right && now.width)
	        delete (now.width);
	    if (now.top && now.bottom && now.height)
	        delete (now.height);

	    if (obj.child) // 若有子元素
	    {
	        /**
	         * @type {Array<EDObj | NElement>}
	        */
	        now.child = [];
	        obj.child.forEach(o => // 遍历
	        {
	            if (o)
	            {
	                if (o instanceof NElement)
	                    now.child.push(o);
	                else
	                    now.child.push(preC(o, def));
	            }
	        });
	    }
	    Object.keys(nowDef).forEach(key => def[key] = nowDef[key]);
	    return now;
	}

	/**
	 * 展开元素
	 * 将内容js对象转换为封装的HTML树
	 * 请不要转换不受信任的json
	 * @param {EDObj} obj EleData格式的对象
	 * @returns {NElement}
	*/
	function expandElement(obj)
	{
	    return expEle(preC(obj, {}));
	}

	/**
	 * 事件
	 * @template {keyof HTMLElementEventMap} T
	 */
	class NEvent
	{
	    /**
	     * @type {T}
	     */
	    eventName = null;
	    /**
	     * @type {function(HTMLElementEventMap[T]): any}
	     */
	    callback = null;

	    /**
	     * @param {T} key
	     * @param {function(HTMLElementEventMap[T]): any} callback
	     */
	    constructor(key, callback)
	    {
	        this.eventName = key;
	        this.callback = callback;
	    }

	    /**
	     * 将此特征应用于元素
	     * @param {NElement} e
	     */
	    apply(e)
	    {
	        e.addEventListener(this.eventName, this.callback);
	    }
	}

	/**
	 * 流水线
	 */
	class NAsse
	{
	    /**
	     * @type {function(NElement): void}
	     */
	    callback = null;

	    /**
	     * @param {function(NElement): void} callback
	     */
	    constructor(callback)
	    {
	        this.callback = callback;
	    }

	    /**
	     * 将此特征应用于元素
	     * @param {NElement} e
	     */
	    apply(e)
	    {
	        this.callback(e);
	    }
	}

	/**
	 * @typedef {(keyof HTMLElement & string) | (string & {})} keyObjectOfHtmlElementAttr
	 */
	/**
	 * 属性
	 * @template {keyObjectOfHtmlElementAttr} T
	 */
	class NAttr
	{
	    /**
	     * @type {T}
	     */
	    key = null;
	    /**
	     * 若为函数则应用时调用
	     * 若有返回值则赋值到属性
	     * @type {string | number | boolean | Function}
	     */
	    value = null;

	    /**
	     * @param {T} key
	     * @param {string | number | boolean | Function} value
	     */
	    constructor(key, value)
	    {
	        this.key = key;
	        this.value = value;
	    }

	    /**
	     * 将此特征应用于元素
	     * @param {NElement} e
	     */
	    apply(e)
	    {
	        if (typeof (this.value) == "function")
	        {
	            let cbRet = this.value(e.element[this.key]);
	            if (cbRet != undefined)
	                e.element[this.key] = cbRet;
	        }
	        else
	            e.element[this.key] = this.value;
	    }
	}

	/**
	 * 标签名
	 * 标签名使用小写字母
	 * 不包含此类的特征列表默认为div
	 * 一层特征列表只能有唯一tagName
	 * @template {keyof HTMLElementTagNameMap} T
	 */
	class NTagName
	{
	    /**
	     * @type {T}
	     */
	    tagName = null;

	    /**
	     * @param {T} tagName
	     */
	    constructor(tagName)
	    {
	        this.tagName = /** @type {T} */(tagName.toLowerCase());
	    }
	}

	/**
	 * 特征列表
	 * @typedef {Array<string | HookBindInfo | NTagName | NStyle | NAttr | NEvent | NAsse | NList | NList_list | NElement>} NList_list
	 */
	class NList
	{
	    /**
	     * @type {NList_list}
	     */
	    list = null;
	    /**
	     * 拉平特征
	     * (默认)标记为false将作为子元素节点
	     * 标记为true将作为上层节点的特征列表
	     * @type {boolean}
	     */
	    flatFlag = false;

	    /**
	     * @param {NList_list} list
	     */
	    constructor(list)
	    {
	        this.list = list;
	    }

	    /**
	     * 为元素应用特征列表
	     * @param {NElement<HTMLElement>} element
	     */
	    apply(element)
	    {
	        const tagName = element.getTagName();
	        this.list.forEach(o =>
	        {
	            if (typeof (o) == "string") // 内部文本
	                element.addText(o);
	            else
	            {
	                switch (Object.getPrototypeOf(o)?.constructor)
	                {
	                    case HookBindInfo:{ // 内部文本
	                        const hookInfo =  (/** @type {HookBindInfo} */(o));
	                        const text = element.addText(hookInfo.getValue());
	                        hookInfo.bindToValue(text, "data");
	                        break;
	                    }
	                    case NTagName: { // 标签名
	                        if (tagName != (/** @type {NTagName} */(o)).tagName)
	                            throw "(NList) The feature tagName does not match the element";
	                        break;
	                    }
	                    case NStyle: // 样式
	                    case NAttr: // 元素属性
	                    case NEvent: // 事件
	                    case NAsse: { // 流水线
	                        (/** @type {NStyle | NAttr | NEvent | NAsse} */(o)).apply(element);
	                        break;
	                    }
	                    case NElement: { // 子元素
	                        element.addChild(/** @type {NElement} */(o));
	                        break;
	                    }
	                    case NList: { // 子列表
	                        const childList = (/** @type {NList} */(o));
	                        if (childList.flatFlag) // 子特征(列表)
	                            childList.apply(element);
	                        else // 子元素(列表)
	                            element.addChild(childList.getElement());
	                        break;
	                    }
	                    case Array: { // 子元素(列表)
	                        element.addChild(NList.getElement((/** @type {Array} */(o))));
	                        break;
	                    }
	                    default:
	                        throw "(NList) Untractable feature types were found";
	                }
	            }
	        });
	    }

	    /**
	     * 获取列表的标签名
	     * @returns {string}
	     */
	    getTagName()
	    {
	        let ret = "";
	        this.list.forEach(o =>
	        {
	            let tagName = "";
	            if (o instanceof NTagName)
	                tagName = o.tagName;
	            else if ((o instanceof NList) && o.flatFlag)
	                tagName = o.getTagName();
	            if (tagName)
	            {
	                if (!ret)
	                    ret = tagName;
	                else if (ret != tagName)
	                    throw "(NList) Multiple TagNames exist in a feature list";
	            }
	        });
	        return ret;
	    }

	    /**
	     * 获取(生成)元素
	     * @returns {NElement}
	     */
	    getElement()
	    {
	        let tagName = this.getTagName();
	        if (tagName == "")
	            tagName = "div";
	        let ele = getNElement(document.createElement(tagName));
	        this.apply(ele);
	        return ele;
	    }

	    /**
	     * 生成拉平列表
	     * @param {NList_list} list
	     */
	    static flat(list)
	    {
	        let ret = new NList(list);
	        ret.flatFlag = true;
	        return ret;
	    }

	    /**
	     * 获取(生成)元素
	     * @param {NList_list} list
	     */
	    static getElement(list)
	    {
	        return (new NList(list)).getElement();
	    }
	}

	/**
	 * @typedef {(keyof CSSStyleDeclaration & string) | (string & {})} keyOfStyle
	 */
	/**
	 * 样式
	 * @template {keyOfStyle} T
	 */
	class NStyle
	{
	    /**
	     * @type {T}
	     */
	    key = null;
	    /**
	     * @type {string | HookBindInfo}
	     */
	    value = null;

	    /**
	     * @param {T} key
	     * @param {string | HookBindInfo} value
	     */
	    constructor(key, value)
	    {
	        this.key = key;
	        this.value = value;
	    }

	    /**
	     * 将此特征应用于元素
	     * @param {NElement} e
	     */
	    apply(e)
	    {
	        e.setStyle(this.key, this.value);
	    }
	}

	/**
	 * 创建NStyle 省略new
	 * @param {keyOfStyle} key
	 * @param {string | HookBindInfo} value
	 */
	function createNStyle(key, value)
	{
	    return new NStyle(key, value);
	}

	/**
	 * 创建一组NStyle的flat NList
	 * @param {Object<keyOfStyle, string | HookBindInfo>} obj
	 */
	function createNStyleList(obj)
	{
	    return NList.flat(Object.keys(obj).map(key => new NStyle(key, obj[key])));
	}

	/**
	 * 指针数据
	 * 当发生鼠标或触摸事件时传递
	 * 包含指针坐标和按下状态等数据
	 */
	class pointerData
	{
	    /**
	     * 当前指针位置x
	     * @type {number}
	    */
	    x = 0;
	    /**
	     * 当前指针位置y
	     * @type {number}
	    */
	    y = 0;
	    /**
	     * 指针位置和上次位置的变化x
	     * @type {number}
	    */
	    vx = 0;
	    /**
	     * 指针位置和上次位置的变化y
	     * @type {number}
	    */
	    vy = 0;
	    /**
	     * 此指针的起始位置x
	     * @type {number}
	    */
	    sx = 0;
	    /**
	     * 此指针的起始位置y
	     * @type {number}
	    */
	    sy = 0;
	    /**
	     * 当前此指针是否处于按下状态
	     * @type {boolean}
	    */
	    hold = false;
	    /**
	     * 当前指针是否正在按下(按下事件)
	     * @type {boolean}
	    */
	    pressing = false;
	    
	    /**
	     * @param {number} x
	     * @param {number} y
	     * @param {number} vx
	     * @param {number} vy
	     * @param {number} sx
	     * @param {number} sy
	     * @param {boolean} hold
	     * @param {boolean} pressing
	     */
	    constructor(x, y, vx, vy, sx, sy, hold, pressing)
	    {
	        this.x = x;
	        this.y = y;
	        this.vx = vx;
	        this.vy = vy;
	        this.sx = sx;
	        this.sy = sy;
	        this.hold = hold;
	        this.pressing = pressing;
	    }
	}

	/**
	 * 鼠标(拖拽)事件处理
	 * @param {NElement} element 绑定到元素
	 * @param {function(pointerData):void} callBack 回调
	 * @param {number} [button] 绑定的按键
	 */
	function mouseBind(element, callBack, button = 0)
	{
	    element.addEventListener("mousedown", (/** @type {MouseEvent} */ e) => mouseDown(e), false);

	    let mousemoveP = (/** @type {MouseEvent} */ e) => mouseMove(e);
	    let mouseupP = (/** @type {MouseEvent} */ e) => mouseUp(e);

	    let x = 0, y = 0;
	    let sx = 0, sy = 0;
	    let leftDown = false;
	    /**
	     * 鼠标处理函数(按下)
	     * @param {MouseEvent} e 
	     */
	    function mouseDown(e)
	    {
	        if (e.cancelable)
	            e.preventDefault();
	        sx = x = e.clientX;
	        sy = y = e.clientY;
	        window.addEventListener("mousemove", mousemoveP, true);
	        window.addEventListener("mouseup", mouseupP, true);
	        if (e.button == button)
	        {
	            leftDown = true;
	            callBack(new pointerData(
	                x, y,
	                0, 0,
	                x, y,
	                true, true
	            ));
	        }
	    }
	    /**
	     * 鼠标处理函数(移动)
	     * @param {MouseEvent} e 
	     */
	    function mouseMove(e)
	    {
	        if (leftDown)
	        {
	            // e.preventDefault();
	            let vx = e.clientX - x;
	            let vy = e.clientY - y;
	            x = e.clientX;
	            y = e.clientY;
	            callBack(new pointerData(
	                x, y,
	                vx, vy,
	                sx, sy,
	                true, false
	            ));
	        }
	    }
	    /**
	     * 鼠标处理函数(松开)
	     * @param {MouseEvent} e 
	     */
	    function mouseUp(e)
	    {
	        let vx = e.clientX - x;
	        let vy = e.clientY - y;
	        x = e.clientX;
	        y = e.clientY;
	        window.removeEventListener("mousemove", mousemoveP, false);
	        window.removeEventListener("mouseup", mouseupP, false);
	        if (leftDown && e.button == button)
	        {
	            leftDown = false;
	            callBack(new pointerData(
	                x, y,
	                vx, vy,
	                sx, sy,
	                false, false
	            ));
	        }
	    }
	}

	/**
	 * 触摸(拖拽) 事件处理
	 * @param {NElement} element 
	 * @param {function(pointerData):void} callBack
	 */
	function touchBind(element, callBack)
	{
	    element.addEventListener("touchstart", e => touchStart(/** @type {TouchEvent} */(e)), {
	        capture: false,
	        passive: false
	    });
	    element.addEventListener("touchmove", e => touchMove(/** @type {TouchEvent} */(e)), {
	        capture: false,
	        passive: true
	    });
	    element.addEventListener("touchend", e => touchEnd(/** @type {TouchEvent} */(e)), {
	        capture: false,
	        passive: true
	    });

	    let ogTouches = [];
	    /**
	     * 通过标识符取触摸点数据索引
	     * @param {any} id
	     * @returns {number}
	     */
	    function getTouchesInd(id)
	    {
	        let ret = -1;
	        ogTouches.forEach((o, i) =>
	        {
	            if (id == o.id)
	                ret = i;
	        });
	        return ret;
	    }
	    /**
	     * 触摸处理函数(按下)
	     * @param {TouchEvent} e 
	     */
	    function touchStart(e)
	    {
	        if (e.cancelable)
	            e.preventDefault();
	        forEach(e.touches, o =>
	        {
	            let t = {
	                id: o.identifier,
	                sx: o.clientX,
	                sy: o.clientY,
	                x: o.clientX,
	                y: o.clientY
	            };
	            ogTouches.push(t);
	            callBack(new pointerData(
	                t.x, t.y,
	                0, 0,
	                t.sx, t.sy,
	                true, true
	            ));
	        });
	    }
	    /**
	     * 触摸处理函数(移动)
	     * @param {TouchEvent} e 
	     */
	    function touchMove(e)
	    {
	        forEach(e.touches, o =>
	        {
	            let ind = getTouchesInd(o.identifier);
	            if (ind > -1)
	            {
	                let t = ogTouches[ind];
	                let vx = o.clientX - t.x;
	                let vy = o.clientY - t.y;
	                t.x = o.clientX;
	                t.y = o.clientY;
	                callBack(new pointerData(
	                    t.x, t.y,
	                    vx, vy,
	                    t.sx, t.sy,
	                    true, false
	                ));
	            }
	        });
	    }
	    /**
	     * 触摸处理函数(松开)
	     * @param {TouchEvent} e 
	     */
	    function touchEnd(e)
	    {
	        forEach(e.touches, o =>
	        {
	            let ind = getTouchesInd(o.identifier);
	            if (ind > -1)
	            {
	                let t = ogTouches[ind];
	                ogTouches.splice(ind, 1);
	                let vx = o.clientX - t.x;
	                let vy = o.clientY - t.y;
	                t.x = o.clientX;
	                t.y = o.clientY;
	                callBack(new pointerData(
	                    t.x, t.y,
	                    vx, vy,
	                    t.sx, t.sy,
	                    false, false
	                ));
	            }
	        });
	    }
	}

	/**
	 * document.body的NElement封装
	 */
	let body = getNElement(document.body);
	body.setStyle("cursor", "default");

	/**
	 * 按钮流水线
	 * @param {NElement} e
	 */
	function buttonAsse(e)
	{
	    e.setStyle("transition", "transform 50ms linear, text-shadow 150ms linear");

	    e.addEventListener("mousedown", () =>
	    {
	        e.setStyle("transform", "scale(0.95) translateY(2px)");
	    });
	    e.addEventListener("mouseup", () =>
	    {
	        e.setStyle("transform", "");
	    });

	    e.addEventListener("mouseenter", () =>
	    {
	        e.setStyle("textShadow", `0 0 0.3em ${cssG.rgb(255, 255, 255, 0.5)}`);
	        e.setStyle("transform", "translateY(-1px)");
	    });
	    e.addEventListener("mouseleave", () =>
	    {
	        e.setStyle("textShadow", "");
	        e.setStyle("transform", "");
	    });
	}

	var noticeContainer = expandElement({
	    position: "absolute",
	    right: "0px",
	    style: {
	        userSelect: "none",
	        pointerEvents: "none",
	        zIndex: "30000"
	    }
	});
	body.addChild(noticeContainer);

	/**
	 * 推送通知
	 * @param {string} title 
	 * @param {string} text 
	 * @param {string} [additional]
	 * @param {Function} [callback]
	 */
	function showNotice(title, text, additional = "iiroseForge", callback = null)
	{
	    let notice = expandElement({
	        style: {
	            backgroundColor: cssG.rgb(255, 255, 255, 0.95),
	            marginRight: "1em",
	            marginTop: "1em",
	            marginLeft: "1em",
	            float: "right",
	            clear: "both",
	            overflow: "hidden hidden",
	            padding: "1em",
	            boxSizing: "border-box",
	            minWidth: "180px",
	            borderRadius: "0.2em",
	            boxShadow: `${cssG.rgb(0, 0, 0, 0.5)} 5px 5px 10px`
	        },
	        position: "relative",
	        child: [{ // 通知图标
	            tagName: "i",
	            classList: ["fa", "fa-info-circle"]
	        }, { // 通知标题
	            text: title,
	            style: {
	                fontSize: "1.2em",
	                lineHeight: "1.5em",
	                fontWeight: "bolder"
	            }
	        }, { // 通知正文
	            text: text
	        }, { // 通知附加内容
	            text: additional,
	            style: {
	                fontSize: "0.9em",
	                float: "right"
	            }
	        }, { // 通知右上角关闭按钮
	            text: "×",
	            position: "absolute",
	            right: "4px",
	            top: "1px",
	            assembly: [buttonAsse],
	            style: {
	                fontSize: "25px",
	                lineHeight: "1em"
	            },
	            event: {
	                click: (/** @type {Event} */e) =>
	                {
	                    e.stopPropagation();
	                    closeThisNotice();
	                }
	            }
	        }]
	    });
	    noticeContainer.addChild(notice);
	    notice.animate([
	        {
	            transform: "translateX(180%) translateY(10%) scale(0.6)"
	        },
	        {
	        }
	    ], {
	        duration: 180
	    });
	    setTimeout(() => { notice.setStyle("pointerEvents", "auto"); }, 180);

	    let startClosing = false;
	    function closeThisNotice()
	    {
	        if (startClosing)
	            return;
	        startClosing = true;
	        notice.setStyle("pointerEvents", "none");
	        notice.animate([
	            {
	            },
	            {
	                transform: "translateX(180%)"
	            }
	        ], {
	            duration: 270,
	            fill: "forwards"
	        });
	        setTimeout(() =>
	        {
	            notice.setStyle("visibility", "hidden");
	            notice.animate([
	                {
	                    height: (/** @type {HTMLDivElement} */(notice.element)).clientHeight + "px"
	                },
	                {
	                    marginTop: 0,
	                    height: 0,
	                    padding: 0
	                }
	            ], {
	                duration: 150,
	                fill: "forwards"
	            });
	            setTimeout(() =>
	            {
	                notice.remove();
	            }, 150);
	        }, 270);
	    }

	    setTimeout(() =>
	    {
	        closeThisNotice();
	    }, 3900 + Math.min(10000, text.length * 115));

	    if (callback)
	    {
	        notice.asse(buttonAsse);
	        notice.addEventListener("click", () =>
	        {
	            closeThisNotice();
	            callback();
	        });
	    }
	}

	/**
	 * 事件处理器
	 * 可以定多个事件响应函数
	 * @template {*} T
	 */
	let EventHandler$1 = class EventHandler
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
	};

	/**
	 * 暴露的forge接口
	 */
	const forgeApi = {
	    /**
	     * 接口状态
	     */
	    state: {
	        /**
	         * 当前执行操作的插件
	         * @type {{ name: string }}
	         */
	        plug: null
	    },

	    /**
	     * 操作列表
	     */
	    operation: {
	        /**
	         * 显示forge通知
	         * @param {string} content
	         * @param {Function} callback
	         */
	        showForgeNotice: (content, callback) =>
	        {
	            content = String(content);
	            showNotice("插件提示", content, `插件 ${forgeApi.state.plug?.name}`, callback);
	        },


	        /**
	         * 获取用户蔷薇昵称
	         * @returns {string}
	         */
	        getUserName: () =>
	        {
	            if (iframeContext.iframeWindow?.["myself2"])
	                return iframeContext.iframeWindow["myself2"];
	            return null;
	        },

	        /**
	         * 获取用户蔷薇uid
	         * @returns {string}
	         */
	        getUserUid: () =>
	        {
	            if (iframeContext.iframeWindow?.["uid"])
	                return iframeContext.iframeWindow["uid"];
	            return null;
	        },

	        /**
	         * 获取用户蔷薇所在房间id
	         * @returns {string}
	         */
	        getUserRoomId: () =>
	        {
	            if (iframeContext.iframeWindow?.["roomn"])
	                return iframeContext.iframeWindow["roomn"];
	            return null;
	        },

	        /**
	         * 获取用户蔷薇头像url
	         * @returns {string}
	         */
	        getUserProfilePictureUrl: () =>
	        {
	            if (iframeContext.iframeWindow?.["avatar2"] && iframeContext.iframeWindow?.["avatarconv"])
	                return iframeContext.iframeWindow["avatarconv"](iframeContext.iframeWindow["avatar2"]);
	            return null;
	        },

	        /**
	         * 获取用户蔷薇输入颜色
	         * @returns {string}
	         */
	        getUserInputColor: () =>
	        {
	            if (iframeContext.iframeWindow?.["inputcolorhex"])
	                return iframeContext.iframeWindow["inputcolorhex"];
	            return null;
	        },

	        /**
	         * 在用户所在房间发送消息
	         * @param {string} content
	         */
	        sendRoomMessage: (content) =>
	        {
	            content = String(content);
	            if (!content)
	                return;
	            iframeContext.socketApi.send(JSON.stringify({
	                "m": content,
	                "mc": forgeApi.operation.getUserInputColor(),
	                "i": String(Date.now()).slice(-5) + String(Math.random()).slice(-7)
	            }));
	        },

	        /**
	         * 在用户所在房间发送消息
	         * @param {Object} obj
	         */
	        sendRoomForgePacket: (obj) =>
	        {
	            forgeApi.operation.sendRoomMessage(writeForgePacket(obj));
	        },

	        /**
	         * 静默发送私聊
	         * @param {string} targetUid
	         * @param {string} context
	         */
	        sendPrivateMessageSilence: (targetUid, context) =>
	        {
	            targetUid = String(targetUid);
	            context = String(context);
	            if (!context || !targetUid)
	                return;
	            iframeContext.socketApi.send(JSON.stringify({
	                "g": targetUid,
	                "m": context,
	                "mc": forgeApi.operation.getUserInputColor(),
	                "i": String(Date.now()).slice(-5) + String(Math.random()).slice(-7)
	            }));
	        },

	        /**
	         * 发送私聊
	         * @param {string} targetUid
	         * @param {string} content
	         */
	        sendPrivateMessage: (targetUid, content) =>
	        {
	            targetUid = String(targetUid);
	            content = String(content);
	            if (!content || !targetUid || !iframeContext.iframeWindow?.["msgfetch"] || !iframeContext.iframeWindow?.["Variable"]?.pmObjJson || !iframeContext.iframeWindow?.["Utils"]?.service?.buildPmHelper)
	                return;
	            let inputBox = /** @type {HTMLInputElement} */(iframeContext.iframeDocument.getElementById("moveinput"));
	            let oldValue = inputBox.value;
	            let old_pmFull = iframeContext.iframeWindow["pmFull"];
	            inputBox.value = content;
	            iframeContext.iframeWindow["pmFull"] = true;
	            if (!iframeContext.iframeWindow["Variable"].pmObjJson?.[targetUid])
	                iframeContext.iframeWindow["Utils"].service.buildPmHelper(1, targetUid, targetUid);
	            iframeContext.iframeWindow["msgfetch"](0, iframeContext.iframeWindow["Variable"].pmObjJson?.[targetUid], targetUid, "");
	            iframeContext.iframeWindow["pmFull"] = old_pmFull;
	            inputBox.value = oldValue;
	        },

	        /**
	         * 静默给自己发送私聊
	         * @param {string} content
	         */
	        sendSelfPrivateMessageSilence: (content) =>
	        {
	            forgeApi.operation.sendPrivateMessageSilence(forgeApi.operation.getUserUid(), content);
	        },

	        /**
	         * 点赞
	         * @param {string} targetUid
	         * @param {string} [content]
	         */
	        giveALike: (targetUid, content = "") =>
	        {
	            targetUid = String(targetUid);
	            content = String(content);
	            if (!targetUid)
	                return;
	            iframeContext.socketApi.send(`+*${targetUid}${content ? " " + content : ""}`);
	        },

	        /**
	         * 切换房间
	         * @param {string} roomId
	         */
	        switchRoom: (roomId) =>
	        {
	            roomId = String(roomId);
	            if (iframeContext.iframeWindow?.["Objs"]?.mapHolder?.function?.roomchanger)
	                iframeContext.iframeWindow["Objs"].mapHolder.function.roomchanger(roomId);
	        }
	    },

	    /**
	     * 事件列表
	     */
	    event: {
	        /**
	         * 接收到房间消息
	         * @type {EventHandler<{ senderId: string, senderName: string, content: string }>}
	         */
	        roomMessage: new EventHandler$1(),

	        /**
	         * 接受到私聊消息
	         * 不包括自己发出的
	         * 不包括自己发送给自己的
	         * @type {EventHandler<{ senderId: string, senderName: string, content: string }>}
	         */
	        privateMessage: new EventHandler$1(),

	        /**
	         * 接受到自己发送给自己的私聊消息
	         * @type {EventHandler<{ content: string }>}
	         */
	        selfPrivateMessage: new EventHandler$1(),

	        /**
	         * 接收到房间的forge数据包
	         * @type {EventHandler<{ senderId: string, senderName: string, content: Object }>}
	         */
	        roomForgePacket: new EventHandler$1()
	    }
	};

	window["iiroseForgeApi"] = forgeApi;

	/**
	 * 字典树
	 */
	class Trie
	{
	    /**
	     * 根节点
	     */
	    #root = new TrieNode();

	    /**
	     * 添加路径
	     * @param {string} pathStr
	     * @param {(restStr: string, srcStr: string) => void} callback
	     */
	    addPath(pathStr, callback)
	    {
	        this.#root.addPath(pathStr, 0, callback);
	    }

	    /**
	     * 匹配前缀
	     * @param {string} str 
	     */
	    matchPrefix(str)
	    {
	        return this.#root.matchPrefix(str, 0);
	    }
	}

	/**
	 * 字典树的节点
	 */
	class TrieNode
	{
	    /**
	     * 子节点
	     * @type {Map<string, TrieNode>}
	     */
	    #childs = new Map();

	    /**
	     * 回调函数
	     * @type {(restStr: string, srcStr:string) => void}
	     */
	    #callback = null;

	    /**
	     * 添加路径
	     * @param {string} pathStr
	     * @param {number} pathInd
	     * @param {(restStr: string, srcStr:string) => void} callback
	     */
	    addPath(pathStr, pathInd, callback)
	    {
	        if (pathInd >= pathStr.length)
	        {
	            this.#callback = callback;
	        }
	        else
	        {
	            let child = this.#childs.get(pathStr[pathInd]);
	            if (child == undefined)
	            {
	                child = new TrieNode();
	                this.#childs.set(pathStr[pathInd], child);
	            }
	            child.addPath(pathStr, pathInd + 1, callback);
	        }
	    }

	    /**
	     * 匹配前缀
	     * @param {string} str
	     * @param {number} strInd
	     */
	    matchPrefix(str, strInd)
	    {
	        if (strInd >= str.length)
	        {
	            return this.#callback?.("", str);
	        }
	        else
	        {
	            let child = this.#childs.get(str[strInd]);
	            if (child != undefined)
	                return child.matchPrefix(str, strInd + 1);
	            else
	                return this.#callback?.(str.slice(strInd), str);
	        }
	    }
	}

	let toServerTrie = new Trie();
	let toClientTrie = new Trie();
	/**
	 * 数据包内容
	 * 将改变实际发送或接收的包的内容
	 * @type {[string]}
	 */
	let packageData = [""];

	toClientTrie.addPath(`"`, (data) =>
	{
	    packageData[0] = `"` + data.split("<").reverse().map(data =>
	    {
	        let part = data.split(">");
	        if (part[4] != "s" && part[3][0] != `'`)
	        {
	            let senderId = part[8];
	            let senderName = part[2];
	            let content = part[3];

	            let forgePacket = readForgePacket(content);
	            if (forgePacket != undefined)
	            {
	                forgeApi.event.roomForgePacket.trigger({
	                    senderId: senderId,
	                    senderName: senderName,
	                    content: forgePacket
	                });
	                // console.log("forgePacket", senderId, senderName, forgePacket);
	                return undefined;
	            }
	            else
	                forgeApi.event.roomMessage.trigger({
	                    senderId: senderId,
	                    senderName: senderName,
	                    content: content
	                });
	        }
	        return data;
	    }).filter(o => o != undefined).reverse().join("<");
	});

	toClientTrie.addPath(`""`, (data) =>
	{
	    let userId = forgeApi.operation.getUserUid();
	    packageData[0] = `""` + data.split("<").map(data =>
	    {
	        let part = data.split(">");
	        if (part[6] == "")
	        {
	            let senderId = part[1];
	            let senderName = part[2];
	            let content = part[4];

	            if (part[1] != userId)
	            {
	                forgeApi.event.privateMessage.trigger({
	                    senderId: senderId,
	                    senderName: senderName,
	                    content: content
	                });
	            }
	            else if (part[1] == userId && part[11] == userId)
	            {
	                forgeApi.event.selfPrivateMessage.trigger({
	                    content: part[4]
	                });
	            }
	        }
	        return part;
	    }).filter(o => o != undefined).join("<");
	});




	/**
	 * 客户端到服务器
	 * @param {[string]} data 
	 */
	function toServer(data)
	{
	    packageData = data;
	    return toServerTrie.matchPrefix(data[0]);
	}

	/**
	 * 服务器到客户端
	 * @param {[string]} data 
	 */
	function toClient(data)
	{
	    packageData = data;
	    return toClientTrie.matchPrefix(data[0]);
	}

	const versionInfo = {
	    version: "alpha v1.0.1"
	};

	let iiroseForgeLoaderUrl = "https://qwq0.github.io/iiroseForge/l.js";
	let iiroseForgeLoaderElementHtml = `<script type="text/javascript" src="${iiroseForgeLoaderUrl}"></script>`;

	/**
	 * 向缓存中注入iiroseForge
	 * @returns {Promise<void>}
	 */
	async function writeForgeToCache()
	{
	    let cache = await caches.open("v");
	    let cacheMainPage = await (await caches.match("/")).text();
	    if (cacheMainPage.indexOf(iiroseForgeLoaderElementHtml) > -1)
	        return;
	    let insertIndex = cacheMainPage.indexOf("</body></html>");
	    if (insertIndex == -1)
	        return;
	    let newCacheMainPage = cacheMainPage.slice(0, insertIndex) + iiroseForgeLoaderElementHtml + cacheMainPage.slice(insertIndex);
	    await cache.put("/", new Response(new Blob([newCacheMainPage], { type: "text/html" }), { status: 200, statusText: "OK" }));
	}
	/**
	 * 从缓存中清除iiroseForge的注入
	 * @returns {Promise<void>}
	 */
	async function removeForgeFromCache()
	{
	    let cache = await caches.open("v");
	    let cacheMainPage = await (await caches.match("/")).text();
	    let removeIndex = cacheMainPage.indexOf(iiroseForgeLoaderElementHtml);
	    if (removeIndex == -1)
	        return;
	    let newCacheMainPage = cacheMainPage.slice(0, removeIndex) + cacheMainPage.slice(removeIndex + iiroseForgeLoaderElementHtml.length);
	    await cache.put("/", new Response(new Blob([newCacheMainPage], { type: "text/html" }), { status: 200, statusText: "OK" }));
	}

	let sandboxScript = "!function(){\"use strict\";function e(e=2){var t=Math.floor(Date.now()).toString(36);for(let a=0;a<e;a++)t+=\"-\"+Math.floor(1e12*Math.random()).toString(36);return t}function t(t,a){let r=new Map;let n=function t(n){if(\"function\"==typeof n){let t={},s=e();return a.set(s,n),r.set(t,s),t}if(\"object\"==typeof n){if(Array.isArray(n))return n.map(t);{let e={};return Object.keys(n).forEach((a=>{e[a]=t(n[a])})),e}}return n}(t);return{result:n,fnMap:r}}const a=new FinalizationRegistry((({id:e,port:t})=>{t.postMessage({type:\"rF\",id:e})}));function r(r,n,s,i,o){let p=new Map;n.forEach(((r,n)=>{if(!p.has(r)){let n=(...a)=>new Promise(((n,p)=>{let l=t(a,i),d=e();i.set(d,n),o.set(d,p),s.postMessage({type:\"fn\",id:r,param:l.result,fnMap:l.fnMap.size>0?l.fnMap:void 0,cb:d})}));p.set(r,n),a.register(n,{id:r,port:s})}}));const l=e=>{if(\"object\"==typeof e){if(n.has(e))return p.get(n.get(e));if(Array.isArray(e))return e.map(l);{let t={};return Object.keys(e).forEach((a=>{t[a]=l(e[a])})),t}}return e};return{result:l(r)}}(()=>{let e=null,a=new Map,n=new Map;window.addEventListener(\"message\",(s=>{\"setMessagePort\"==s.data&&null==e&&(e=s.ports[0],Object.defineProperty(window,\"iframeSandbox\",{configurable:!1,writable:!1,value:{}}),e.addEventListener(\"message\",(async s=>{let i=s.data;switch(i.type){case\"execJs\":new Function(...i.paramList,i.js)(i.fnMap?r(i.param,i.fnMap,e,a,n).result:i.param);break;case\"fn\":if(a.has(i.id)){let s=i.fnMap?r(i.param,i.fnMap,e,a,n).result:i.param;try{let r=await a.get(i.id)(...s);if(i.cb){let n=t(r,a);e.postMessage({type:\"sol\",id:i.cb,param:[n.result],fnMap:n.fnMap.size>0?n.fnMap:void 0})}}catch(t){i.cb&&e.postMessage({type:\"rej\",id:i.cb,param:[t]})}}break;case\"rF\":a.delete(i.id);break;case\"sol\":{let t=i.fnMap?r(i.param,i.fnMap,e,a,n).result:i.param;a.has(i.id)&&a.get(i.id)(...t),a.delete(i.id),n.delete(i.id);break}case\"rej\":n.has(i.id)&&n.get(i.id)(...i.param),a.delete(i.id),n.delete(i.id)}})),e.start(),e.postMessage({type:\"ready\"}))})),window.addEventListener(\"load\",(e=>{console.log(\"sandbox onload\")}))})()}();";

	/**
	 * 生成唯一字符串
	 * 基于毫秒级时间和随机数
	 * 不保证安全性
	 * @param {number} [randomSection] 随机节数量
	 * @returns {string}
	 */
	function uniqueIdentifierString(randomSection = 2)
	{
	    var ret = Math.floor(Date.now()).toString(36);
	    for (let i = 0; i < randomSection; i++)
	        ret += "-" + Math.floor(Math.random() * 1e12).toString(36);
	    return ret;
	}

	/**
	 * 提取对象中的函数
	 * @param {Object} obj
	 * @param {Map<string, Function>} callbackMap
	 */
	function extractFunction(obj, callbackMap)
	{
	    let functionMap = new Map();

	    /**
	     * 遍历对象过滤函数
	     * @param {any} now 
	     * @returns {any}
	     */
	    function traversal(now)
	    {
	        if (typeof (now) == "function")
	        {
	            let ret = {};
	            let functionId = uniqueIdentifierString();
	            callbackMap.set(functionId, now);
	            functionMap.set(ret, functionId);
	            return ret;
	        }
	        else if (typeof (now) == "object")
	        {
	            if (Array.isArray(now))
	            {
	                return now.map(traversal);
	            }
	            else
	            {
	                let ret = {};
	                Object.keys(now).forEach(key =>
	                {
	                    ret[key] = traversal(now[key]);
	                });
	                return ret;
	            }
	        }
	        else
	            return now;
	    }
	    let result = traversal(obj);

	    return ({
	        result: result,
	        fnMap: functionMap
	    });
	}


	const functionFinalizationRegistry = new FinalizationRegistry((/** @type {{ id: string, port: MessagePort }} */{ id, port }) =>
	{
	    port.postMessage({
	        type: "rF",
	        id: id
	    });
	});

	/**
	 * 将函数注入回对象
	 * @param {Object} obj 
	 * @param {Map<Object, string>} fnMap 
	 * @param {MessagePort} port
	 * @param {Map<string, Function>} callbackMap
	 * @param {Map<string, Function>} callbackRejectMap
	 */
	function injectFunction(obj, fnMap, port, callbackMap, callbackRejectMap)
	{
	    /**
	     * @type {Map<string, Function>}
	     */
	    let generatedFunctionMap = new Map();
	    fnMap.forEach((id, functionObj) =>
	    {
	        if (!generatedFunctionMap.has(id))
	        {
	            let generatedFunction = (...param) =>
	            {
	                return new Promise((resolve, reject) =>
	                {
	                    let result = extractFunction(param, callbackMap);
	                    let callbackId = uniqueIdentifierString();
	                    callbackMap.set(callbackId, resolve);
	                    callbackRejectMap.set(callbackId, reject);
	                    port.postMessage({
	                        type: "fn",
	                        id: id,
	                        param: result.result,
	                        fnMap: (result.fnMap.size > 0 ? result.fnMap : undefined),
	                        cb: callbackId
	                    });
	                });
	            };
	            generatedFunctionMap.set(id, generatedFunction);
	            functionFinalizationRegistry.register(generatedFunction, {
	                id: id,
	                port: port
	            });
	        }
	    });

	    /**
	     * 遍历对象嵌入函数
	     * @param {any} now 
	     * @returns {any}
	     */
	    const traversal = (now) =>
	    {
	        if (typeof (now) == "object")
	        {
	            if (fnMap.has(now))
	            {
	                return generatedFunctionMap.get(fnMap.get(now));
	            }
	            else if (Array.isArray(now))
	            {
	                return now.map(traversal);
	            }
	            else
	            {
	                let ret = {};
	                Object.keys(now).forEach(key =>
	                {
	                    ret[key] = traversal(now[key]);
	                });
	                return ret;
	            }
	        }
	        else
	            return now;
	    };
	    let result = traversal(obj);

	    return ({
	        result: result
	    });
	}

	/**
	 * 事件处理器
	 * 可以定多个事件响应函数
	 * @template {*} T
	 */
	class EventHandler
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
	        this.cbList.forEach(o => { o(e); });
	        this.onceCbList.forEach(o => { o(e); });
	        this.onceCbList = [];
	    }
	}

	/**
	 * 沙箱上下文
	 */
	class SandboxContext
	{
	    /**
	     * 沙箱iframe元素
	     * @type {HTMLIFrameElement}
	     */
	    #iframe = null;

	    /**
	     * 与沙箱的通信端口
	     * @type {MessagePort}
	     */
	    #port = null;

	    /**
	     * 沙箱可用
	     * @type {boolean}
	     */
	    #available = false;

	    /**
	     * 沙箱已销毁
	     * @type {boolean}
	     */
	    #destroyed = false;

	    /**
	     * 中止控制器
	     * 用于销毁沙箱时中止
	     * @type {AbortController}
	     */
	    #abortController = new AbortController();

	    /**
	     * 沙箱可用事件
	     * @type {EventHandler}
	     */
	    #availableEvent = new EventHandler();

	    /**
	     * 传递给沙箱的接口
	     * @type {Object}
	     */
	    apiObj = {};

	    /**
	     * 回调映射
	     * @type {Map<string, Function>}
	     */
	    #callbackMap = new Map();

	    /**
	     * 拒绝回调映射
	     * @type {Map<string, Function>}
	     */
	    #callbackRejectMap = new Map();

	    /**
	     * @param {HTMLElement} [iframeElementParent]
	     */
	    constructor(iframeElementParent = document.body)
	    {
	        if (!(("sandbox" in HTMLIFrameElement.prototype) && Object.hasOwn(HTMLIFrameElement.prototype, "contentDocument")))
	            throw "sandbox property are not supported";
	        let iframe = document.createElement("iframe");
	        iframe.sandbox.add("allow-scripts");
	        iframe.style.display = "none";
	        iframe.srcdoc = ([
	            "<!DOCTYPE html>",
	            "<html>",

	            "<head>",
	            '<meta charset="utf-8" />',
	            '<title>iframe sandbox</title>',
	            '<meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no" />',
	            "</head>",

	            "<body>",
	            "<script>",
	            sandboxScript,
	            "</script>",
	            "</body>",

	            "</html>"
	        ]).join("");


	        let channel = new MessageChannel();
	        let port = channel.port1;
	        port.addEventListener("message", async (e) =>
	        {
	            let data = e.data;
	            switch (data.type)
	            {
	                case "ready": {
	                    this.#available = true;
	                    this.#availableEvent.trigger();
	                    break;
	                }
	                case "fn": {
	                    if (this.#callbackMap.has(data.id))
	                    {
	                        let param = (data.fnMap ? injectFunction(data.param, data.fnMap, port, this.#callbackMap, this.#callbackRejectMap).result : data.param);
	                        try
	                        {
	                            let retValue = await this.#callbackMap.get(data.id)(...param);
	                            if (data.cb)
	                            {
	                                let result = extractFunction(retValue, this.#callbackMap);
	                                port.postMessage({
	                                    type: "sol",
	                                    id: data.cb,
	                                    param: [result.result],
	                                    fnMap: (result.fnMap.size > 0 ? result.fnMap : undefined)
	                                });
	                            }
	                        }
	                        catch (err)
	                        {
	                            if (data.cb)
	                                port.postMessage({
	                                    type: "rej",
	                                    id: data.cb,
	                                    param: [err]
	                                });
	                        }
	                    }
	                    break;
	                }
	                case "rF": {
	                    this.#callbackMap.delete(data.id);
	                    break;
	                }
	                case "sol": {
	                    let param = (data.fnMap ? injectFunction(data.param, data.fnMap, port, this.#callbackMap, this.#callbackRejectMap).result : data.param);
	                    if (this.#callbackMap.has(data.id))
	                        this.#callbackMap.get(data.id)(...param);
	                    this.#callbackMap.delete(data.id);
	                    this.#callbackRejectMap.delete(data.id);
	                    break;
	                }
	                case "rej": {
	                    if (this.#callbackRejectMap.has(data.id))
	                        this.#callbackRejectMap.get(data.id)(...data.param);
	                    this.#callbackMap.delete(data.id);
	                    this.#callbackRejectMap.delete(data.id);
	                    break;
	                }
	            }
	        }, { signal: this.#abortController.signal });
	        iframe.addEventListener("load", () =>
	        {
	            if (!this.#available && !this.#destroyed)
	            {
	                if (iframe.contentDocument)
	                    throw "sandbox isolation failed";
	                port.start();
	                iframe.contentWindow.postMessage("setMessagePort", "*", [channel.port2]); // 初始化通信管道
	            }
	        }, { signal: this.#abortController.signal });


	        iframeElementParent.appendChild(iframe);
	        this.#iframe = iframe;
	        this.#port = port;
	    }

	    /**
	     * 等待沙箱可用
	     * @returns {Promise<void>}
	     */
	    async waitAvailable()
	    {
	        return new Promise((resolve, reject) =>
	        {
	            if (this.#available)
	                resolve();
	            else
	                this.#availableEvent.addOnce(resolve);
	        });
	    }

	    /**
	     * 执行js代码
	     * @param {string} jsCodeStr
	     * @returns {Promise<void>}
	     */
	    async execJs(jsCodeStr)
	    {
	        if (!this.#available)
	            await this.waitAvailable();
	        let result = extractFunction(this.apiObj, this.#callbackMap);
	        this.#port.postMessage({
	            type: "execJs",
	            js: jsCodeStr,
	            param: result.result,
	            fnMap: (result.fnMap.size > 0 ? result.fnMap : undefined),
	            paramList: ["api"]
	        });
	    }

	    /**
	     * 获取iframe元素
	     * 注意 移动沙箱在dom树中的位置将导致沙箱失效
	     */
	    get iframe()
	    {
	        return this.#iframe;
	    }

	    /**
	     * 销毁沙箱
	     * 销毁后无法对此沙箱执行操作
	     */
	    destroy()
	    {
	        if (this.#destroyed)
	            return;
	        this.#destroyed = true;
	        this.#iframe.remove();
	        this.#iframe = null;
	        this.#abortController.abort();
	        this.#abortController = null;
	        this.#port.close();
	        this.#port = null;
	        this.#callbackMap = null;
	        this.#callbackRejectMap = null;
	        this.#availableEvent.removeAll();
	        this.#availableEvent = null;
	        this.#available = false;
	    }
	}

	/**
	 * 储存上下文
	 * 将使用json进行序列化
	 */
	const storageContext = {
	    iiroseForge: {
	        /**
	         * 插件信息
	         * @type {Array<[string, string, Array<string>, Array<string>]>}
	         */
	        plugInfo: []
	    }
	};

	storageRead();

	function storageRead()
	{
	    try
	    {
	        let storageJson = localStorage.getItem("iiroseForge");
	        if (!storageJson)
	            return;
	        let storageObj = JSON.parse(storageJson);
	        Object.keys(storageObj).forEach(key =>
	        {
	            storageContext.iiroseForge[key] = storageObj[key];
	        });
	    }
	    catch (err)
	    {
	        showNotice("错误", "无法读入储存 这可能导致iiroseForge配置丢失");
	    }
	}

	function storageSave()
	{
	    try
	    {
	        let storageJson = JSON.stringify(storageContext.iiroseForge);
	        localStorage.setItem("iiroseForge", storageJson);
	    }
	    catch (err)
	    {
	        showNotice("错误", "无法写入储存 这可能导致iiroseForge配置丢失");
	    }
	}

	/**
	 * 插件请求的权限列表
	 */
	const apiPermission = {
	    operation: {
	        showForgeNotice: "显示forge通知",
	        getUserName: "获取你的昵称",
	        getUserUid: "获取你的uid",
	        getUserRoomId: "获取所在房间id",
	        getUserProfilePictureUrl: "获取你的头像",
	        getUserInputColor: "获取你的主题色",
	        sendRoomMessage: "在房间中发送信息",
	        sendRoomForgePacket: "在房间中发送forge数据包",
	        sendPrivateMessageSilence: "[危险]静默发送私聊消息",
	        sendPrivateMessage: "[危险]发送私聊消息",
	        sendSelfPrivateMessageSilence: "向自己静默发送私聊消息(同账号多设备间通信)",
	        giveALike: "进行点赞",
	        switchRoom: "切换所在房间"
	    },
	    event: {
	        roomMessage: "接收房间消息",
	        roomForgePacket: "接收房间forge数据包",
	        privateMessage: "[危险]接收私聊消息",
	        selfPrivateMessage: "接收自己(其他设备)发送给自己的私聊消息"
	    }
	};

	/**
	 * 显示信息框
	 * @async
	 * @param {string} title
	 * @param {string} text
	 * @param {boolean} [allowCancel]
	 * @param {Array<NElement>} [extraEle]
	 * @returns {Promise<boolean>}
	 */
	function showInfoBox(title, text, allowCancel = false, ...extraEle)
	{
	    return new Promise(resolve =>
	    {
	        /**
	         * @type {NElement}
	         */
	        var infoBox = undefined;
	        var infoBoxHolder = expandElement({ // 背景
	            width: "100%", height: "100%",
	            $position: "absolute",
	            style: {
	                userSelect: "none",
	                backgroundColor: cssG.rgb(0, 0, 0, 0.7),
	                alignItems: "center",
	                justifyContent: "center",
	                zIndex: "30001"
	            },
	            assembly: [e =>
	            {
	                e.animate([
	                    {
	                        opacity: 0.1
	                    },
	                    {
	                        opacity: 1
	                    }
	                ], {
	                    duration: 120
	                });
	            }],
	            display: "flex",
	            child: [{ // 信息框
	                style: {
	                    border: "1px white solid",
	                    backgroundColor: cssG.rgb(255, 255, 255, 0.95),
	                    color: cssG.rgb(0, 0, 0),
	                    alignItems: "center",
	                    justifyContent: "center",
	                    flexFlow: "column",
	                    lineHeight: "35px",
	                    minHeight: "190px",
	                    minWidth: "280px",
	                    maxWidth: "95%",
	                    boxSizing: "border-box",
	                    padding: "20px",
	                    borderRadius: "7px",
	                    pointerEvents: "none"
	                },
	                assembly: [e =>
	                {
	                    e.animate([
	                        {
	                            transform: "scale(0.9) translateY(-100px)"
	                        },
	                        {
	                        }
	                    ], {
	                        duration: 120
	                    });
	                    setTimeout(() => { e.setStyle("pointerEvents", "auto"); }, 120);
	                }, e => { infoBox = e; }],
	                position$: "static",
	                display: "flex",
	                child: [{
	                    text: title
	                }, {
	                    text: text
	                }, ...extraEle, {
	                    text: "确定",
	                    assembly: [buttonAsse],
	                    event: {
	                        click: () =>
	                        {
	                            closeInfoBox();
	                            resolve(true);
	                        }
	                    }
	                },
	                (allowCancel ? {
	                    text: "取消",
	                    assembly: [buttonAsse],
	                    event: {
	                        click: () =>
	                        {
	                            closeInfoBox();
	                            resolve(false);
	                        }
	                    }
	                } : null)]
	            }]
	        });
	        function closeInfoBox()
	        {
	            infoBox.setStyle("pointerEvents", "none");
	            infoBox.animate([
	                {
	                },
	                {
	                    transform: "scale(0.9) translateY(-100px)"
	                }
	            ], {
	                duration: 120,
	                fill: "forwards"
	            });
	            infoBoxHolder.animate([
	                {
	                    opacity: 1
	                },
	                {
	                    opacity: 0.1
	                }
	            ], {
	                duration: 120,
	                fill: "forwards"
	            });
	            setTimeout(() =>
	            {
	                infoBoxHolder.remove();
	            }, 120);
	        }
	        body.addChild(infoBoxHolder);
	    });
	}

	/**
	 * 显示输入框
	 * @async
	 * @param {string} title
	 * @param {string} text
	 * @param {boolean} [allowCancel]
	 * @param {string} [initValue]
	 * @returns {Promise<string>}
	 */
	async function showInputBox(title, text, allowCancel = false, initValue = "")
	{
	    var input = expandElement({
	        tagName: "input",
	        assembly: [buttonAsse],
	        style: {
	            textAlign: "center",
	            margin: "15px"
	        },
	        attr: {
	            value: initValue
	        }
	    });
	    input.addEventListener("keydown", e => { e.stopPropagation(); }, true);
	    var confirm = await showInfoBox(title, text, allowCancel, input);
	    return (confirm ? input.element.value : undefined);
	}

	/**
	 * 在悬浮窗中创建插件沙箱
	 * 以便插件显示ui
	 */
	function createPlugSandboxWithWindow()
	{
	    let x = 0, y = 0;
	    /**
	     * @type {NElement}
	     */
	    let iframeHolder = null;
	    /**
	     * @type {NElement<HTMLIFrameElement>}
	     */
	    let iframe = null;
	    let windowElement = NList.getElement([
	        createNStyleList({
	            display: "none",
	            position: "fixed",
	            overflow: "hidden",
	            border: "1px white solid",
	            backgroundColor: "rgba(30, 30, 30, 0.85)",
	            backdropFilter: "blur(2px)",
	            color: "rgba(255, 255, 255)",
	            alignItems: "center",
	            justifyContent: "center",
	            flexFlow: "column",
	            lineHeight: "1.1em",
	            boxSizing: "border-box",
	            padding: "10px",
	            borderRadius: "3px",
	            pointerEvents: "none",
	            resize: "both",
	            boxShadow: `rgba(0, 0, 0, 0.5) 5px 5px 10px`,
	            zIndex: "20001",
	            height: "190px",
	            width: "280px"
	        }),

	        /*
	        new NAsse(e =>
	        {
	            e.animate([
	                {
	                    transform: "scale(0.9) translateY(-100px)"
	                },
	                {
	                }
	            ], {
	                duration: 120
	            });
	            setTimeout(() => { e.setStyle("pointerEvents", "auto"); }, 120);
	        }),
	        */

	        [
	            "plug-in",
	            createNStyleList({
	                position: "absolute",
	                left: "0",
	                top: "0",
	                right: "0",
	                cursor: "move",
	                lineHeight: "1.5em",
	                backgroundColor: "rgba(100, 100, 100, 0.2)"
	            }),
	            new NAsse(e =>
	            {
	                var ox = 0, oy = 0;
	                var proc = (/** @type {{ sx: number, sy: number, x: number, y: number, pressing: boolean,hold: boolean }} */ o) =>
	                {
	                    if (o.hold)
	                    {
	                        if (o.pressing)
	                        {
	                            ox = x;
	                            oy = y;
	                            // pageManager.moveToTop(this);
	                        }
	                        x = ox + o.x - o.sx;
	                        y = oy + o.y - o.sy;
	                        if (x < 0)
	                            x = 0;
	                        else if (x >= body.element.clientWidth - windowElement.element.offsetWidth)
	                            x = body.element.clientWidth - windowElement.element.offsetWidth;
	                        if (y < 0)
	                            y = 0;
	                        else if (y >= body.element.clientHeight - windowElement.element.offsetHeight)
	                            y = body.element.clientHeight - windowElement.element.offsetHeight;
	                        windowElement.setStyle("left", `${x}px`);
	                        windowElement.setStyle("top", `${y}px`);
	                        iframe.setStyle("pointerEvents", "none");
	                    }
	                    else
	                        iframe.setStyle("pointerEvents", "auto");
	                };
	                mouseBind(e, proc);
	                touchBind(e, proc);
	            })
	        ],

	        [ // 右上角最小化按钮
	            "-",
	            createNStyleList({
	                position: "absolute",
	                right: "4px",
	                top: "1px",
	                cursor: "default",
	                fontSize: "1.5em",
	                lineHeight: "1em"
	            }),
	            new NEvent("click", () =>
	            {
	                windowElement.setDisplay("none");
	            })
	        ],

	        [ // 页面主体
	            createNStyleList({
	                position: "absolute",
	                top: "1.5em",
	                bottom: "0",
	                left: "0",
	                right: "0",
	                overflow: "auto",
	            }),
	            new NAsse(o => { iframeHolder = o; })
	        ]
	    ]);
	    body.addChild(windowElement);
	    new ResizeObserver(() =>
	    {
	        if (x > body.element.clientWidth - windowElement.element.offsetWidth)
	            windowElement.setStyle("width", `${body.element.clientWidth - x}px`);
	        if (y > body.element.clientHeight - windowElement.element.offsetHeight)
	            windowElement.setStyle("height", `${body.element.clientHeight - y}px`);
	        if (x < 0)
	        {
	            x = 0;
	            windowElement.setStyle("left", `${x}px`);
	        }
	        if (y < 0)
	        {
	            y = 0;
	            windowElement.setStyle("top", `${y}px`);
	        }
	    }).observe(windowElement.element);
	    let sandbox = new SandboxContext(iframeHolder.element);
	    iframe = getNElement(sandbox.iframe);
	    iframe.setStyles({
	        display: "block",
	        border: "none",
	        height: "100%",
	        width: "100%"
	    });
	    return ({
	        windowElement: windowElement,
	        sandbox: sandbox
	    });
	}

	/**
	 * 加载插件
	 * @param {string} plugName
	 * @param {string} scriptUrl
	 * @param {{operationPermissionSet: Set, eventPermissionSet: Set }} [permission]
	 */
	async function loadPlugIn(plugName, scriptUrl, permission)
	{
	    let { sandbox, windowElement } = createPlugSandboxWithWindow();
	    await sandbox.waitAvailable();
	    let operationPermissionSet = (permission?.operationPermissionSet ? permission?.operationPermissionSet : new Set());
	    let eventPermissionSet = (permission?.eventPermissionSet ? permission?.eventPermissionSet : new Set());
	    let apiBindObj = {};
	    /**
	     * 申请权限
	     * @param {Array<string>} operationList 
	     * @param {Array<string>} eventList 
	     * @returns {Promise<boolean>}
	     */
	    apiBindObj.applyPermission = async (operationList, eventList) =>
	    {
	        operationList = operationList.filter(o => Boolean(apiPermission.operation[o]));
	        eventList = eventList.filter(o => Boolean(apiPermission.event[o]));
	        if (operationList.every(o => operationPermissionSet.has(o)) && eventList.every(o => eventPermissionSet.has(o)))
	            return true;
	        let permit = await showInfoBox("权限申请", ([
	            `是否允许 ${plugName} 获取以下权限?`,
	            ...operationList.map(o => "+ " + apiPermission.operation[o]),
	            ...eventList.map(o => "+ " + apiPermission.event[o])
	        ]).join("\n"), true);
	        if (permit)
	        {
	            operationList.forEach(o =>
	            {
	                if (apiPermission.operation[o])
	                    operationPermissionSet.add(o);
	            });
	            eventList.forEach(o =>
	            {
	                if (apiPermission.event[o])
	                    eventPermissionSet.add(o);
	            });
	            plugList.savePlugList();
	        }
	        return (permit ? true : false);
	    };
	    Object.keys(forgeApi.operation).forEach(key =>
	    {
	        if (apiPermission.operation[key])
	            apiBindObj[key] = (...param) =>
	            {
	                if (operationPermissionSet.has(key))
	                {
	                    try
	                    {
	                        forgeApi.state.plug = { name: plugName };
	                        let ret = forgeApi.operation[key](...param);
	                        forgeApi.state.plug = null;
	                        return ret;
	                    }
	                    catch (err)
	                    {
	                        forgeApi.state.plug = null;
	                        return undefined;
	                    }
	                }
	            };
	    });
	    apiBindObj.addEventListener = (eventName, callback) =>
	    {
	        if (apiPermission.event[eventName] && forgeApi.event[eventName] && eventPermissionSet.has(eventName))
	            forgeApi.event[eventName].add(callback);
	    };
	    sandbox.apiObj = {
	        iiroseForge: apiBindObj
	    };
	    let scriptCode = await (await fetch(scriptUrl)).text();
	    sandbox.execJs(scriptCode);

	    return {
	        sandbox: sandbox,
	        windowElement: windowElement,
	        operationPermissionSet: operationPermissionSet,
	        eventPermissionSet: eventPermissionSet
	    };
	}

	/**
	 * 插件列表
	 */
	class PlugList
	{
	    /**
	     * @type {Map<string, { url: string, sandbox: SandboxContext, windowElement: NElement, operationPermissionSet: Set, eventPermissionSet: Set }>}
	     */
	    map = new Map();

	    /**
	     * 添加插件
	     * @param {string} name
	     * @param {string} url
	     * @param {{operationPermissionSet: Set, eventPermissionSet: Set }} [permission]
	     */
	    async addPlug(name, url, permission)
	    {
	        if (!this.map.has(name))
	            this.map.set(name, { url: url, ...(await loadPlugIn(name, url, permission)) });
	    }

	    /**
	     * 显示插件窗口
	     * @param {string} name 
	     */
	    showPlugWindow(name)
	    {
	        if (this.map.has(name))
	        {
	            let windowElement = this.map.get(name).windowElement;
	            windowElement.setDisplay("block");
	            windowElement.setStyle("pointerEvents", "auto");        }
	    }

	    /**
	     * 移除插件
	     * @param {string} name
	     */
	    removePlug(name)
	    {
	        if (this.map.has(name))
	        {
	            this.map.get(name).sandbox.destroy();
	            this.map.delete(name);
	        }
	    }

	    /**
	     * 保存插件列表
	     */
	    savePlugList()
	    {
	        /**
	         * @type {Array<[string, string, Array<string>, Array<string>]>}
	         */
	        let plugInfo = [];
	        this.map.forEach((o, name) =>
	        {
	            plugInfo.push([
	                name,
	                o.url,
	                Array.from(o.operationPermissionSet.values()),
	                Array.from(o.eventPermissionSet.values())
	            ]);
	        });
	        storageContext.iiroseForge.plugInfo = plugInfo;
	        storageSave();
	    }

	    /**
	     * 读取插件列表
	     */
	    readPlugList()
	    {
	        try
	        {
	            let plugInfo = storageContext.iiroseForge.plugInfo;
	            if (plugInfo.length > 0)
	            {
	                plugInfo.forEach(([name, url, operationPermissionList, eventPermissionList]) =>
	                {
	                    this.addPlug(name, url, {
	                        operationPermissionSet: new Set(operationPermissionList),
	                        eventPermissionSet: new Set(eventPermissionList)
	                    });
	                });
	                showNotice("iiroseForge plug-in", `已加载 ${plugInfo.length} 个插件`);
	            }
	        }
	        catch (err)
	        {
	        }
	    }
	}

	const plugList = new PlugList();
	plugList.readPlugList();

	/**
	 * 生成添加类名的流水线
	 * @param {string} classNameStr
	 */
	function className(classNameStr)
	{
	    let classList = classNameStr.split(" ");
	    return new NAsse((/** @type {NElement} */e) =>
	    {
	        classList.forEach(o =>
	        {
	            (/** @type {HTMLElement} */(e.element)).classList.add(o);
	        });
	    });
	}

	/**
	 * 显示菜单
	 * @async
	 * @param {Array<NElement>} menuItems
	 * @returns {Promise<boolean>}
	 */
	function showMenu(menuItems)
	{
	    return new Promise(resolve =>
	    {
	        /**
	         * @type {NElement}
	         */
	        var menu = null;
	        var menuHolder = expandElement({ // 背景
	            width: "100%", height: "100%",
	            $position: "absolute",
	            style: {
	                userSelect: "none",
	                backgroundColor: cssG.rgb(0, 0, 0, 0.7),
	                alignItems: "center",
	                justifyContent: "center",
	                zIndex: "30001"
	            },
	            assembly: [e =>
	            {
	                e.animate([
	                    {
	                        opacity: 0.1
	                    },
	                    {
	                        opacity: 1
	                    }
	                ], {
	                    duration: 120
	                });
	            }],
	            display: "flex",
	            child: [{ // 菜单
	                style: {
	                    border: "1px white solid",
	                    backgroundColor: cssG.rgb(255, 255, 255, 0.95),
	                    color: cssG.rgb(0, 0, 0),
	                    alignItems: "stretch",
	                    justifyContent: "center",
	                    flexFlow: "column",
	                    lineHeight: "45px",
	                    minHeight: "10px",
	                    minWidth: "280px",
	                    maxHeight: "100%",
	                    maxWidth: "95%",
	                    boxSizing: "border-box",
	                    padding: "10px",
	                    borderRadius: "7px",
	                    pointerEvents: "none"
	                },
	                assembly: [e =>
	                {
	                    e.animate([
	                        {
	                            transform: "scale(0.9) translateY(-100px)"
	                        },
	                        {
	                        }
	                    ], {
	                        duration: 120
	                    });
	                    setTimeout(() => { e.setStyle("pointerEvents", "auto"); }, 120);
	                    e.getChilds().forEach(o =>
	                    {
	                        o.addEventListener("click", closeMenuBox);
	                        buttonAsse(o);
	                    });
	                }, e => { menu = e; }],
	                position$: "static",
	                overflow: "auto",
	                child: menuItems,
	                event: {
	                    click: e => { e.stopPropagation(); }
	                }
	            }],
	            event: {
	                click: closeMenuBox
	            }
	        });
	        function closeMenuBox()
	        {
	            menu.setStyle("pointerEvents", "none");
	            menu.animate([
	                {
	                },
	                {
	                    transform: "scale(0.9) translateY(-100px)"
	                }
	            ], {
	                duration: 120,
	                fill: "forwards"
	            });
	            menuHolder.animate([
	                {
	                    opacity: 1
	                },
	                {
	                    opacity: 0.1
	                }
	            ], {
	                duration: 120,
	                fill: "forwards"
	            });
	            setTimeout(() =>
	            {
	                menuHolder.remove();
	            }, 120);
	        }
	        body.addChild(menuHolder);
	    });
	}

	/**
	 * 获取forge菜单
	 * @returns {NElement}
	 */
	function getForgeMenu()
	{
	    let menu = NList.getElement([
	        createNStyle("position", "fixed"),
	        createNStyle("top", "0"),
	        createNStyle("left", "0"),
	        createNStyle("zIndex", "91000"),
	        createNStyle("height", "100%"),
	        createNStyle("width", "100%"),
	        createNStyle("backgroundColor", "rgba(255, 255, 255, 0.75)"),
	        createNStyle("backdropFilter", "blur(3px)"),

	        [
	            createNStyle("opacity", "0.8"),
	            createNStyle("backgroundColor", "#303030"),
	            createNStyle("width", "100%"),
	            createNStyle("boxShadow", "0 0 1px rgb(0, 0, 0, 0.12), 0 1px 1px rgb(0, 0, 0, 0.24)"),
	            createNStyle("zIndex", "2"),
	            createNStyle("fontFamily", "md"),
	            createNStyle("height", "40px"),
	            createNStyle("lineHeight", "40px"),
	            createNStyle("fontSize", "26px"),
	            createNStyle("padding", "0 16px 0 16px"),
	            createNStyle("whiteSpace", "nowrap"),
	            createNStyle("boxSizing", "border-box"),
	            createNStyle("position", "relative"),
	            createNStyle("color", "#fff"),

	            [
	                className("mdi-anvil"),
	                createNStyleList({
	                    display: "inline",
	                    opacity: "0.8",
	                    backgroundColor: "#303030",
	                    boxShadow: "0 0 1px rgb(0,0,0,0.12), 0 1px 1px rgb(0,0,0,0.24)",
	                    zIndex: "2",
	                    fontFamily: "md",
	                    height: "40px",
	                    lineHeight: "40px",
	                    fontSize: "26px",
	                    padding: "0 0 0 0",
	                    whiteSpace: "nowrap",
	                    boxSizing: "border-box",
	                    position: "relative",
	                    color: "#fff",
	                })
	            ],
	            [
	                createNStyle("display", "inline"),
	                createNStyle("fontSize", "16px"),
	                createNStyle("opacity", "0.7"),
	                createNStyle("fontWeight", "bold"),
	                createNStyle("marginLeft", "16px"),
	                createNStyle("height", "100%"),
	                createNStyle("lineHeight", "40px"),
	                createNStyle("display", "inline"),
	                createNStyle("verticalAlign", "top"),

	                `欢迎使用 iirose-Forge   version ${versionInfo.version}`
	            ]
	        ],

	        [
	            createNStyle("position", "absolute"),
	            createNStyle("width", "100%"),
	            createNStyle("top", "40px"),
	            createNStyle("bottom", "40px"),

	            [
	                ...([
	                    {
	                        title: "管理插件",
	                        text: "管理插件",
	                        icon: "puzzle",
	                        onClick: async () =>
	                        {
	                            showMenu([
	                                NList.getElement([
	                                    "[ 添加插件 ]",
	                                    new NEvent("click", async () =>
	                                    {
	                                        let pluginUrl = await showInputBox("添加插件", "请输入插件地址\n插件会自动进行更新", true);
	                                        if (pluginUrl != undefined)
	                                        {
	                                            await plugList.addPlug(pluginUrl, pluginUrl);
	                                            plugList.savePlugList();
	                                        }
	                                    }),
	                                ]),
	                                ...(Array.from(plugList.map.keys())).map(name => NList.getElement([
	                                    `${name}`,
	                                    new NEvent("click", async () =>
	                                    {
	                                        showMenu([
	                                            NList.getElement([
	                                                "显示插件窗口",
	                                                new NEvent("click", () =>
	                                                {
	                                                    plugList.showPlugWindow(name);
	                                                })
	                                            ]),
	                                            NList.getElement([
	                                                "移除插件",
	                                                new NEvent("click", () =>
	                                                {
	                                                    plugList.removePlug(name);
	                                                    plugList.savePlugList();
	                                                })
	                                            ])
	                                        ]);
	                                    }),
	                                ]))
	                            ]);

	                        }
	                    },
	                    {
	                        title: "安装iiroseForge",
	                        text: "下次使用无需注入",
	                        icon: "puzzle",
	                        onClick: async () =>
	                        {
	                            writeForgeToCache();
	                            showInfoBox("安装iiroseForge", "已完成");
	                        }
	                    },
	                    {
	                        title: "卸载iiroseForge",
	                        text: "下次启动清除iiroseForge",
	                        icon: "puzzle",
	                        onClick: async () =>
	                        {
	                            removeForgeFromCache();
	                            showInfoBox("卸载iiroseForge", "已完成");
	                        }
	                    }
	                ]).map(o => [
	                    className("commonBox"),
	                    createNStyle("maxWidth", "calc(100% - 24px)"),
	                    createNStyle("minWidth", "355.2px"),
	                    createNStyle("minHeight", "200px"),
	                    createNStyle("float", "left"),
	                    createNStyle("boxShadow", "0 0 1px rgb(0,0,0,0.12),0 1px 1px rgb(0,0,0,0.24)"),
	                    createNStyle("margin", "24px 12px 0px 12px"),
	                    createNStyle("position", "relative"),
	                    [
	                        className("commonBoxHead"),
	                        createNStyle("backgroundColor", "rgba(255,255,255,0.2)"),
	                        createNStyle("color", "rgba(0,0,0,0.4)"),
	                        createNStyle("height", "100px"),
	                        createNStyle("width", "100%"),
	                        createNStyle("display", "flex"),
	                        createNStyle("justifyContent", "center"),
	                        createNStyle("padding", "0 24px"),
	                        createNStyle("boxSizing", "border-box"),
	                        [
	                            className("mdi-" + o.icon),
	                            createNStyle("lineHeight", "100px"),
	                            createNStyle("fontSize", "30px"),
	                            createNStyle("fontFamily", "md"),
	                            createNStyle("display", "inline-block"),
	                            createNStyle("verticalAlign", "top"),
	                            createNStyle("height", "100%"),
	                            createNStyle("opacity", "0.7"),
	                        ],
	                        [
	                            createNStyle("lineHeight", "100px"),
	                            createNStyle("fontSize", "20px"),
	                            createNStyle("display", "inline-block"),
	                            createNStyle("verticalAlign", "top"),
	                            createNStyle("height", "100%"),
	                            createNStyle("fontWeight", "bold"),
	                            createNStyle("marginLeft", "22px"),
	                            createNStyle("overflow", "hidden"),
	                            createNStyle("whiteSpace", "pre"),
	                            createNStyle("textOverflow", "ellipsis"),

	                            o.title
	                        ]
	                    ],
	                    [
	                        className("textColor"),
	                        createNStyle("width", "100%"),
	                        createNStyle("minHeight", "100px"),
	                        createNStyle("backgroundColor", "rgba(255,255,255,0.5)"),
	                        createNStyle("color", "rgba(0,0,0,0.75)"),
	                        [
	                            createNStyle("fontWeight", "bold"),
	                            createNStyle("width", "100%"),
	                            createNStyle("height", "100%"),
	                            createNStyle("lineHeight", "1.8em"),
	                            createNStyle("textAlign", "center"),
	                            createNStyle("padding", "2.2em"),
	                            createNStyle("boxSizing", "border-box"),
	                            createNStyle("whiteSpace", "pre-wrap"),
	                            createNStyle("fontSize", "16px"),
	                            createNStyle("color", "rgba(0,0,0,0.7)"),

	                            o.text
	                        ]
	                    ],

	                    new NEvent("click", o.onClick)
	                ])
	            ]
	        ],

	        [
	            createNStyle("color", "#303030"),
	            createNStyle("background", "#fff"),
	            createNStyle("opacity", "0.8"),
	            createNStyle("display", "flex"),
	            createNStyle("height", "40px"),
	            createNStyle("position", "absolute"),
	            createNStyle("bottom", "0"),
	            createNStyle("width", "100%"),
	            createNStyle("boxShadow", "0 0 1px rgb(0,0,0,0.12),0 1px 1px rgb(0,0,0,0.24)"),
	            createNStyle("zIndex", "2"),

	            ...([
	                {
	                    text: "< 返回",
	                    onClick: () =>
	                    {
	                        menu.remove();
	                    }
	                }
	            ].map(o => [
	                createNStyle("width", "0"),
	                createNStyle("flexGrow", "1"),
	                createNStyle("justifyContent", "center"),
	                createNStyle("padding", "0 24px"),
	                createNStyle("boxSizing", "border-box"),

	                new NEvent("click", o.onClick),

	                [],

	                [
	                    createNStyle("display", "inline-block"),
	                    createNStyle("verticalAlign", "top"),
	                    createNStyle("height", "100%"),
	                    createNStyle("fontWeight", "bold"),
	                    createNStyle("marginLeft", "22px"),
	                    createNStyle("fontSize", "14px"),
	                    createNStyle("lineHeight", "40px"),
	                    createNStyle("overflow", "hidden"),
	                    createNStyle("whiteSpace", "pre"),
	                    createNStyle("textOverflow", "ellipsis"),

	                    o.text
	                ]
	            ]))
	        ]
	    ]);
	    menu.element.id = "iiroseForgeMenu";

	    return menu;
	}

	/**
	 * 获取forge按钮
	 * @returns {NElement}
	 */
	function getMenuButton()
	{
	    let button = NList.getElement([
	        createNStyle("background", "#fff"),
	        createNStyle("boxShadow", "0 0 1px rgb(0,0,0,0.12),0 1px 1px rgb(0,0,0,0.24)"),
	        createNStyle("position", "relative"),
	        createNStyle("zIndex", "1"),

	        createNStyle("color", "#212121"),
	        createNStyle("paddingLeft", "16px"),
	        createNStyle("paddingRight", "56px"),
	        createNStyle("transition", "background-color 0.1s ease 0s, color 0.1s ease 0s"),
	        createNStyle("cursor", "url(images/cursor/2.cur), pointer"),
	        createNStyle("width", "100%"),
	        createNStyle("height", "56px"),
	        createNStyle("boxSizing", "border-box"),
	        createNStyle("lineHeight", "56px"),
	        createNStyle("whiteSpace", "nowrap"),

	        new NEvent("click", () =>
	        {
	            iframeContext.iframeWindow?.["functionHolderDarker"]?.click();
	            iframeContext.iframeBody.addChild(getForgeMenu());
	        }),

	        [
	            new NTagName("span"),
	            new NAsse(e => e.element.classList.add("functionBtnIcon", "mdi-anvil"))
	        ],
	        [
	            new NTagName("span"),
	            "Forge菜单",
	            new NAsse(e => e.element.classList.add("functionBtnFont"))
	        ],
	        [
	            new NTagName("span"),
	            createNStyle("transform", "rotate(-90deg)"),
	            new NAsse(e => e.element.classList.add("functionBtnGroupIcon"))
	        ]
	    ]);
	    button.element.id = "iiroseForgeMenuButton";

	    return button;
	}

	/**
	 * 初始化注入iframe元素
	 */
	function initInjectIframe()
	{
	    intervalTry(() => // 循环尝试注入
	    {
	        /**
	         * @type {HTMLIFrameElement}
	         */
	        let mainIframe = (/** @type {HTMLIFrameElement} */(document.getElementById("mainFrame")));
	        let iframeWindow = mainIframe.contentWindow;
	        let iframeDocument = mainIframe.contentDocument;
	        if (iframeWindow["iiroseForgeInjected"]) // 已经注入iframe
	            return;
	        if (iframeWindow["socket"].__onmessage != undefined || iframeWindow["socket"]._onmessage == undefined || iframeWindow["socket"]._send == undefined) // 目前无法注入
	            throw "main iframe is not ready";
	        (() => // 添加菜单按钮
	        {
	            /**
	             * 左侧菜单栏
	             */
	            let functionHolder = getNElement(/** @type {HTMLElement} */(iframeDocument.getElementById("functionHolder").childNodes[0]));
	            let button = getMenuButton();

	            functionHolder.insChild(button, 1); // 添加菜单到左侧菜单栏第二个按钮前
	        })();

	        iframeContext.iframeDocument = iframeDocument;
	        iframeContext.iframeWindow = iframeWindow;
	        iframeContext.iframeBody = getNElement(/** @type {HTMLBodyElement} */(iframeDocument.body));

	        iframeContext.socket = iframeWindow["socket"];

	        (() => // 注入socket
	        {
	            iframeContext.socket._onmessage = proxyFunction(iframeContext.socket._onmessage.bind(iframeContext.socket), (param) =>
	            {
	                // console.log("get data", data);
	                try
	                {
	                    if(toClient(/** @type {[string]} */(param)))
	                        return true;
	                }
	                catch (err)
	                {
	                    console.error("[iiroseForge]", err);
	                    return false;
	                }
	                return false;
	            });
	            iframeContext.socket.send = proxyFunction(iframeContext.socket.send.bind(iframeContext.socket), (param) =>
	            {
	                // console.log("send data", data);
	                try
	                {
	                    if(toServer(/** @type {[string]} */(param)))
	                        return true;
	                }
	                catch (err)
	                {
	                    console.error("[iiroseForge]", err);
	                    return false;
	                }
	                return false;
	            });
	        })();

	        iframeWindow["iiroseForgeInjected"] = true; // iframe上下文已注入标记
	        console.log("[iiroseForge] 成功将iiroseForge注入iframe");
	    }, 1000);
	}

	if (location.host == "iirose.com")
	{
	    if (location.pathname == "/")
	    {
	        if (!window["iiroseForgeInjected"])
	        {
	            console.log("[iiroseForge] iiroseForge已启用");

	            let mainIframe = (/** @type {HTMLIFrameElement} */(document.getElementById("mainFrame")));
	            mainIframe.addEventListener("load", () => // 主iframe加载事件
	            {
	                console.log("[iiroseForge] 已重载 正在将iiroseForge注入iframe");
	                initInjectIframe();
	            });
	            console.log("[iiroseForge] 正在将iiroseForge注入iframe");
	            initInjectIframe();

	            window["iiroseForgeInjected"] = true; // 最外层页面已被注入标记
	        }
	        else
	            console.log("[iiroseForge] 已阻止重复注入");
	    }
	    else if (location.pathname == "/messages.html")
	    {
	        console.log("[iiroseForge] iiroseForge需要注入至主上下文中");
	        if (parent?.location?.host == "iirose.com" && parent?.location?.pathname == "/")
	        {
	            let doc = parent.document;
	            let script = doc.createElement("script");
	            script.src = iiroseForgeLoaderUrl;
	            doc.body.appendChild(script);
	            console.log("[iiroseForge] 修正注入");
	        }
	    }
	    else
	    {
	        console.log("[iiroseForge] 已阻止注入 iiroseForge需要注入至根页面的主上下文中");
	    }
	}
	else
	{
	    console.log("[iiroseForge] 已阻止注入 iiroseForge仅支持蔷薇花园(iirose.com)");
	}

})();
