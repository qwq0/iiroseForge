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
	 * css生成
	 * @namespace
	 */

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
	 * 代理对象 到 钩子映射和目标对象 映射
	 * @type {WeakMap<object, {
	 *  hookMap: Map<string | symbol, Set<HookBindValue | HookBindCallback>>,
	 *  srcObj: object
	 * }>}
	 */
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

	createNStyle("asd", "");

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
	 * 主iframe的上下文
	 */
	let iframeContext = {
	    iframeWindow: null,
	    iframeDocument: null,
	    socket: null,
	    /**
	     * @type {import("../../lib/qwqframe").NElement<HTMLBodyElement>}
	     */
	    iframeBody: null
	};

	/**
	 * document.body的NElement封装
	 */
	getNElement(document.body);

	function getForgeMenu()
	{
	    let menu = NList.getElement([
	        createNStyle("position", "fixed"),
	        createNStyle("top", "0"),
	        createNStyle("left", "0"),
	        createNStyle("zIndex", "91000"),
	        createNStyle("height", "100%"),
	        createNStyle("width", "100%"),
	        createNStyle("backgroundColor", "rgba(255,255,255,0.8)"),

	        [
	            createNStyle("opacity", "0.8"),
	            createNStyle("backgroundColor", "#303030"),
	            createNStyle("width", "100%"),
	            createNStyle("boxShadow", "0 0 1px rgb(0, 0, 0, 0.12), 0 1px 1px rgb(0, 0, 0, 0.24)"),
	            createNStyle("zIndex", "2"),
	            createNStyle("fontFamily", "md"),
	            createNStyle("height", "40px"),
	            createNStyle("lineHeight", "40px"),
	            createNStyle("fontSize", "26px !important"),
	            createNStyle("padding", "0 64px 0 24px"),
	            createNStyle("whiteSpace", "nowrap"),
	            createNStyle("boxSizing", "border-box"),
	            createNStyle("position", "relative"),
	            createNStyle("color", "#fff"),
	            [
	                createNStyle("fontSize", "16px !important"),
	                createNStyle("opacity", "0.7"),
	                createNStyle("fontWeight", "bold"),
	                createNStyle("marginLeft", "24px"),
	                createNStyle("height", "100%"),
	                createNStyle("lineHeight", "40px"),
	                createNStyle("display", "inline"),
	                createNStyle("verticalAlign", "top"),

	                "欢迎使用Forge for iirose"
	            ]
	        ],

	        [],

	        [
	            createNStyle("color", "#303030"),
	            createNStyle("background", "#fff"),
	            createNStyle("opacity", ".8"),
	            createNStyle("display", "flex"),
	            createNStyle("height", "40px"),
	            createNStyle("position", "absolute"),
	            createNStyle("bottom", "0"),
	            createNStyle("width", "100%"),
	            createNStyle("boxShadow", "0 0 1px rgb(0,0,0,0.12),0 1px 1px rgb(0,0,0,0.24)"),
	            createNStyle("zIndex", "2"),

	            ...([
	                {
	                    text: "返回",
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
	                    createNStyle("fontSize", "14px !important"),
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
	        if (iframeWindow["socket"].__onmessage != undefined) // 目前无法注入
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
	            iframeContext.socket._onmessage = proxyFunction(iframeContext.socket._onmessage.bind(iframeContext.socket), (data) =>
	            {
	                return false;
	            });
	        });

	        iframeWindow["iiroseForgeInjected"] = true; // iframe上下文已注入标记
	    }, 1000);
	}

	if (!window["iiroseForgeInjected"])
	{
	    (/** @type {HTMLIFrameElement} */(document.getElementById("mainFrame"))).addEventListener("load", () => // 主iframe加载事件
	    {
	        initInjectIframe();
	    });


	    console.log("[iiroseForge] 已注入iiroseForge");
	    window["iiroseForgeInjected"] = true; // 最外层页面已被注入标记
	}
	else    
	    console.log("[iiroseForge] 已阻止重复注入");

})();
