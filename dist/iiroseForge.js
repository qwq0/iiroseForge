(function () {
	'use strict';

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
	function proxyFunction(targetFunction, callback)
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
	* 访问dom树上的路径
	* @param {Node} start 
	* @param {Array<number>} path
	* @returns 
	*/
	function domPath(start, path)
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
	 * 代理对象 到 钩子映射和源对象 映射
	 * 
	 * @type {WeakMap<object, {
	 *  hookMap: Map<string | symbol, Set<import("./HookBindValue").HookBindValue | import("./HookBindCallback").HookBindCallback>>,
	 *  srcObj: object
	 * }>}
	 */
	const proxyMap = new WeakMap();
	/**
	 * 目标对象 到 引用集合 映射
	 *
	 * 确保当目标对象存活时引用集合的引用存活
	 * 目前仅在HookBindCallback中使用
	 * @type {WeakMap<object, Set<any>>}
	 */
	const targetRefMap$1 = new WeakMap();

	/**
	 * 记录器

	 * 在目标对象销毁时销毁钩子
	 * @type {FinalizationRegistry<import("./HookBindValue").HookBindValue | import("./HookBindCallback").HookBindCallback>}
	 */
	const register$1 = new FinalizationRegistry(heldValue =>
	{
	    heldValue.destroy();
	});

	/**
	 * 钩子绑定到回调类
	 */
	class HookBindCallback
	{
	    /**
	     * 钩子信息
	     * @type {import("./HookBindInfo").HookBindInfo}
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
	     * @param {import("./HookBindInfo").HookBindInfo} info
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
	        register$1.unregister(this);
	    }

	    /**
	     * 绑定销毁
	     * 当目标对象释放时销毁
	     * @param {object} targetObj
	     * @returns {HookBindCallback} 返回自身
	     */
	    bindDestroy(targetObj)
	    {
	        let targetRefSet = targetRefMap$1.get(targetObj);
	        if (targetRefSet == undefined)
	        {
	            targetRefSet = new Set();
	            targetRefMap$1.set(targetObj, targetRefSet);
	        }
	        targetRefSet.add(this.callback);
	        this.callback = null;
	        register$1.register(targetObj, this, this);
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
	     * @type {import("./HookBindInfo").HookBindInfo}
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
	     * @param {import("./HookBindInfo").HookBindInfo} info
	     * @param {object} targetObj
	     * @param {string | symbol} targetKey
	     */
	    constructor(info, targetObj, targetKey)
	    {
	        this.info = info;
	        this.targetRef = new WeakRef(targetObj);
	        this.targetKey = targetKey;
	        info.addHook(this);
	        register$1.register(targetObj, this, this);
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
	        register$1.unregister(this);
	    }
	}

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
	 * 流水线
	 */
	class NAsse
	{
	    /**
	     * @type {function(import("../element/NElement").NElement): void}
	     */
	    callback = null;

	    /**
	     * @param {function(import("../element/NElement").NElement): void} callback
	     */
	    constructor(callback)
	    {
	        this.callback = callback;
	    }

	    /**
	     * 将此特征应用于元素
	     * @param {import("../element/NElement").NElement} e
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
	     * @param {import("../element/NElement").NElement} e
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
	     * @type {(event: HTMLElementEventMap[T], currentElement: import("../element/NElement").NElement) => void}
	     */
	    callback = null;

	    /**
	     * @param {T} key
	     * @param {(event: HTMLElementEventMap[T], currentElement: import("../element/NElement").NElement) => void} callback
	     */
	    constructor(key, callback)
	    {
	        this.eventName = key;
	        this.callback = callback;
	    }

	    /**
	     * 将此特征应用于元素
	     * @param {import("../element/NElement").NElement} element
	     */
	    apply(element)
	    {
	        element.addEventListener(this.eventName, event =>
	        {
	            this.callback(event, element);
	        });
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
	     * @param {import("../element/NElement").NElement} e
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
	 * @param {{ [x in keyOfStyle]?: string | HookBindInfo }} obj
	 */
	function createNStyleList(obj)
	{
	    return NList.flat(Object.keys(obj).map(key => new NStyle(key, obj[key])));
	}

	/**
	 * 标签名
	 * 标签名使用小写字母
	 * 不包含此类的特征列表默认为div
	 * 一层特征列表只能有唯一tagName (或等价的)
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
	 * @typedef {Array<string | HookBindInfo | NTagName | NStyle | NAttr | NEvent | NAsse | NList | NList_list | NElement | ((e: NElement) => void)>} NList_list
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
	            if (o == undefined)
	                return;
	            if (typeof (o) == "string") // 内部文本
	            {
	                element.addText(o);
	            }
	            else if (typeof (o) == "function") // 流水线函数
	            {
	                o(element);
	            }
	            else if (typeof (o) == "object")
	            {
	                switch (Object.getPrototypeOf(o)?.constructor)
	                {
	                    case HookBindInfo: { // 子元素或文本
	                        element.addChild(/** @type {HookBindInfo} */(o));
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
	            else
	                throw "(NList) Untractable feature types were found";
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
	 * NElement的symbol
	 * 用于将NElement绑定到对应的HTMLElement
	 */
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
	     * @param {NElement | Node | string | HookBindInfo} chi
	     */
	    addChild(chi)
	    {
	        if (chi instanceof NElement)
	            this.element.appendChild(chi.element);
	        else if (chi instanceof Node)
	            this.element.appendChild(chi);
	        else if (typeof (chi) == "string")
	            this.addText(chi);
	        else if (chi instanceof HookBindInfo)
	        {
	            let currentNode = null;
	            {
	                let initVal = chi.getValue();
	                currentNode = (initVal == null ? new Comment() : (typeof (initVal) == "string" ? new Text(initVal) : (initVal instanceof NElement ? initVal.element : initVal)));
	                this.element.appendChild(currentNode);
	            }
	            chi.bindToCallback(val =>
	            {
	                if (currentNode instanceof Text && typeof (val) == "string")
	                {
	                    currentNode.data = val;
	                    return;
	                }
	                else
	                {
	                    let newNode = (val == null ? new Comment() : (typeof (val) == "string" ? new Text(val) : (val instanceof NElement ? val.element : val)));
	                    this.element.replaceChild(newNode, currentNode);
	                    currentNode = newNode;
	                }
	            }).bindDestroy(this);
	        }
	        else
	            throw "(NElement) Type of child node that cannot be added";
	    }

	    /**
	     * 添加多个子节点
	     * @param {Array<NElement | Node | string | HookBindInfo | Array<NElement | Node | string | HookBindInfo>>} chi
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
	     * 使用指定元素替换此元素
	     * @param {Array<NElement>} elements
	     */
	    replaceWith(...elements)
	    {
	        this.element.replaceWith(...(elements.map(o => o.element)));
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
	     * @returns {Animation}
	     */
	    animate(keyframes, options)
	    {
	        return this.element.animate(keyframes, options);
	    }

	    /**
	     * 执行动画并提交
	     * 在执行完成动画后将最后的效果提交到style
	     * @param {Array<Keyframe> | PropertyIndexedKeyframes} keyframes
	     * @param {number | KeyframeAnimationOptions} options
	     * @returns {Promise<void>} 动画执行完后返回
	     */
	    async animateCommit(keyframes, options)
	    {
	        if (typeof (options) == "number")
	            options = {
	                duration: options,
	                fill: "forwards"
	            };
	        else
	            options = Object.assign({ fill: "forwards" }, options);
	        if (options.fill != "forwards" && options.fill != "both")
	            throw "(NElelemt) animateCommit can only be used when fill forwards or both";
	        let animate = this.element.animate(keyframes, options);
	        await animate.finished;
	        
	        let errorObject = null;
	        try
	        {
	            animate.commitStyles();
	        }
	        catch (err)
	        {
	            errorObject = err;
	        }
	        animate.cancel();
	        if (errorObject != null)
	            throw errorObject;
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
	     * 应用NList到元素
	     * @param {NList | ConstructorParameters<typeof NList>[0]} list
	     * @returns {NElement} 返回被操作的NElement
	     */
	    applyNList(list)
	    {
	        let nList = (list instanceof NList ? list : NList.flat(list));
	        nList.apply(this);
	        return this;
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
	        else if (element instanceof NElement)
	            return element;
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
	 * 指针数据
	 * 当发生鼠标或触摸事件时传递
	 * 包含指针坐标和按下状态等数据
	 */
	class PointerData
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
	 * @param {function(PointerData):void} callBack 回调
	 * @param {number} [button] 绑定的按键
	 * @param {HTMLElement | Window} [extensionRegion] 延伸区域 (实际捕获鼠标移动和按钮抬起的区域)
	 */
	function mouseBind(element, callBack, button = 0, extensionRegion = window)
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
	        extensionRegion.addEventListener("mousemove", mousemoveP, true);
	        extensionRegion.addEventListener("mouseup", mouseupP, true);
	        if (e.button == button)
	        {
	            leftDown = true;
	            callBack(new PointerData(
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
	            callBack(new PointerData(
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
	        extensionRegion.removeEventListener("mousemove", mousemoveP, false);
	        extensionRegion.removeEventListener("mouseup", mouseupP, false);
	        if (leftDown && e.button == button)
	        {
	            leftDown = false;
	            callBack(new PointerData(
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
	 * @param {function(PointerData):void} callBack
	 * @param {boolean} [preventDefault]
	 */
	function touchBind(element, callBack, preventDefault = true)
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
	    element.addEventListener("touchcancel", e => touchCancel(/** @type {TouchEvent} */(e)), {
	        capture: false,
	        passive: true
	    });

	    /**
	     * 触摸点id 到 触摸点信息 映射
	     * @type {Map<number, {
	     *  id: number,
	     *  sx: number,
	     *  sy: number,
	     *  x: number,
	     *  y: number
	     * }>}
	     */
	    let touchesSet = new Map();

	    /**
	     * 触摸处理函数(按下)
	     * @param {TouchEvent} e 
	     */
	    function touchStart(e)
	    {
	        if (e.cancelable && preventDefault)
	            e.preventDefault();
	        forEach(e.changedTouches, o =>
	        {
	            let t = {
	                id: o.identifier,
	                sx: o.clientX,
	                sy: o.clientY,
	                x: o.clientX,
	                y: o.clientY
	            };
	            touchesSet.set(o.identifier, t);
	            callBack(new PointerData(
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
	        forEach(e.changedTouches, o =>
	        {
	            let touchInfo = touchesSet.get(o.identifier);
	            if (touchInfo)
	            {
	                let vx = o.clientX - touchInfo.x;
	                let vy = o.clientY - touchInfo.y;
	                touchInfo.x = o.clientX;
	                touchInfo.y = o.clientY;
	                callBack(new PointerData(
	                    touchInfo.x, touchInfo.y,
	                    vx, vy,
	                    touchInfo.sx, touchInfo.sy,
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
	        forEach(e.changedTouches, o =>
	        {
	            let touchInfo = touchesSet.get(o.identifier);
	            if (touchInfo)
	            {
	                touchesSet.delete(o.identifier);
	                let vx = o.clientX - touchInfo.x;
	                let vy = o.clientY - touchInfo.y;
	                touchInfo.x = o.clientX;
	                touchInfo.y = o.clientY;
	                callBack(new PointerData(
	                    touchInfo.x, touchInfo.y,
	                    vx, vy,
	                    touchInfo.sx, touchInfo.sy,
	                    false, false
	                ));
	            }
	        });
	    }

	    /**
	     * 触摸处理函数(触摸取消)
	     * @param {TouchEvent} e 
	     */
	    function touchCancel(e)
	    {
	        forEach(e.changedTouches, o =>
	        {
	            let touchInfo = touchesSet.get(o.identifier);
	            if (touchInfo)
	            {
	                touchesSet.delete(o.identifier);
	                callBack(new PointerData(
	                    touchInfo.x, touchInfo.y,
	                    0, 0,
	                    touchInfo.sx, touchInfo.sy,
	                    false, false
	                ));
	            }
	        });
	    }
	}

	/**
	 * 键盘对应表
	 */
	let keyNameTable = new Map([
	    ["~", "`"],
	    ["!", "1"],
	    ["@", "2"],
	    ["#", "3"],
	    ["$", "4"],
	    ["%", "5"],
	    ["^", "6"],
	    ["&", "7"],
	    ["*", "8"],
	    ["(", "9"],
	    [")", "0"],
	    ["_", "-"],
	    ["+", "="],
	    ["{", "["],
	    ["}", "]"],
	    ["|", "\\"],
	    ["\"", "\'"],
	    [":", ";"],
	    ["<", ","],
	    [">", "."],
	    ["?", "/"]
	]);
	const capitalA = "A".charCodeAt(0);
	const lowercaseA = "a".charCodeAt(0);
	for (let i = 0; i < 26; i++)
	    keyNameTable.set(String.fromCharCode(capitalA + i), String.fromCharCode(lowercaseA + i));


	let keyMap = new Map();
	/**
	 * 按下键时调用
	 * @param {string} keyName
	 * @returns {boolean}
	 */
	function keyPress(keyName)
	{
	    if (keyMap.get(keyName))
	        return false;
	    keyMap.set(keyName, true);
	    return true;
	}
	/**
	 * 弹起键时调用
	 * @param {string} keyName
	 */
	function keyUp(keyName)
	{
	    keyMap.set(keyName, false);
	}

	/**
	 * 按键数据
	 * 当发生键盘事件时传递
	 * 包含按键和按下状态等数据
	 */
	class KeyboardData
	{
	    /**
	     * 操作的键名
	     * @type {string}
	     */
	    key = "";
	    
	    /**
	     * 当前键目前是否被按下
	     * @type {boolean}
	     */
	    hold = false;

	    /**
	     * 当前键是否刚按下
	     * (键按下时第一次为true)
	     * @type {boolean}
	     */
	    pressing = false;

	    /**
	     * @param {string} key
	     * @param {boolean} hold
	     * @param {boolean} pressing
	     */
	    constructor(key, hold, pressing)
	    {
	        this.key = key;
	        this.hold = hold;
	        this.pressing = pressing;
	    }
	}

	/**
	 * 键盘 事件处理
	 * @param {HTMLElement} element
	 * @param {function(KeyboardData) : void} callBack
	 */
	function keyboardBind(element, callBack)
	{
	    element.addEventListener("keydown", e =>
	    {
	        let keyName = (keyNameTable[e.key] ? keyNameTable[e.key] : e.key);
	        callBack(new KeyboardData(
	            keyName,
	            true,
	            keyPress(keyName)
	        ));
	    });
	    element.addEventListener("keyup", e =>
	    {
	        let keyName = (keyNameTable[e.key] ? keyNameTable[e.key] : e.key);
	        keyUp(keyName);
	        callBack(new KeyboardData(
	            keyName,
	            false,
	            false
	        ));
	    });
	}

	/**
	 * 创建对象的代理
	 * @template {object} T
	 * @param {T} srcObj
	 * @returns {T}
	 */
	function createHookObj(srcObj)
	{
	    if (proxyMap.has(srcObj)) // 已经是代理对象
	        throw "Unable to create a proxy for a proxy object";
	    /**
	     * 修改指定值时需要触发的钩子
	     * @type {Map<string | symbol, Set<HookBindValue | HookBindCallback>>}
	     */
	    const hookMap = new Map();
	    const proxyObj = (new Proxy((/** @type {object} */(srcObj)), {
	        get: (target, key) => // 取值
	        {
	            return Reflect.get(target, key);
	        },

	        set: (target, key, newValue) => // 设置值
	        {
	            let ret = Reflect.set(target, key, newValue);
	            if (ret)
	            {
	                let hookSet = hookMap.get(key);
	                if (hookSet) // 若此key上存在钩子集合
	                {
	                    hookSet.forEach(o =>
	                    {
	                        o.emit(); // 触发每个钩子
	                    });
	                }
	            }
	            return ret;
	        },

	        deleteProperty: (target, key) => // 删除值
	        {
	            let ret = Reflect.deleteProperty(target, key);
	            if (ret)
	            {
	                let hookSet = hookMap.get(key);
	                if (hookSet) // 若此key上存在钩子集合
	                {
	                    hookSet.forEach(o =>
	                    {
	                        o.destroy(); // 销毁每个钩子
	                    });
	                    hookMap.delete(key); // 移除此key上的钩子集合
	                }
	            }
	            return ret;
	        }
	    }));
	    proxyMap.set(proxyObj, { hookMap, srcObj });
	    return proxyObj;
	}

	/**
	 * 获取代理对象中指定值的绑定信息
	 * @template {Object} T
	 * @param {T} proxyObj
	 * @param {[(keyof T) | (string & {}) | symbol] | [((keyof T) | (string & {}) | symbol), ...Array<(keyof T) | (string & {}) | symbol>, function(...any): any]} keys
	 * @returns {HookBindInfo}
	 */
	function bindValue(proxyObj, ...keys)
	{
	    const ctFunc = (/** @type {function(...any): any} */(keys.length >= 2 ? keys.pop() : null));
	    const proxyMata = proxyMap.get(proxyObj);
	    if (proxyMata == undefined)
	        throw "bindValue: Values can only be bound from proxy objects";
	    return new HookBindInfo(proxyObj, proxyMata.srcObj, (/** @type {Array<string | symbol>}*/(keys)), proxyMata.hookMap, ctFunc);
	}

	/**
	 * 记录器

	 * 在目标对象销毁时销毁钩子
	 * @type {FinalizationRegistry<import("./ArrayHookBind").ArrayHookBind>}
	 */
	new FinalizationRegistry(heldValue =>
	{
	    heldValue.destroy();
	});

	/**
	 * 异步延迟
	 * 将创建一个Promise并在指定延迟时间后解决
	 * @param {number} time 单位:毫秒
	 * @returns {Promise<void>}
	 */
	function delayPromise(time)
	{
	    return (new Promise((resolve, reject) =>
	    {
	        setTimeout(() =>
	        {
	            resolve();
	        }, time);
	    }));
	}

	/**
	 * 事件处理器
	 * 可以定多个事件响应函数
	 * @template {*} T
	 */
	let EventHandler$2 = class EventHandler
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
	     * 单次触发Promise复用
	     * @type {Promise<T>}
	     */
	    #oncePromiseReuse = null;

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
	     * 返回一个Primise
	     * 下次响应时此primise将解决
	     * @returns {Promise<T>}
	     */
	    oncePromise()
	    {
	        if (!this.#oncePromiseReuse)
	        {
	            this.#oncePromiseReuse = new Promise(resolve =>
	            {
	                this.addOnce(e => {
	                    this.#oncePromiseReuse = null;
	                    resolve(e);
	                });
	            });
	        }
	        return this.#oncePromiseReuse;
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

	    /**
	     * 存在监听器
	     * @returns {boolean}
	     */
	    existListener()
	    {
	        return (this.cbList.length > 0 || this.onceCbList.length > 0);
	    }
	};

	/**
	 * 主iframe的上下文
	 */
	let iframeContext = {
	    /**
	     * @type {Window}
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
	        /**
	         * @type {(data: string | Uint8Array) => void}
	         */
	        send: () => { }
	    }
	};

	/**
	 * 在 蔷薇终端 中运行命令
	 * @param {string} command
	 */
	function runTerminalCommand(command)
	{
	    if (iframeContext.iframeWindow?.["Probe"]?.init?.shellHolder)
	        iframeContext.iframeWindow?.["Init"]?.movePanel(6);
	    let inputBox = /** @type {HTMLInputElement} */(domPath(iframeContext.iframeDocument.getElementById("shellHolder"), [2, 0, -1, 0]));
	    let old = inputBox.value;
	    inputBox.value = command;
	    inputBox.oninput(null);
	    inputBox.dispatchEvent(new KeyboardEvent("keydown", { keyCode: 13 }));
	    inputBox.value = old;
	}

	/**
	 * 使用当前页面中的输入框发送消息
	 * @param {string} content
	 */
	function sendMessageOnCurrentPage(content)
	{
	    var inputBox = /** @type {HTMLInputElement} */(document.getElementById("moveinput"));
	    var old = inputBox.value;
	    inputBox.value = content;
	    inputBox.oninput(null);
	    (/** @type {HTMLElement} */(document.getElementsByClassName("moveinputSendBtn")[0]))?.onclick(null);
	    inputBox.value = old;
	}

	/**
	 * 状态
	 */
	let State$1 = class State
	{
	    /**
	     * 类映射
	     * 类名字符串标识 到 类(构造函数)
	     * @package
	     * @type {Map<string, object>}
	     */
	    nameToClass = new Map();

	    /**
	     * 类映射
	     * 类(构造函数) 到 类名字符串标识
	     * @package
	     * @type {Map<object, string>}
	     */
	    classToName = new Map();

	    /**
	     * 安全函数映射
	     * 安全函数字符串标识 到 函数
	     * @package
	     * @type {Map<string, function>}
	     */
	    nameToSafetyFunction = new Map();

	    /**
	     * 安全函数映射
	     * 函数 到 安全函数字符串标识
	     * @package
	     * @type {Map<function, string>}
	     */
	    safetyFunctionToName = new Map();
	};

	/**
	 * 自定义序列化函数
	 */
	const serializationFunctionSymbol$1 = Symbol("serialization function");
	/**
	 * 自定义反序列化函数
	 */
	const deserializationFunctionSymbol$1 = Symbol("deserialization function");

	const textEncoder$2 = new TextEncoder();

	/**
	 * JSOBin编码器
	 */
	let Encoder$1 = class Encoder
	{
	    /**
	     * @type {State}
	     */
	    #state = null;

	    /**
	     * 缓冲区
	     * @type {Uint8Array}
	     */
	    #buffer = new Uint8Array(128);
	    /**
	     * 缓冲区结束索引
	     * 不包括该值
	     * @type {number}
	     */
	    #endInd = 0;

	    /**
	     * 引用索引计数
	     * @type {number}
	     */
	    #referenceIndCount = -1;
	    /**
	     * 引用的值 到 引用索引 映射
	     * @type {Map<any, number>}
	     */
	    #referenceIndMap = new Map();
	    /**
	     * 允许引用字符串
	     * 开启时对于有相同字符串的内容将降低大小
	     * @type {boolean}
	     */
	    #enableReferenceString = false;


	    /**
	     * @param {State} state
	     * @param {boolean} enableReferenceString
	     */
	    constructor(state, enableReferenceString)
	    {
	        this.#state = state;
	        this.#enableReferenceString = enableReferenceString;
	    }

	    /**
	     * 向缓冲区加入单个值
	     * @param {number} c
	     */
	    push(c)
	    {
	        if (this.#endInd >= this.#buffer.length)
	        {
	            let old = this.#buffer;
	            this.#buffer = new Uint8Array(this.#buffer.length * 2);
	            this.#buffer.set(old);
	        }
	        this.#buffer[this.#endInd++] = c;
	    }

	    /**
	     * 向缓冲区加入数组
	     * @param {Uint8Array} a 
	     */
	    pushArr(a)
	    {
	        if (this.#endInd + a.length > this.#buffer.length)
	        {
	            let old = this.#buffer;
	            let newLen = old.length * 2;
	            while (this.#endInd + a.length > newLen)
	                newLen *= 2;
	            this.#buffer = new Uint8Array(newLen);
	            this.#buffer.set(old);
	        }
	        this.#buffer.set(a, this.#endInd);
	        this.#endInd += a.length;
	    }

	    /**
	     * 序列化一个vint
	     * @param {number} num
	     */
	    pushVint(num)
	    {
	        while (true)
	        {
	            let c = (num & ((1 << 7) - 1));
	            num >>>= 7;
	            if (!num)
	            {
	                this.push(c | (1 << 7));
	                return;
	            }
	            this.push(c);
	        }
	    }

	    /**
	     * 写入字符串
	     * @param {string} str
	     */
	    pushStr(str)
	    {
	        let strBin = textEncoder$2.encode(str);
	        this.pushVint(strBin.byteLength);
	        this.pushArr(strBin);
	    }

	    /**
	     * 遍历编码
	     * @param {object | number | string} now
	     */
	    traversal(now)
	    {
	        ++this.#referenceIndCount;
	        if (!this.#referenceIndMap.has(now))
	            this.#referenceIndMap.set(now, this.#referenceIndCount);
	        switch (typeof (now))
	        {
	            case "number": { // 数值型(整数或小数)
	                if (Number.isInteger(now) && now >= -2147483648 && now <= 2147483647) // 整数
	                {
	                    this.push(1);
	                    this.pushVint(now);
	                }
	                else // 浮点数
	                {
	                    this.push(2);
	                    this.pushArr(new Uint8Array(new Float64Array([now]).buffer));
	                }
	                break;
	            }

	            case "string": { // 字符串
	                let refInd = 0;
	                if (
	                    this.#enableReferenceString &&
	                    now.length >= 2 &&
	                    this.#referenceIndCount > (refInd = this.#referenceIndMap.get(now))
	                ) // 引用字符串
	                {
	                    this.push(14);
	                    this.pushVint(refInd);
	                }
	                else
	                {
	                    this.push(3);
	                    this.pushStr(now);
	                }
	                break;
	            }

	            case "object": { // 对象 数组 类 null
	                if (now == null) // null
	                    this.push(11);
	                else if (this.#referenceIndMap.get(now) < this.#referenceIndCount) // 需要引用的对象
	                {
	                    this.push(14);
	                    this.pushVint(this.#referenceIndMap.get(now));
	                }
	                else if (Array.isArray(now)) // 数组
	                {
	                    this.push(5);
	                    now.forEach(o =>
	                    {
	                        this.traversal(o);
	                    });
	                    this.push(0);
	                }
	                else if (this.#state.classToName.has(Object.getPrototypeOf(now)?.constructor)) // 类(自定义类)
	                { // TODO 类的自定义处理需要大改版 目前无法在自定义序列化下使用循环引用
	                    this.push(6);
	                    this.pushStr(this.#state.classToName.get(Object.getPrototypeOf(now)?.constructor));
	                    let obj = now[serializationFunctionSymbol$1] ? now[serializationFunctionSymbol$1].call(now) : now; // 处理自定义序列化函数
	                    let keys = Object.getOwnPropertyNames(obj);
	                    this.pushVint(keys.length);
	                    keys.forEach(key =>
	                    {
	                        this.pushStr(key);
	                        this.traversal(obj[key]);
	                    });
	                }
	                else if (builtInClassConstructorMap$1.has(Object.getPrototypeOf(now)?.constructor)) // js内置类
	                {
	                    this.push(15);
	                    let classInfo = builtInClassConstructorMap$1.get(Object.getPrototypeOf(now)?.constructor);
	                    this.pushVint(classInfo.typeId);
	                    classInfo.encode(this, now);
	                }
	                else // 对象
	                {
	                    this.push(4);
	                    let keys = Object.keys(now);
	                    this.pushVint(keys.length);
	                    keys.forEach(key =>
	                    {
	                        this.pushStr(key);
	                        this.traversal(now[key]);
	                    });
	                }
	                break;
	            }

	            case "undefined": { // 未定义(undefined)
	                this.push(7);
	                break;
	            }

	            case "boolean": { // 布尔值
	                this.push(now ? 9 : 8);
	                break;
	            }

	            case "bigint": { // bigint类型
	                /** @type {Uint8Array} */
	                let bigintBuf = null;
	                if (now >= 0n) // bigint正数和0
	                {
	                    this.push(12);
	                    if (now == 0n) // bigint 0
	                        bigintBuf = new Uint8Array(0);
	                    else // bigint 正数
	                        bigintBuf = Encoder.writeBigint(now);
	                }
	                else // bigint负数
	                {
	                    this.push(13);
	                    bigintBuf = Encoder.writeBigint(-(/** @type {bigint} */(now)));
	                }
	                this.pushVint(bigintBuf.byteLength);
	                this.pushArr(bigintBuf);
	                break;
	            }

	            case "symbol": { // symbol类型
	                if (this.#referenceIndMap.get(now) < this.#referenceIndCount) // 需要引用的symbol
	                {
	                    this.push(14);
	                    this.pushVint(this.#referenceIndMap.get(now));
	                }
	                else // 新的symbol
	                {
	                    this.push(10);
	                    this.pushStr(now.description ? now.description : "");
	                }
	                break;
	            }

	            case "function": { // 函数
	                if (this.#state.safetyFunctionToName.has(now)) // 安全函数
	                {
	                    this.push(17);
	                    this.pushStr(this.#state.safetyFunctionToName.get(now));
	                }
	                else
	                    this.push(7); // 目前不处理其他函数
	                break;
	            }

	            default:
	                throw "JSObin(encode): The type of value that cannot be processed.";
	        }
	    }

	    /**
	     * 获取最终缓冲区
	     * @returns {Uint8Array}
	     */
	    getFinalBuffer()
	    {
	        return this.#buffer.slice(0, this.#endInd);
	    }

	    /**
	     * 编码
	     * @param {object | number | string} obj
	     */
	    encode(obj)
	    {
	        this.traversal(obj);
	        return this.getFinalBuffer();
	    }

	    /**
	     * 序列化一个bigint
	     * @param {bigint} num 一个正数
	     * @returns {Uint8Array}
	     */
	    static writeBigint(num)
	    {
	        let buf = [];
	        while (true)
	        {
	            buf.push(Number(num & 255n));
	            num >>= 8n;
	            if (num == 0n)
	                return new Uint8Array(buf);
	        }
	    }
	};

	/**
	 * js内置类映射
	 * 内置类构造函数 到 内置类id和编码处理函数
	 * @type {Map<Function, {
	 *  typeId: number,
	 *  encode: (encoder: Encoder, obj: Object) => void
	 * }>}
	 */
	const builtInClassConstructorMap$1 = new Map();
	/**
	 * js内置类映射
	 * 内置类id 到 解码处理函数
	 * 解码处理函数需要处理引用索引数组
	 * @type {Map<number, (decoder: Decoder) => any>}
	 */
	const builtInClassTypeIdMap$1 = new Map();

	([
	    {
	        constructor: Map,
	        typeId: 1,
	        encode: (/** @type {Encoder} */ encoder, /** @type {Map} */ obj) =>
	        {
	            encoder.pushVint(obj.size);
	            obj.forEach((value, key) =>
	            {
	                encoder.traversal(key);
	                encoder.traversal(value);
	            });
	        },
	        decode: (/** @type {Decoder} */decoder) =>
	        {
	            let ret = new Map();
	            let childCount = decoder.getVInt();
	            decoder.referenceIndList.push(ret);
	            for (let i = 0; i < childCount; i++)
	            {
	                let key = decoder.traversal();
	                ret.set(key, decoder.traversal());
	            }
	            return ret;
	        }
	    },
	    {
	        constructor: Set,
	        typeId: 2,
	        encode: (/** @type {Encoder} */ encoder, /** @type {Set} */ obj) =>
	        {
	            obj.forEach(o =>
	            {
	                encoder.traversal(o);
	            });
	            encoder.push(0);
	        },
	        decode: (/** @type {Decoder} */decoder) =>
	        {
	            let ret = new Set();
	            decoder.referenceIndList.push(ret);
	            while (decoder.peekByte() != 0)
	                ret.add(decoder.traversal());
	            decoder.index++;
	            return ret;
	        }
	    },
	    {
	        constructor: ArrayBuffer,
	        typeId: 20,
	        encode: (/** @type {Encoder} */ encoder, /** @type {ArrayBuffer} */ obj) =>
	        {
	            encoder.pushVint(obj.byteLength);
	            encoder.pushArr(new Uint8Array(obj));
	        },
	        decode: (/** @type {Decoder} */decoder) =>
	        {
	            let length = decoder.getVInt();
	            let ret = decoder.buffer.buffer.slice(decoder.index, decoder.index + length);
	            decoder.referenceIndList.push(ret);
	            decoder.index += length;
	            return ret;
	        }
	    },
	]).forEach(o =>
	{
	    builtInClassConstructorMap$1.set(o.constructor, {
	        typeId: o.typeId,
	        encode: o.encode
	    });
	    builtInClassTypeIdMap$1.set(o.typeId, o.decode);
	});

	([
	    {
	        constructor: Int8Array,
	        typeId: 10
	    },
	    {
	        constructor: Uint8Array,
	        typeId: 11
	    },
	    {
	        constructor: Int16Array,
	        typeId: 12
	    },
	    {
	        constructor: Uint16Array,
	        typeId: 13
	    },
	    {
	        constructor: Int32Array,
	        typeId: 14
	    },
	    {
	        constructor: Uint32Array,
	        typeId: 15
	    },
	    {
	        constructor: BigInt64Array,
	        typeId: 16
	    },
	    {
	        constructor: BigUint64Array,
	        typeId: 17
	    },
	    {
	        constructor: Float32Array,
	        typeId: 18
	    },
	    {
	        constructor: Float64Array,
	        typeId: 19
	    }
	]).forEach(o =>
	{
	    builtInClassConstructorMap$1.set(o.constructor, {
	        typeId: o.typeId,
	        encode: (encoder, /** @type {InstanceType<typeof o.constructor>} */obj) =>
	        {
	            let buffer = obj.buffer;
	            let byteOffset = obj.byteOffset;
	            let length = obj.length;
	            encoder.pushVint(byteOffset);
	            encoder.pushVint(length);
	            encoder.traversal(buffer);
	        }
	    });
	    builtInClassTypeIdMap$1.set(o.typeId, decode =>
	    {
	        let refInd = decode.referenceIndList.length;
	        decode.referenceIndList.push(null);

	        let byteOffset = decode.getVInt();
	        let length = decode.getVInt();
	        let buffer = decode.traversal();

	        let ret = new o.constructor(buffer, byteOffset, length);
	        decode.referenceIndList[refInd] = ret;
	        return ret;
	    });
	});

	const textDecoder$1 = new TextDecoder("utf-8");

	/**
	 * JSOBin解码器
	 */
	let Decoder$1 = class Decoder
	{
	    /**
	     * @type {State}
	     */
	    #state = null;

	    /**
	     * 缓冲区
	     * @type {Uint8Array}
	     */
	    buffer = null;
	    /**
	     * 缓冲区对应的DataView
	     * @type {DataView}
	     */
	    dataView = null;
	    /**
	     * 当前读取到的位置
	     */
	    index = 0;

	    /**
	     * 引用列表
	     * 用于记录引用索引对应的内容
	     * @type {Array}
	     */
	    referenceIndList = [];

	    /**
	     * @param {State} state
	     * @param {Uint8Array} buffer
	     */
	    constructor(state, buffer)
	    {
	        this.#state = state;
	        this.buffer = buffer;
	        this.dataView = new DataView(buffer.buffer);
	    }

	    /**
	     * 获取当前位置的byte
	     * @returns {number}
	     */
	    peekByte()
	    {
	        return this.buffer[this.index];
	    }

	    /**
	     * 弹出当前位置的byte
	     * 将移动索引位置
	     * @returns {number}
	     */
	    popByte()
	    {
	        return this.buffer[this.index++];
	    }

	    /**
	     * 读一个vint
	     * @returns {number}
	     */
	    getVInt()
	    {
	        let ret = 0;
	        let bitPointer = 0;
	        while (!(this.peekByte() & (1 << 7)))
	        {
	            ret |= this.popByte() << bitPointer;
	            bitPointer += 7;
	            if (bitPointer > 32) // (bitPointer > 28)
	                throw "JSOBin Decode: Unexpected vint length";
	        }
	        ret |= (this.popByte() & ((1 << 7) - 1)) << bitPointer;
	        return ret;
	    }

	    /**
	    * 获取一个字符串(带有表示长度的vint)
	    * @returns {string}
	    */
	    getStr()
	    {
	        let len = this.getVInt();
	        let str = textDecoder$1.decode(this.buffer.subarray(this.index, this.index + len));
	        this.index += len;
	        return str;
	    }

	    /**
	     * 遍历解码
	     * @returns {any}
	     */
	    traversal()
	    {
	        if (this.index >= this.buffer.length)
	            throw "JSOBin Decode: Wrong format";
	        let typeId = this.popByte();
	        switch (typeId)
	        {
	            case 1: { // 变长型整数
	                let num = this.getVInt();
	                this.referenceIndList.push(num);
	                return num;
	            }

	            case 2: { // 浮点数
	                let num = this.dataView.getFloat64(this.index, true);
	                this.referenceIndList.push(num);
	                this.index += 8;
	                return num;
	            }

	            case 3: { // 字符串
	                let str = this.getStr();
	                this.referenceIndList.push(str);
	                return str;
	            }

	            case 4: { // 对象
	                let ret = {};
	                let childCount = this.getVInt();
	                this.referenceIndList.push(ret);
	                for (let i = 0; i < childCount; i++)
	                {
	                    let key = this.getStr();
	                    ret[key] = this.traversal();
	                }
	                return ret;
	            }

	            case 5: { // 数组
	                let ret = [];
	                this.referenceIndList.push(ret);
	                while (this.peekByte())
	                    ret.push(this.traversal());
	                this.index++;
	                return ret;
	            }

	            case 6: { // 类
	                let className = this.getStr();
	                let classConstructor = this.#state.nameToClass.get(className);
	                if (classConstructor == undefined)
	                    throw `JSOBin Decode: (class) "${className}" is unregistered class in the current context in the parsing jsobin`;
	                if (classConstructor?.[deserializationFunctionSymbol$1]) // 存在自定义反序列化函数
	                { // TODO 类的自定义处理需要大改版 目前无法在自定义序列化下使用循环引用
	                    let dataObj = {};
	                    let childCount = this.getVInt();
	                    let refInd = this.referenceIndList.length;
	                    this.referenceIndList.push(dataObj);
	                    for (let i = 0; i < childCount; i++)
	                    {
	                        let key = this.getStr();
	                        dataObj[key] = this.traversal();
	                    }
	                    let ret = classConstructor[deserializationFunctionSymbol$1](dataObj);
	                    this.referenceIndList[refInd] = ret;
	                    return ret;
	                }
	                else // 自定义类默认序列化方案
	                {
	                    let ret = Object.create(classConstructor.prototype);
	                    let childCount = this.getVInt();
	                    this.referenceIndList.push(ret);
	                    for (let i = 0; i < childCount; i++)
	                    {
	                        let key = this.getStr();
	                        ret[key] = this.traversal();
	                    }
	                    return ret;
	                }
	            }

	            case 7: { // 未定义(undefined)
	                this.referenceIndList.push(undefined);
	                return undefined;
	            }

	            case 8: { // 布尔值假
	                this.referenceIndList.push(false);
	                return false;
	            }

	            case 9: { // 布尔值真
	                this.referenceIndList.push(true);
	                return true;
	            }

	            case 10: { // symbol类型
	                let symbol = Symbol(this.getStr());
	                this.referenceIndList.push(symbol);
	                return symbol;
	            }

	            case 11: { // 无效对象(null)
	                this.referenceIndList.push(null);
	                return null;
	            }

	            case 12: { // bigint类型(正数)
	                let len = this.getVInt();
	                let num = this.readBigInt(len);
	                this.referenceIndList.push(num);
	                return num;
	            }

	            case 13: { // bigint类型(负数)
	                let len = this.getVInt();
	                let num = this.readBigInt(len);
	                this.referenceIndList.push(num);
	                return -num;
	            }

	            case 14: { // 引用
	                let referenceInd = this.getVInt();
	                let ret = this.referenceIndList[referenceInd];
	                this.referenceIndList.push(ret);
	                return ret;
	            }

	            case 15: { // js内置类
	                let builtInClassId = this.getVInt();
	                let decodeFunction = builtInClassTypeIdMap$1.get(builtInClassId);
	                if (decodeFunction)
	                    return decodeFunction(this);
	                else
	                    throw "JSOBin Decode: Unsupported js built-in class type.";
	            }

	            case 16: { // 函数 目前不支持
	                throw "JSOBin Decode: Function is not supported in the current version";
	            }

	            case 17: { // 安全函数
	                let func = this.#state.nameToSafetyFunction.get(this.getStr());
	                this.referenceIndList.push(func);
	                return func;
	            }

	            default:
	                throw "JSOBin Decode: Wrong format";
	        }
	    }

	    /**
	     * 解码
	     * @returns {object | number | string}
	     */
	    decode()
	    {
	        return this.traversal();
	    }

	    /**
	     * 反序列化一个Bigint
	     * @param {number} len
	     * @returns {bigint} 正数bigint 或 负数bigint的相反数
	     */
	    readBigInt(len)
	    {
	        let ret = 0n;
	        for (let ptr = this.index + len - 1; ptr >= this.index; ptr--)
	        {
	            ret <<= 8n;
	            ret += BigInt(this.buffer[ptr]);
	        }
	        this.index += len;
	        return ret;
	    }
	};

	/**
	 * JSOBin操作上下文
	 */
	let JSOBin$1 = class JSOBin
	{
	    /**
	     * @type {State}
	     */
	    #state = new State$1();

	    /**
	     * 添加类到上下文
	     * 注册标识符和类(构造器)的相互映射
	     * @param {string} identifier 类标识符
	     * @param {function} classConstructor 类的构造器
	     */
	    addClass(identifier, classConstructor)
	    {
	        this.#state.nameToClass.set(identifier, classConstructor);
	        this.#state.classToName.set(classConstructor, identifier);
	    }

	    /**
	     * 添加安全函数到上下文
	     * 允许确保安全的函数注册标识符和函数的相互映射
	     * @param {string} identifier 安全函数标识符
	     * @param {function} safetyFunction 函数
	     */
	    addSafetyFunction(identifier, safetyFunction)
	    {
	        this.#state.nameToSafetyFunction.set(identifier, safetyFunction);
	        this.#state.safetyFunctionToName.set(safetyFunction, identifier);
	    }

	    /**
	     * 编码
	     * @param {object | number | string} obj
	     * @param {{
	     *  referenceString?: boolean
	     * }} [config]
	     * @returns {Uint8Array}
	     */
	    encode(obj, config)
	    {
	        config = Object.assign({
	            referenceString: false
	        }, config);
	        return (new Encoder$1(this.#state, config.referenceString)).encode(obj);
	    }

	    /**
	     * 解码
	     * @param {Uint8Array} bin
	     * @returns {object | number | string}
	     */
	    decode(bin)
	    {
	        return (new Decoder$1(this.#state, bin)).decode();
	    }
	};

	/**
	 * 生成唯一字符串
	 * 基于毫秒级时间和随机数
	 * 不保证安全性
	 * @param {number} [randomSection] 随机节数量
	 * @returns {string}
	 */
	function uniqueIdentifierString$2(randomSection = 2)
	{
	    var ret = Math.floor(Date.now()).toString(36);
	    for (let i = 0; i < randomSection; i++)
	        ret += "-" + Math.floor(Math.random() * 2.82e12).toString(36);
	    return ret;
	}

	const jsob = new JSOBin$1();

	/**
	 * forge分片数据包
	 * 数据包id 到 分片信息 映射
	 * @type {Map<string, {
	 *  slices: Array<string>,
	 *  createTime: number,
	 *  updateTime: number,
	 *  packetTime: number,
	 *  creator: string,
	 *  totalCount: number
	 *  hasCount: number
	 * }>}
	 */
	let forgeSliceMap = new Map();

	/**
	 * 未完成的分片符号
	 */
	const unfinishedSliceSymbol = Symbol("unfinishedSliceSymbol");

	setInterval(() =>
	{
	    let nowTime = Date.now();
	    forgeSliceMap.forEach((o, id) =>
	    {
	        if (o.updateTime < nowTime - 15 * 1000)
	            forgeSliceMap.delete(id);
	    });
	}, 5000);

	/**
	 * 读取forge数据包
	 * @param {string} dataStr
	 * @param {string} creatorId
	 * @returns {Object | unfinishedSliceSymbol}
	 */
	function readForgePacket(dataStr, creatorId)
	{
	    if (dataStr.startsWith("iiroseForge:") && dataStr.endsWith(":end"))
	    {
	        let data = dataStr.slice(12, -4);
	        try
	        {
	            let commaIndex = data.indexOf(",");
	            let len = Number.parseInt(data.slice(0, commaIndex), 36);
	            if (Number.isNaN(len) || len < 0 || len > 8192)
	                return undefined;
	            data = data.slice(commaIndex + 1);
	            let dataBase64 = data.slice(0, len);
	            if (dataBase64.length != len)
	                return undefined;

	            let metaArr = data.slice(len).split(",");

	            if (metaArr[1] == "single") // 单包数据
	            {
	                if (metaArr.length < 2)
	                    return undefined;
	                return jsob.decode(base64ToUint8(dataBase64));
	            }
	            else if (metaArr[1] == "slice") // 分片数据
	            {
	                if (metaArr.length < 5)
	                    return undefined;
	                let nowTime = Date.now();
	                let packetId = metaArr[0];
	                let sliceIndex = Number.parseInt(metaArr[2], 36);
	                let sliceCount = Number.parseInt(metaArr[3], 36);
	                let packetTime = Number.parseInt(metaArr[4], 36);
	                if (
	                    Number.isNaN(sliceIndex) ||
	                    Number.isNaN(sliceCount) ||
	                    Number.isNaN(packetTime) ||
	                    sliceCount > 64 ||
	                    sliceIndex < 0 ||
	                    sliceIndex >= sliceCount ||
	                    packetTime > nowTime + 15 * 1000 ||
	                    packetTime < nowTime - 60 * 1000 ||
	                    packetId == ""
	                )
	                    return unfinishedSliceSymbol;
	                let sliceInfo = forgeSliceMap.get(packetId);
	                if (!sliceInfo)
	                {
	                    sliceInfo = {
	                        slices: Array(sliceCount),
	                        createTime: nowTime,
	                        updateTime: nowTime,
	                        packetTime: packetTime,
	                        creator: creatorId,
	                        hasCount: 0,
	                        totalCount: sliceCount
	                    };
	                    forgeSliceMap.set(packetId, sliceInfo);
	                }
	                if (
	                    sliceInfo.creator != creatorId ||
	                    sliceInfo.packetTime != packetTime ||
	                    sliceInfo.totalCount != sliceCount ||
	                    sliceInfo.slices[sliceIndex] != undefined
	                )
	                    return unfinishedSliceSymbol;
	                sliceInfo.updateTime = nowTime;
	                sliceInfo.hasCount++;
	                sliceInfo.slices[sliceIndex] = dataBase64;
	                if (sliceInfo.hasCount < sliceCount)
	                    return unfinishedSliceSymbol;
	                else
	                {
	                    forgeSliceMap.delete(packetId);
	                    return jsob.decode(base64ToUint8(sliceInfo.slices.join("")));
	                }
	            }
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
	 * @returns {string | Array<string>}
	 */
	function writeForgePacket(obj)
	{
	    const maxBodyLength = 8192;
	    try
	    {
	        let dataBase64 = uint8ToBase64(jsob.encode(obj, { referenceString: true }));
	        if (dataBase64.length <= maxBodyLength)
	        {
	            let metaArr = ["", "single"];
	            return `iiroseForge:${dataBase64.length.toString(36)},${dataBase64}${metaArr.join(",")}:end`;
	        }
	        else
	        {
	            let packetTime = Date.now();
	            let packetTimeStr = packetTime.toString(36);
	            let packetId = uniqueIdentifierString$2();
	            let sliceCount = Math.ceil(dataBase64.length / maxBodyLength);
	            let sliceCountStr = sliceCount.toString(36);
	            return Array(sliceCount).fill(0).map((_, i) =>
	            {
	                let dataSlice = dataBase64.slice(i * maxBodyLength, (i + 1) * maxBodyLength);
	                let metaArr = [
	                    packetId,
	                    "slice",
	                    i.toString(36),
	                    sliceCountStr,
	                    packetTimeStr
	                ];
	                return `iiroseForge:${dataSlice.length.toString(36)},${dataSlice}${metaArr.join(",")}:end`;
	            });
	        }
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
	            color: cssG.rgb(255, 255, 255),
	            backgroundColor: cssG.rgb(255, 255, 255, 0.1),
	            backdropFilter: "blur(2px) brightness(90%)",
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
	            boxShadow: `${cssG.rgb(0, 0, 0, 0.55)} 3px 3px 9px`
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
	                fontWeight: "bolder",
	                // textShadow: "0px 0px 5px rgb(255, 255, 255), 0px 0px 3px rgba(255, 255, 255, 0.7)"
	            }
	        }, { // 通知正文
	            text: text,
	            style: {
	                // textShadow: "0px 0px 5px rgb(255, 255, 255), 0px 0px 3px rgba(255, 255, 255, 0.7)"
	            }
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
	    }, 2500 + Math.min(15 * 1000, text.length * 255));

	    if (callback)
	    {
	        notice.asse(buttonAsse);
	        notice.addEventListener("click", () =>
	        {
	            if (!startClosing)
	            {
	                callback();
	                closeThisNotice();
	            }
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
	 * html特殊符号转义
	 * @param {string} e 
	 * @returns {string}
	 */

	/**
	 * html特殊符号反转义
	 * @param {string} e 
	 * @returns {string}
	 */
	function htmlSpecialCharsDecode(e)
	{
	    e = e.replaceAll("&lt;", `<`);
	    e = e.replaceAll("&gt;", `>`);
	    e = e.replaceAll("&quot;", `"`);
	    e = e.replaceAll("&#039;", `'`);
	    e = e.replaceAll("&#092;", `\\`);

	    e = e.replaceAll("&amp;", `&`);

	    return e;
	}

	const forgeOccupyPlugNameSet = new Set([
	    "forge",
	    "iiroseForge",
	    "forgeFrame",
	    "iiroseForgeFrame",
	]);

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
	         * 通过房间id获取房间信息
	         * @param {string} roomId
	         * @returns {{
	         *  name: string,
	         *  roomPath: Array<string>,
	         *  color: string,
	         *  description: string,
	         *  roomImage: string,
	         *  currentUserNum: number | "hidden"
	         * }}
	         */
	        getRoomInfoById: (roomId) =>
	        {
	            roomId = String(roomId);
	            let roomInfoArray = iframeContext.iframeWindow?.["Objs"]?.mapHolder?.Assets?.roomJson?.[roomId];
	            if (roomInfoArray)
	            {
	                let imageAndDescription = htmlSpecialCharsDecode(roomInfoArray[5].split("&&")[0].split("&")[0]);
	                let firstSpaceIndex = imageAndDescription.indexOf(" ");
	                return {
	                    name: roomInfoArray[1],
	                    color: roomInfoArray[2],
	                    roomPath: (/** @type {string} */(roomInfoArray[0])).split("_"),
	                    description: imageAndDescription.slice(firstSpaceIndex + 1),
	                    roomImage: imageAndDescription.slice(0, firstSpaceIndex),
	                    currentUserNum: (typeof (roomInfoArray[7]) == "number" ? roomInfoArray[7] : "hidden")
	                };
	            }
	            else
	                return null;
	        },

	        /**
	         * 通过uid获取在线用户的信息
	         * @param {string} uid
	         * @returns {{
	         *  name: string,
	         *  color: string,
	         *  avatar: string,
	         *  roomId: string,
	         *  personalizedSignature: string
	         * }}
	         */
	        getOnlineUserInfoById: (uid) =>
	        {
	            uid = String(uid);
	            let userInfoArray = iframeContext.iframeWindow?.["Objs"]?.mapHolder?.function?.findUserByUid?.(uid);
	            if (userInfoArray)
	            {
	                let imageAndDescription = htmlSpecialCharsDecode(userInfoArray[5].split("&&")[0].split("&")[0]);
	                imageAndDescription.indexOf(" ");
	                return {
	                    name: userInfoArray[2],
	                    color: userInfoArray[3],
	                    avatar: userInfoArray[0],
	                    roomId: userInfoArray[4],
	                    personalizedSignature: userInfoArray[6]
	                };
	            }
	            else
	                return null;
	        },

	        /**
	         * 切换房间
	         * @param {string} roomId
	         */
	        changeRoom: (roomId) =>
	        {
	            roomId = String(roomId);
	            if (roomId)
	                iframeContext.iframeWindow?.["Objs"]?.mapHolder?.function?.roomchanger(roomId);
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
	         * 在用户所在房间发送forge包消息
	         * @param {Object} obj
	         */
	        sendRoomForgePacket: (obj) =>
	        {
	            if (
	                typeof (obj) != "object" ||
	                (forgeApi.state.plug && forgeOccupyPlugNameSet.has(obj.plug))
	            )
	                return;
	            let forgePacket = writeForgePacket(obj);
	            if (typeof (forgePacket) == "string")
	                forgeApi.operation.sendRoomMessage(forgePacket);
	            else
	                (async () =>
	                {
	                    for (let i = 0; i < forgePacket.length; i++)
	                    {
	                        forgeApi.operation.sendRoomMessage(forgePacket[i]);
	                        await delayPromise(60);
	                    }
	                })();
	        },

	        /**
	         * 私聊发送forge包消息
	         * @param {string} targetUid
	         * @param {Object} obj
	         */
	        sendPrivateForgePacket: (targetUid, obj) =>
	        {
	            if (
	                typeof (obj) != "object" ||
	                (forgeApi.state.plug && forgeOccupyPlugNameSet.has(obj.plug))
	            )
	                return;
	            let forgePacket = writeForgePacket(obj);
	            if (typeof (forgePacket) == "string")
	                forgeApi.operation.sendPrivateMessageSilence(targetUid, forgePacket);
	            else
	                (async () =>
	                {
	                    for (let i = 0; i < forgePacket.length; i++)
	                    {
	                        forgeApi.operation.sendPrivateMessageSilence(targetUid, forgePacket[i]);
	                        await delayPromise(60);
	                    }
	                })();
	        },

	        /**
	         * 给自己私聊发送forge包消息
	         * @param {Object} obj
	         */
	        sendSelfPrivateForgePacket: (obj) =>
	        {
	            forgeApi.operation.sendPrivateForgePacket(forgeApi.operation.getUserUid(), obj);
	        },

	        /**
	         * 静默发送私聊
	         * @param {string} targetUid
	         * @param {string} content
	         */
	        sendPrivateMessageSilence: (targetUid, content) =>
	        {
	            targetUid = String(targetUid);
	            content = String(content);
	            if (!content || !targetUid)
	                return;
	            iframeContext.socketApi.send(JSON.stringify({
	                "g": targetUid,
	                "m": content,
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
	        },

	        /**
	         * 执行终端命令
	         * 插件暂时无法申请此权限
	         * @param {string} command
	         */
	        runTerminalCommand: (command) =>
	        {
	            command = String(command);
	            runTerminalCommand(command);
	        },

	        /**
	         * 在当前用户所在的页面发送信息
	         * 插件暂时无法申请此权限
	         * @param {string} content
	         */
	        sendCurrentPageMessage: (content) =>
	        {
	            content = String(content);
	            sendMessageOnCurrentPage(content);
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
	        roomForgePacket: new EventHandler$1(),
	        /**
	         * 接收到私聊的forge数据包
	         * @type {EventHandler<{ senderId: string, senderName: string, content: Object }>}
	         */
	        privateForgePacket: new EventHandler$1(),
	        /**
	         * 接收到自己发给自己的forge数据包
	         * @type {EventHandler<{ content: Object }>}
	         */
	        selfPrivateForgePacket: new EventHandler$1(),
	    }
	};

	window["iiroseForgeApi"] = forgeApi; // 给外侧侧载脚本预留forgeApi

	let globalState = {
	    debugMode: false
	};

	let debugModeContext = {
	    /**
	     * 发送数据包
	     * @param {string} packet 
	     */
	    send: (packet) =>
	    {
	        iframeContext.socketApi.send(packet);
	    },

	    /**
	     * 模拟客户端发送数据包
	     * @param {string} packet 
	     */
	    clientSend: (packet) =>
	    {
	        iframeContext.socket.send(packet);
	    },

	    /**
	     * 模拟收到数据包
	     * @param {string} packet 
	     */
	    receive: (packet) =>
	    {
	        iframeContext.socket._onmessage(packet);
	    },
	};

	/**
	 * 启用调试模式
	 * @param {Boolean} enable 
	 */
	function enableForgeDebugMode(enable)
	{
	    enable = Boolean(enable);

	    globalState.debugMode = enable;

	    if (enable)
	    {
	        window["fdb"] = debugModeContext;
	        if (iframeContext.iframeWindow)
	            iframeContext.iframeWindow["fdb"] = debugModeContext;
	        sessionStorage.setItem("iiroseForgeDebugMode", "true");
	    }
	    else
	    {
	        if (window["fdb"])
	            delete window["fdb"];
	        if (iframeContext.iframeWindow?.["fdb"])
	            delete iframeContext.iframeWindow["fdb"];
	        sessionStorage.removeItem("iiroseForgeDebugMode");
	    }
	}

	let iiroseForgeLoaderUrl = "https://qwq0.github.io/iiroseForge/l.js";
	let iiroseForgeLoaderElementHtml = `<script type="text/javascript" src="${iiroseForgeLoaderUrl}"></script>`;

	/**
	 * 向缓存中注入iiroseForge
	 * @returns {Promise<void>}
	 */
	async function writeForgeToCache()
	{
	    let cache = await caches.open("v");
	    let catchMatch = await caches.match("/");
	    if (catchMatch)
	    {
	        let cacheMainPage = await catchMatch.text();
	        if (cacheMainPage.indexOf(iiroseForgeLoaderElementHtml) > -1)
	            return;
	        let insertIndex = cacheMainPage.lastIndexOf("</body></html>");
	        if (insertIndex == -1)
	            return;
	        let newCacheMainPage = cacheMainPage.slice(0, insertIndex) + iiroseForgeLoaderElementHtml + cacheMainPage.slice(insertIndex);
	        await cache.put("/", new Response(new Blob([newCacheMainPage], { type: "text/html" }), { status: 200, statusText: "OK" }));
	    }
	    else
	    {
	        let newCacheMainPage = ([
	            `<!DOCTYPE html>`,
	            `<html>`,
	            `<head>`,
	            `</head>`,
	            `<body>`,
	            `<script>`,
	            `(async() => {`,
	            
	            `let cache = await caches.open("v");`,
	            `await cache.delete("/");`,

	            `let cacheMainPage = await (await fetch("/",{cache:"no-cache"})).text();`,
	            `let insertIndex = cacheMainPage.lastIndexOf("</body></html>");`,

	            `let newCacheMainPage = (insertIndex == -1 ? cacheMainPage : (cacheMainPage.slice(0, insertIndex) + \`<script\` + `,
	            `\` type="text/javascript" src="${iiroseForgeLoaderUrl}"><\` + \`/script>\` + cacheMainPage.slice(insertIndex)));`,
	            
	            `await cache.put("/", new Response(new Blob([newCacheMainPage], { type: "text/html" }), { status: 200, statusText: "OK" }));`,

	            `location.reload();`,

	            `})();`,
	            `</script>`,
	            `</body>`,
	            `</html>`
	        ]).join("");
	        await cache.put("/", new Response(new Blob([newCacheMainPage], { type: "text/html" }), { status: 200, statusText: "OK" }));
	    }
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

	if (localStorage.getItem("installForge") == "true")
	{ // 用户要求安装
	    writeForgeToCache();
	}

	/**
	 * 储存上下文
	 * 将使用json进行序列化
	 */
	const storageContext = {
	    roaming: {
	        /**
	         * 插件信息
	         * @type {Array<[string, string, Array<string>, Array<string>]>}
	         */
	        plugInfo: [],
	        /**
	         * 侧载脚本
	         * @type {Array<[string, string, boolean]>}
	         */
	        sideLoadedScript: [],
	        /**
	         * 用户备注
	         * 用户uid 到 用户备注
	         * @type {Object<string, string>}
	         */
	        userRemark: {},
	        /**
	         * 我的其他账号uid列表
	         * @type {Array<string>}
	         */
	        myAccountList: []
	    },
	    local: {
	        // 启用同步聊天记录
	        enableSyncChatRecord: false,
	        // 启用用户备注
	        enableUserRemark: true,
	        // 启用超级菜单
	        enableSuperMenu: false,
	        // 最后一次关闭的时间
	        lastCloseTime: 0,
	        // 已同步聊天记录到此时间
	        syncChatRecordTo: 0,
	        // 启用实验性功能
	        enableExperimental: false,
	        // 实验性功能选项
	        experimentalOption: {}
	    }
	};

	/**
	 * 设置储存
	 * @param {Object} storageObj
	 */
	function storageRoamingSet(storageObj)
	{
	    try
	    {
	        Object.keys(storageObj).forEach(key =>
	        {
	            storageContext.roaming[key] = storageObj[key];
	        });
	        Object.keys(storageContext.roaming).forEach(key =>
	        {
	            if (
	                typeof (storageContext.roaming[key]) == "object" &&
	                !Array.isArray(storageContext.roaming[key])
	            )
	                storageContext.roaming[key] = createHookObj(storageContext.roaming[key]);
	        });
	    }
	    catch (err)
	    {
	        showNotice("错误", "无法设置储存 这可能导致iiroseForge配置丢失");
	    }
	}

	function storageRoamingRead()
	{
	    try
	    {
	        let storageJson = localStorage.getItem("iiroseForge");
	        let storageObj = (storageJson ? JSON.parse(storageJson) : {});
	        storageRoamingSet(storageObj);
	    }
	    catch (err)
	    {
	        showNotice("错误", "无法读入储存 这可能导致iiroseForge配置丢失");
	    }
	}

	function storageRoamingSave()
	{
	    try
	    {
	        let storageJson = JSON.stringify(storageContext.roaming);
	        localStorage.setItem("iiroseForge", storageJson);
	    }
	    catch (err)
	    {
	        showNotice("错误", "无法写入储存 这可能导致iiroseForge配置丢失");
	    }
	}

	function storageLocalRead()
	{
	    try
	    {
	        let storageJson = localStorage.getItem("iiroseForgeLocal");
	        let storageObj = (storageJson ? JSON.parse(storageJson) : {});
	        Object.keys(storageObj).forEach(key =>
	        {
	            storageContext.local[key] = storageObj[key];
	        });
	    }
	    catch (err)
	    {
	        showNotice("错误", "无法读入本地储存 这可能导致iiroseForge配置丢失");
	    }
	}

	function storageLocalSave()
	{
	    try
	    {
	        let storageJson = JSON.stringify(storageContext.local);
	        localStorage.setItem("iiroseForgeLocal", storageJson);
	    }
	    catch (err)
	    {
	        showNotice("错误", "无法写入本地储存 这可能导致iiroseForge配置丢失");
	    }
	}

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
	 * 显示多行输入框
	 * @param {string} title
	 * @param {string} text
	 * @param {boolean} [allowCancel]
	 * @param {string} [initValue]
	 * @returns {Promise<string>}
	 */
	async function showTextareaBox(title, text, allowCancel = false, initValue = "")
	{
	    var textarea = expandElement({
	        tagName: "textarea",
	        style: {
	            resize: "none",
	            height: "5em",
	            weight: "20em"
	        },
	        attr: {
	            value: initValue
	        }
	    });
	    textarea.addEventListener("keydown", e => { e.stopPropagation(); }, true);
	    var confirm = await showInfoBox(title, text, allowCancel, textarea);
	    return (confirm ? textarea.element.value : undefined);
	}

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
	 * 创建蔷薇菜单元素
	 * @param {string} icon
	 * @param {string} title
	 * @param {(e: MouseEvent) => void} callback
	 * @returns {NElement}
	 */
	function createIiroseMenuElement(icon, title, callback)
	{
	    return NList.getElement([
	        className("selectHolderBoxItem selectHolderBoxItemIcon"),
	        [
	            className(icon),
	            createNStyleList({
	                fontFamily: "md",
	                fontSize: "28px",
	                textAlign: "center",
	                lineHeight: "100px",
	                height: "100px",
	                width: "100px",
	                position: "absolute",
	                top: "0",
	                opacity: ".7",
	                left: "0",
	            })
	        ],
	        title,
	        [
	            className("fullBox whoisTouch3")
	        ],
	        new NEvent("click", callback)
	    ]);
	}

	/**
	 * 启用用户备注功能
	 * @returns 
	 */
	function enableUserRemark()
	{
	    // 房间消息显示备注

	    // 聊天消息列表节点(房间消息)
	    let msgBox = iframeContext.iframeDocument.getElementsByClassName("msgholderBox")[0];
	    Array.from(msgBox.children).forEach(o =>
	    { // 处理已有的消息
	        processingMessageElement(/** @type {HTMLElement} */(o));
	    });
	    (new MutationObserver(mutationsList =>
	    {
	        for (let mutation of mutationsList)
	        {
	            if (mutation.type == "childList")
	            {
	                Array.from(mutation.addedNodes).forEach((/** @type {HTMLElement} */element) =>
	                { // 处理新增的消息
	                    if (element.classList != undefined && element.classList.contains("msg")) // 是消息
	                    {
	                        processingMessageElement(element);
	                    }
	                });
	            }
	        }
	    })).observe(msgBox, { attributes: false, childList: true, subtree: true, characterData: true, characterDataOldValue: true });



	    // 私聊选项卡显示备注

	    // 私聊选项卡列表
	    let sessionHolderPmTaskBox = iframeContext.iframeDocument.getElementsByClassName("sessionHolderPmTaskBox")[0];
	    Array.from(sessionHolderPmTaskBox.children).forEach(o =>
	    { // 处理已有的私聊选项卡
	        processingPrivateChatTabElement(/** @type {HTMLElement} */(o));
	    });
	    (new MutationObserver(mutationsList =>
	    {
	        for (let mutation of mutationsList)
	        {
	            if (mutation.type == "childList")
	            {
	                Array.from(mutation.addedNodes).forEach((/** @type {HTMLElement} */element) =>
	                { // 处理新增的私聊选项卡
	                    if (element.classList != undefined && element.classList.contains("sessionHolderPmTaskBoxItem"))
	                    {
	                        processingPrivateChatTabElement(element);
	                    }
	                });
	            }
	        }
	    })).observe(sessionHolderPmTaskBox, { attributes: false, childList: true, subtree: true, characterData: true, characterDataOldValue: true });



	    // 资料卡菜单设置备注

	    let oldFunction_Objs_mapHolder_function_event = iframeContext.iframeWindow["Objs"]?.mapHolder?.function?.event;
	    if (oldFunction_Objs_mapHolder_function_event)
	    { // 资料卡头像点击
	        iframeContext.iframeWindow["Objs"].mapHolder.function.event = proxyFunction(oldFunction_Objs_mapHolder_function_event, function (param, srcFunction, _targetFn, thisObj)
	        {
	            if (param.length == 1 && param[0] == 7)
	            {
	                let uid = thisObj?.dataset?.uid;
	                if (!uid)
	                    return false;

	                srcFunction(...param);

	                let selectHolderBox = iframeContext.iframeDocument.getElementById("selectHolderBox");
	                let oldRemarkName = storageContext.roaming.userRemark[uid];
	                selectHolderBox.appendChild(
	                    createIiroseMenuElement(
	                        "mdi-account-cog",
	                        `设置备注${oldRemarkName ? `(${oldRemarkName})` : ""}`,
	                        async e =>
	                        {
	                            e.stopPropagation();



	                            let oldRemarkName = storageContext.roaming.userRemark[uid];
	                            let newRemark = await showInputBox("设置备注", `给 ${uid} 设置备注`, true, (oldRemarkName ? oldRemarkName : ""));
	                            if (newRemark != undefined)
	                            {
	                                storageContext.roaming.userRemark[uid] = newRemark;
	                                storageRoamingSave();
	                            }
	                        }
	                    ).element
	                );
	                return true;
	            }
	            return false;
	        });
	    }



	    // 私聊选项卡菜单设置备注

	    let oldFunction_Utils_service_pm_menu = iframeContext.iframeWindow["Utils"]?.service?.pm?.menu;
	    if (oldFunction_Utils_service_pm_menu)
	    { // 私聊标签页点击
	        iframeContext.iframeWindow["Utils"].service.pm.menu = proxyFunction(oldFunction_Utils_service_pm_menu, function (param, srcFunction)
	        {
	            if (param.length == 1)
	            {
	                let uid = param[0]?.parentNode?.getAttribute?.("ip");
	                if (!uid)
	                    return false;

	                srcFunction(...param);

	                let selectHolderBox = iframeContext.iframeDocument.getElementById("selectHolderBox");
	                let oldRemarkName = storageContext.roaming.userRemark[uid];
	                selectHolderBox.appendChild(
	                    createIiroseMenuElement(
	                        "mdi-account-cog",
	                        `设置备注${oldRemarkName ? `(${oldRemarkName})` : ""}`,
	                        async e =>
	                        {
	                            e.stopPropagation();



	                            let oldRemarkName = storageContext.roaming.userRemark[uid];
	                            let newRemark = await showInputBox("设置备注", `给 ${uid} 设置备注`, true, (oldRemarkName ? oldRemarkName : ""));
	                            if (newRemark != undefined)
	                            {
	                                storageContext.roaming.userRemark[uid] = newRemark;
	                                storageRoamingSave();
	                            }
	                        }
	                    ).element
	                );
	                return true;
	            }
	            return false;
	        });
	    }
	}


	/**
	 * @type {WeakSet<HTMLElement>}
	 */
	let alreadyProcessedSet = new WeakSet();

	/**
	 * 处理消息元素
	 * @param {HTMLElement} messageElement
	 */
	function processingMessageElement(messageElement)
	{
	    if (messageElement.classList.length == 1 && messageElement.classList.item(0) == "msg")
	    {
	        if (alreadyProcessedSet.has(messageElement))
	            return;
	        alreadyProcessedSet.add(messageElement);

	        let uid = (
	            messageElement.dataset.id ?
	                messageElement.dataset.id.split("_")[0] :
	                (/** @type {HTMLElement} */(domPath(messageElement, [0, -1, 0])))?.dataset?.uid
	        );
	        let pubUserInfoElement = (/** @type {HTMLElement} */(domPath(messageElement, [0, 0, -1, -1])));
	        if (pubUserInfoElement)
	            pubUserInfoElement.appendChild((NList.getElement([
	                createNStyleList({
	                    color: "white",
	                    position: "absolute",
	                    whiteSpace: "pre",

	                    [pubUserInfoElement.style.float != "right" ? "left" : "right"]: "0px",
	                    width: "max-content",
	                    bottom: "42px"
	                }),
	                bindValue(
	                    storageContext.roaming.userRemark,
	                    uid,
	                    remarkName => (remarkName ? remarkName : "")
	                )
	            ])).element);
	    }
	}

	/**
	 * 处理私聊选项卡元素
	 * @param {HTMLElement} privateChatTabElement
	 */
	function processingPrivateChatTabElement(privateChatTabElement)
	{
	    if (
	        privateChatTabElement.classList.length == 2 &&
	        privateChatTabElement.classList.contains("sessionHolderPmTaskBoxItem") &&
	        privateChatTabElement.classList.contains("whoisTouch2")
	    )
	    {
	        if (alreadyProcessedSet.has(privateChatTabElement))
	            return;
	        alreadyProcessedSet.add(privateChatTabElement);

	        let uid = privateChatTabElement.getAttribute("ip");
	        let userNameElement = (/** @type {HTMLElement} */(domPath(privateChatTabElement, [1, 0, -1])));
	        if (userNameElement)
	            userNameElement.appendChild((NList.getElement([
	                createNStyleList({
	                    display: "inline",
	                    marginLeft: "3px"
	                }),
	                bindValue(
	                    storageContext.roaming.userRemark,
	                    uid,
	                    remarkName => (remarkName ? `(${remarkName})` : "")
	                )
	            ])).element);
	    }
	}

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

	let protocolEvent = {
	    /**
	     * forge事件
	     */
	    forge: {
	        /**
	         * 接收到房间的由forge本身发送的forge数据包
	         * @type {EventHandler<{ senderId: string, senderName: string, content: Object }>}
	         */
	        roomForgePacket: new EventHandler$2(),
	        /**
	         * 接收到私聊的由forge本身发送的forge数据包
	         * @type {EventHandler<{ senderId: string, senderName: string, content: Object }>}
	         */
	        privateForgePacket: new EventHandler$2(),
	        /**
	         * 接收到自己发给自己的由forge本身发送的forge数据包
	         * @type {EventHandler<{ content: Object }>}
	         */
	        selfPrivateForgePacket: new EventHandler$2(),
	    }
	};

	let toServerTrie = new Trie();
	let toClientTrie = new Trie();
	/**
	 * 数据包内容
	 * 将改变实际发送或接收的包的内容
	 * @type {[string]}
	 */
	let packageData = [""];

	toClientTrie.addPath(`"`, (data) => // 房间消息
	{
	    packageData[0] = `"` + data.split("<").reverse().map(data =>
	    {
	        let part = data.split(">");
	        // console.log(part);

	        if (part[4] != "s" && part[3][0] != `'`)
	        {
	            let senderId = part[8];
	            let senderName = part[2];
	            let content = part[3];

	            let forgePacket = readForgePacket(content, senderId);
	            if (forgePacket != undefined)
	            {
	                if (forgePacket != unfinishedSliceSymbol)
	                {
	                    if (typeof (forgePacket) != "object")
	                        return undefined;
	                    if (forgeOccupyPlugNameSet.has(forgePacket.plug))
	                        protocolEvent.forge.roomForgePacket.trigger({
	                            senderId: senderId,
	                            senderName: senderName,
	                            content: forgePacket
	                        });
	                    else
	                        forgeApi.event.roomForgePacket.trigger({
	                            senderId: senderId,
	                            senderName: senderName,
	                            content: forgePacket
	                        });
	                }
	                return undefined;
	            }
	            else
	                forgeApi.event.roomMessage.trigger({
	                    senderId: senderId,
	                    senderName: senderName,
	                    content: htmlSpecialCharsDecode(content)
	                });
	        }
	        return data;
	    }).filter(o => o != undefined).reverse().join("<");
	});

	toClientTrie.addPath(`""`, (data) => // 私聊消息
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
	            let receiverId = part[11];

	            if (senderId != userId)
	            {
	                let forgePacket = readForgePacket(content, senderId);
	                if (forgePacket != undefined)
	                {
	                    if (forgePacket != unfinishedSliceSymbol)
	                    {
	                        if (typeof (forgePacket) != "object")
	                            return undefined;
	                        if (forgeOccupyPlugNameSet.has(forgePacket.plug))
	                            protocolEvent.forge.privateForgePacket.trigger({
	                                senderId: senderId,
	                                senderName: senderName,
	                                content: forgePacket
	                            });
	                        else
	                            forgeApi.event.privateForgePacket.trigger({
	                                senderId: senderId,
	                                senderName: senderName,
	                                content: forgePacket
	                            });
	                    }
	                    return undefined;
	                }
	                else
	                    forgeApi.event.privateMessage.trigger({
	                        senderId: senderId,
	                        senderName: senderName,
	                        content: htmlSpecialCharsDecode(content)
	                    });
	            }
	            else if (senderId == userId && receiverId == userId)
	            {
	                let forgePacket = readForgePacket(content, senderId);
	                if (forgePacket != undefined)
	                {
	                    if (forgePacket != unfinishedSliceSymbol)
	                    {
	                        if (typeof (forgePacket) != "object")
	                            return undefined;
	                        if (forgeOccupyPlugNameSet.has(forgePacket.plug))
	                            protocolEvent.forge.selfPrivateForgePacket.trigger({
	                                content: forgePacket
	                            });
	                        else
	                            forgeApi.event.selfPrivateForgePacket.trigger({
	                                content: forgePacket
	                            });
	                    }
	                    return undefined;
	                }
	                else
	                    forgeApi.event.selfPrivateMessage.trigger({
	                        content: htmlSpecialCharsDecode(content)
	                    });
	            }
	            else if (senderName == userId && receiverId != userId)
	            {
	                let forgePacket = readForgePacket(content, senderId);
	                if (forgePacket != undefined)
	                    return undefined;
	            }
	        }
	        return data;
	    }).filter(o => o != undefined).join("<");
	});



	toServerTrie.addPath(`{`, (_, data) =>
	{
	    try
	    {
	        let obj = JSON.parse(data);
	        // console.log("send message", obj);
	        let objJsob = JSON.stringify(obj);
	        if (objJsob[0] == "{")
	            packageData[0] = objJsob;
	    }
	    catch (err)
	    {
	    }
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

	/*
	    JSOBin version 1.1.1
	*/

	/**
	 * 状态
	 */
	class State
	{
	    /**
	     * 类映射
	     * 类名字符串标识 到 类(构造函数)
	     * @package
	     * @type {Map<string, object>}
	     */
	    nameToClass = new Map();

	    /**
	     * 类映射
	     * 类(构造函数) 到 类名字符串标识
	     * @package
	     * @type {Map<object, string>}
	     */
	    classToName = new Map();

	    /**
	     * 安全函数映射
	     * 安全函数字符串标识 到 函数
	     * @package
	     * @type {Map<string, function>}
	     */
	    nameToSafetyFunction = new Map();

	    /**
	     * 安全函数映射
	     * 函数 到 安全函数字符串标识
	     * @package
	     * @type {Map<function, string>}
	     */
	    safetyFunctionToName = new Map();
	}

	/**
	 * 自定义序列化函数
	 */
	const serializationFunctionSymbol = Symbol("serialization function");
	/**
	 * 自定义反序列化函数
	 */
	const deserializationFunctionSymbol = Symbol("deserialization function");

	const textEncoder$1 = new TextEncoder();

	/**
	 * JSOBin编码器
	 */
	class Encoder
	{
	    /**
	     * @type {State}
	     */
	    #state = null;

	    /**
	     * 缓冲区
	     * @type {Uint8Array}
	     */
	    buffer = new Uint8Array(128);
	    /**
	     * 缓冲区结束索引
	     * 不包括该值
	     * @type {number}
	     */
	    endInd = 0;

	    /**
	     * 引用索引计数
	     * @type {number}
	     */
	    referenceIndCount = -1;
	    /**
	     * 
	     */
	    referenceIndMap = new Map();


	    /**
	     * @param {State} state
	     */
	    constructor(state)
	    {
	        this.#state = state;
	    }

	    /**
	     * 向缓冲区加入单个值
	     * @param {number} c
	     */
	    push(c)
	    {
	        if (this.endInd >= this.buffer.length)
	        {
	            let old = this.buffer;
	            this.buffer = new Uint8Array(this.buffer.length * 2);
	            this.buffer.set(old);
	        }
	        this.buffer[this.endInd++] = c;
	    }

	    /**
	     * 向缓冲区加入数组
	     * @param {Uint8Array} a 
	     */
	    pushArr(a)
	    {
	        if (this.endInd + a.length > this.buffer.length)
	        {
	            let old = this.buffer;
	            let newLen = old.length * 2;
	            while (this.endInd + a.length > newLen)
	                newLen *= 2;
	            this.buffer = new Uint8Array(newLen);
	            this.buffer.set(old);
	        }
	        this.buffer.set(a, this.endInd);
	        this.endInd += a.length;
	    }

	    /**
	     * 序列化一个vint
	     * @param {number} num
	     */
	    pushVint(num)
	    {
	        while (true)
	        {
	            let c = (num & ((1 << 7) - 1));
	            num >>>= 7;
	            if (!num)
	            {
	                this.push(c | (1 << 7));
	                return;
	            }
	            this.push(c);
	        }
	    }

	    /**
	     * 写入字符串
	     * @param {string} str
	     */
	    pushStr(str)
	    {
	        let strBin = textEncoder$1.encode(str);
	        this.pushVint(strBin.byteLength);
	        this.pushArr(strBin);
	    }

	    /**
	     * 遍历编码
	     * @param {object | number | string} now
	     */
	    traversal(now)
	    {
	        ++this.referenceIndCount;
	        if (!this.referenceIndMap.has(now))
	            this.referenceIndMap.set(now, this.referenceIndCount);
	        switch (typeof (now))
	        {
	            case "number": { // 数值型(整数或小数)
	                if (Number.isInteger(now) && now >= -2147483648 && now <= 2147483647) // 整数
	                {
	                    this.push(1);
	                    this.pushVint(now);
	                }
	                else // 浮点数
	                {
	                    this.push(2);
	                    this.pushArr(new Uint8Array(new Float64Array([now]).buffer));
	                }
	                break;
	            }

	            case "string": { // 字符串
	                this.push(3);
	                this.pushStr(now);
	                break;
	            }

	            case "object": { // 对象 数组 类 null
	                if (now == null) // null
	                    this.push(11);
	                else if (this.referenceIndMap.get(now) < this.referenceIndCount) // 需要引用的对象
	                {
	                    this.push(14);
	                    this.pushVint(this.referenceIndMap.get(now));
	                }
	                else if (Array.isArray(now)) // 数组
	                {
	                    this.push(5);
	                    now.forEach(o =>
	                    {
	                        this.traversal(o);
	                    });
	                    this.push(0);
	                }
	                else if (this.#state.classToName.has(Object.getPrototypeOf(now)?.constructor)) // 类(自定义类)
	                { // TODO 类的自定义处理需要大改版 目前无法在自定义序列化下使用循环引用
	                    this.push(6);
	                    this.pushStr(this.#state.classToName.get(Object.getPrototypeOf(now)?.constructor));
	                    let obj = now[serializationFunctionSymbol] ? now[serializationFunctionSymbol].call(now) : now; // 处理自定义序列化函数
	                    let keys = Object.getOwnPropertyNames(obj);
	                    this.pushVint(keys.length);
	                    keys.forEach(key =>
	                    {
	                        this.pushStr(key);
	                        this.traversal(obj[key]);
	                    });
	                }
	                else if (builtInClassConstructorMap.has(Object.getPrototypeOf(now)?.constructor)) // js内置类
	                {
	                    this.push(15);
	                    let classInfo = builtInClassConstructorMap.get(Object.getPrototypeOf(now)?.constructor);
	                    this.pushVint(classInfo.typeId);
	                    classInfo.encode(this, now);
	                }
	                else // 对象
	                {
	                    this.push(4);
	                    let keys = Object.keys(now);
	                    this.pushVint(keys.length);
	                    keys.forEach(key =>
	                    {
	                        this.pushStr(key);
	                        this.traversal(now[key]);
	                    });
	                }
	                break;
	            }

	            case "undefined": { // 未定义(undefined)
	                this.push(7);
	                break;
	            }

	            case "boolean": { // 布尔值
	                this.push(now ? 9 : 8);
	                break;
	            }

	            case "bigint": { // bigint类型
	                /** @type {Uint8Array} */
	                let bigintBuf = null;
	                if (now >= 0n) // bigint正数和0
	                {
	                    this.push(12);
	                    if (now == 0n) // bigint 0
	                        bigintBuf = new Uint8Array(0);
	                    else // bigint 正数
	                        bigintBuf = Encoder.writeBigint(now);
	                }
	                else // bigint负数
	                {
	                    this.push(13);
	                    bigintBuf = Encoder.writeBigint(-(/** @type {bigint} */(now)));
	                }
	                this.pushVint(bigintBuf.byteLength);
	                this.pushArr(bigintBuf);
	                break;
	            }

	            case "symbol": { // symbol类型
	                if (this.referenceIndMap.get(now) < this.referenceIndCount) // 需要引用的symbol
	                {
	                    this.push(14);
	                    this.pushVint(this.referenceIndMap.get(now));
	                }
	                else // 新的symbol
	                {
	                    this.push(10);
	                    this.pushStr(now.description ? now.description : "");
	                }
	                break;
	            }

	            case "function": { // 函数
	                if (this.#state.safetyFunctionToName.has(now)) // 安全函数
	                {
	                    this.push(17);
	                    this.pushStr(this.#state.safetyFunctionToName.get(now));
	                }
	                else
	                    this.push(7); // 目前不处理其他函数
	                break;
	            }

	            default:
	                throw "JSObin(encode): The type of value that cannot be processed.";
	        }
	    }

	    /**
	     * 获取最终缓冲区
	     * @returns {Uint8Array}
	     */
	    getFinalBuffer()
	    {
	        return this.buffer.slice(0, this.endInd);
	    }

	    /**
	     * 编码
	     * @param {object | number | string} obj
	     */
	    encode(obj)
	    {
	        this.traversal(obj);
	        return this.getFinalBuffer();
	    }

	    /**
	     * 序列化一个bigint
	     * @param {bigint} num 一个正数
	     * @returns {Uint8Array}
	     */
	    static writeBigint(num)
	    {
	        let buf = [];
	        while (true)
	        {
	            buf.push(Number(num & 255n));
	            num >>= 8n;
	            if (num == 0n)
	                return new Uint8Array(buf);
	        }
	    }
	}

	/**
	 * js内置类映射
	 * 内置类构造函数 到 内置类id和编码处理函数
	 * @type {Map<Function, {
	 *  typeId: number,
	 *  encode: (encoder: Encoder, obj: Object) => void
	 * }>}
	 */
	const builtInClassConstructorMap = new Map();
	/**
	 * js内置类映射
	 * 内置类id 到 解码处理函数
	 * 解码处理函数需要处理引用索引数组
	 * @type {Map<number, (decoder: Decoder) => any>}
	 */
	const builtInClassTypeIdMap = new Map();

	([
	    {
	        constructor: Map,
	        typeId: 1,
	        encode: (/** @type {Encoder} */ encoder, /** @type {Map} */ obj) =>
	        {
	            encoder.pushVint(obj.size);
	            obj.forEach((value, key) =>
	            {
	                encoder.traversal(key);
	                encoder.traversal(value);
	            });
	        },
	        decode: (/** @type {Decoder} */decoder) =>
	        {
	            let ret = new Map();
	            let childCount = decoder.getVInt();
	            decoder.referenceIndList.push(ret);
	            for (let i = 0; i < childCount; i++)
	            {
	                let key = decoder.traversal();
	                ret.set(key, decoder.traversal());
	            }
	            return ret;
	        }
	    },
	    {
	        constructor: Set,
	        typeId: 2,
	        encode: (/** @type {Encoder} */ encoder, /** @type {Set} */ obj) =>
	        {
	            obj.forEach(o =>
	            {
	                encoder.traversal(o);
	            });
	            encoder.push(0);
	        },
	        decode: (/** @type {Decoder} */decoder) =>
	        {
	            let ret = new Set();
	            decoder.referenceIndList.push(ret);
	            while (decoder.peekByte() != 0)
	                ret.add(decoder.traversal());
	            decoder.index++;
	            return ret;
	        }
	    },
	    {
	        constructor: ArrayBuffer,
	        typeId: 20,
	        encode: (/** @type {Encoder} */ encoder, /** @type {ArrayBuffer} */ obj) =>
	        {
	            encoder.pushVint(obj.byteLength);
	            encoder.pushArr(new Uint8Array(obj));
	        },
	        decode: (/** @type {Decoder} */decoder) =>
	        {
	            let length = decoder.getVInt();
	            let ret = decoder.buffer.buffer.slice(decoder.index, decoder.index + length);
	            decoder.referenceIndList.push(ret);
	            decoder.index += length;
	            return ret;
	        }
	    },
	]).forEach(o =>
	{
	    builtInClassConstructorMap.set(o.constructor, {
	        typeId: o.typeId,
	        encode: o.encode
	    });
	    builtInClassTypeIdMap.set(o.typeId, o.decode);
	});

	([
	    {
	        constructor: Int8Array,
	        typeId: 10
	    },
	    {
	        constructor: Uint8Array,
	        typeId: 11
	    },
	    {
	        constructor: Int16Array,
	        typeId: 12
	    },
	    {
	        constructor: Uint16Array,
	        typeId: 13
	    },
	    {
	        constructor: Int32Array,
	        typeId: 14
	    },
	    {
	        constructor: Uint32Array,
	        typeId: 15
	    },
	    {
	        constructor: BigInt64Array,
	        typeId: 16
	    },
	    {
	        constructor: BigUint64Array,
	        typeId: 17
	    },
	    {
	        constructor: Float32Array,
	        typeId: 18
	    },
	    {
	        constructor: Float64Array,
	        typeId: 19
	    }
	]).forEach(o =>
	{
	    builtInClassConstructorMap.set(o.constructor, {
	        typeId: o.typeId,
	        encode: (encoder, /** @type {InstanceType<typeof o.constructor>} */obj) =>
	        {
	            let buffer = obj.buffer;
	            let byteOffset = obj.byteOffset;
	            let length = obj.length;
	            encoder.pushVint(byteOffset);
	            encoder.pushVint(length);
	            encoder.traversal(buffer);
	        }
	    });
	    builtInClassTypeIdMap.set(o.typeId, decode =>
	    {
	        let refInd = decode.referenceIndList.length;
	        decode.referenceIndList.push(null);

	        let byteOffset = decode.getVInt();
	        let length = decode.getVInt();
	        let buffer = decode.traversal();

	        let ret = new o.constructor(buffer, byteOffset, length);
	        decode.referenceIndList[refInd] = ret;
	        return ret;
	    });
	});

	const textDecoder = new TextDecoder("utf-8");

	/**
	 * JSOBin解码器
	 */
	class Decoder
	{
	    /**
	     * @type {State}
	     */
	    #state = null;

	    /**
	     * 缓冲区
	     * @type {Uint8Array}
	     */
	    buffer = null;
	    /**
	     * 缓冲区对应的DataView
	     * @type {DataView}
	     */
	    dataView = null;
	    /**
	     * 当前读取到的位置
	     */
	    index = 0;

	    /**
	     * 引用列表
	     * 用于记录引用索引对应的内容
	     * @type {Array}
	     */
	    referenceIndList = [];

	    /**
	     * @param {State} state
	     * @param {Uint8Array} buffer
	     */
	    constructor(state, buffer)
	    {
	        this.#state = state;
	        this.buffer = buffer;
	        this.dataView = new DataView(buffer.buffer);
	    }

	    /**
	     * 获取当前位置的byte
	     * @returns {number}
	     */
	    peekByte()
	    {
	        return this.buffer[this.index];
	    }

	    /**
	     * 弹出当前位置的byte
	     * 将移动索引位置
	     * @returns {number}
	     */
	    popByte()
	    {
	        return this.buffer[this.index++];
	    }

	    /**
	     * 读一个vint
	     * @returns {number}
	     */
	    getVInt()
	    {
	        let ret = 0;
	        let bitPointer = 0;
	        while (!(this.peekByte() & (1 << 7)))
	        {
	            ret |= this.popByte() << bitPointer;
	            bitPointer += 7;
	            if (bitPointer > 32) // (bitPointer > 28)
	                throw "JSOBin Decode: Unexpected vint length";
	        }
	        ret |= (this.popByte() & ((1 << 7) - 1)) << bitPointer;
	        return ret;
	    }

	    /**
	    * 获取一个字符串(带有表示长度的vint)
	    * @returns {string}
	    */
	    getStr()
	    {
	        let len = this.getVInt();
	        let str = textDecoder.decode(this.buffer.subarray(this.index, this.index + len));
	        this.index += len;
	        return str;
	    }

	    /**
	     * 遍历解码
	     * @returns {any}
	     */
	    traversal()
	    {
	        if (this.index >= this.buffer.length)
	            throw "JSOBin Decode: Wrong format";
	        let typeId = this.popByte();
	        switch (typeId)
	        {
	            case 1: { // 变长型整数
	                let num = this.getVInt();
	                this.referenceIndList.push(num);
	                return num;
	            }

	            case 2: { // 浮点数
	                let num = this.dataView.getFloat64(this.index, true);
	                this.referenceIndList.push(num);
	                this.index += 8;
	                return num;
	            }

	            case 3: { // 字符串
	                let str = this.getStr();
	                this.referenceIndList.push(str);
	                return str;
	            }

	            case 4: { // 对象
	                let ret = {};
	                let childCount = this.getVInt();
	                this.referenceIndList.push(ret);
	                for (let i = 0; i < childCount; i++)
	                {
	                    let key = this.getStr();
	                    ret[key] = this.traversal();
	                }
	                return ret;
	            }

	            case 5: { // 数组
	                let ret = [];
	                this.referenceIndList.push(ret);
	                while (this.peekByte())
	                    ret.push(this.traversal());
	                this.index++;
	                return ret;
	            }

	            case 6: { // 类
	                let className = this.getStr();
	                let classConstructor = this.#state.nameToClass.get(className);
	                if (classConstructor == undefined)
	                    throw `JSOBin Decode: (class) "${className}" is unregistered class in the current context in the parsing jsobin`;
	                if (classConstructor?.[deserializationFunctionSymbol]) // 存在自定义反序列化函数
	                { // TODO 类的自定义处理需要大改版 目前无法在自定义序列化下使用循环引用
	                    let dataObj = {};
	                    let childCount = this.getVInt();
	                    let refInd = this.referenceIndList.length;
	                    this.referenceIndList.push(dataObj);
	                    for (let i = 0; i < childCount; i++)
	                    {
	                        let key = this.getStr();
	                        dataObj[key] = this.traversal();
	                    }
	                    let ret = classConstructor[deserializationFunctionSymbol](dataObj);
	                    this.referenceIndList[refInd] = ret;
	                    return ret;
	                }
	                else // 自定义类默认序列化方案
	                {
	                    let ret = Object.create(classConstructor.prototype);
	                    let childCount = this.getVInt();
	                    this.referenceIndList.push(ret);
	                    for (let i = 0; i < childCount; i++)
	                    {
	                        let key = this.getStr();
	                        ret[key] = this.traversal();
	                    }
	                    return ret;
	                }
	            }

	            case 7: { // 未定义(undefined)
	                this.referenceIndList.push(undefined);
	                return undefined;
	            }

	            case 8: { // 布尔值假
	                this.referenceIndList.push(false);
	                return false;
	            }

	            case 9: { // 布尔值真
	                this.referenceIndList.push(true);
	                return true;
	            }

	            case 10: { // symbol类型
	                let symbol = Symbol(this.getStr());
	                this.referenceIndList.push(symbol);
	                return symbol;
	            }

	            case 11: { // 无效对象(null)
	                this.referenceIndList.push(null);
	                return null;
	            }

	            case 12: { // bigint类型(正数)
	                let len = this.getVInt();
	                let num = this.readBigInt(len);
	                this.referenceIndList.push(num);
	                return num;
	            }

	            case 13: { // bigint类型(负数)
	                let len = this.getVInt();
	                let num = this.readBigInt(len);
	                this.referenceIndList.push(num);
	                return -num;
	            }

	            case 14: { // 引用
	                let referenceInd = this.getVInt();
	                let ret = this.referenceIndList[referenceInd];
	                this.referenceIndList.push(ret);
	                return ret;
	            }

	            case 15: { // js内置类
	                let builtInClassId = this.getVInt();
	                let decodeFunction = builtInClassTypeIdMap.get(builtInClassId);
	                if (decodeFunction)
	                    return decodeFunction(this);
	                else
	                    throw "JSOBin Decode: Unsupported js built-in class type.";
	            }

	            case 16: { // 函数 目前不支持
	                throw "JSOBin Decode: Function is not supported in the current version";
	            }

	            case 17: { // 安全函数
	                let func = this.#state.nameToSafetyFunction.get(this.getStr());
	                this.referenceIndList.push(func);
	                return func;
	            }

	            default:
	                throw "JSOBin Decode: Wrong format";
	        }
	    }

	    /**
	     * 解码
	     * @returns {object | number | string}
	     */
	    decode()
	    {
	        return this.traversal();
	    }

	    /**
	     * 反序列化一个Bigint
	     * @param {number} len
	     * @returns {bigint} 正数bigint 或 负数bigint的相反数
	     */
	    readBigInt(len)
	    {
	        let ret = 0n;
	        for (let ptr = this.index + len - 1; ptr >= this.index; ptr--)
	        {
	            ret <<= 8n;
	            ret += BigInt(this.buffer[ptr]);
	        }
	        this.index += len;
	        return ret;
	    }
	}

	/**
	 * JSOBin操作上下文
	 */
	class JSOBin
	{
	    /**
	     * @type {State}
	     */
	    #state = new State();

	    /**
	     * 添加类到上下文
	     * 注册标识符和类(构造器)的相互映射
	     * @param {string} identifier 类标识符
	     * @param {function} classConstructor 类的构造器
	     */
	    addClass(identifier, classConstructor)
	    {
	        this.#state.nameToClass.set(identifier, classConstructor);
	        this.#state.classToName.set(classConstructor, identifier);
	    }

	    /**
	     * 添加安全函数到上下文
	     * 允许确保安全的函数注册标识符和函数的相互映射
	     * @param {string} identifier 安全函数标识符
	     * @param {function} safetyFunction 函数
	     */
	    addSafetyFunction(identifier, safetyFunction)
	    {
	        this.#state.nameToSafetyFunction.set(identifier, safetyFunction);
	        this.#state.safetyFunctionToName.set(safetyFunction, identifier);
	    }

	    /**
	     * 编码
	     * @param {object | number | string} obj
	     * @returns {Uint8Array}
	     */
	    encode(obj)
	    {
	        return (new Encoder(this.#state)).encode(obj);
	    }

	    /**
	     * 解码
	     * @param {Uint8Array} bin
	     * @returns {object | number | string}
	     */
	    decode(bin)
	    {
	        return (new Decoder(this.#state, bin)).decode();
	    }
	}

	/**
	 * 传入上下文的函数 被目标暂时holding时 用于储存信息的类
	 * 这些对象随时准备被目标调用
	 * 
	 * 传入上下文的函数 包括 调用目标的函数时传入的函数 被目标调用函数时返回的函数
	 * 随目标对函数的释放 同时释放此对象
	 */
	class TmpFunctionInfo
	{
	    /**
	     * 单次调用
	     * 表示此函数被调用后就会释放
	     * 通常用于resolve和reject
	     */
	    once = false;

	    /**
	     * 调用后释放目标对象
	     * 通常用于一对resolve与reject相互释放
	     * 调用本函数后释放此id的函数 但本函数释放时不会自动释放此函数
	     */
	    releaseTarget = "";

	    /**
	     * 转入的函数本身
	     * @type {function}
	     */
	    func = null;

	    /**
	     * @param {Function} func
	     * @param {boolean} once
	     * @param {string} releaseTarget
	     */
	    constructor(func, once, releaseTarget)
	    {
	        this.func = func;
	        this.once = once;
	        this.releaseTarget = releaseTarget;
	    }
	}

	/**
	 * base64字符串转Uint8Array
	 * @param {string} base64String
	 * @returns {Uint8Array}
	 */
	function base64ToUint8Array(base64String)
	{
	    let binStr = atob(base64String);
	    let length = binStr.length;
	    let ret = new Uint8Array(length);
	    for (let i = 0; i < length; i++)
	        ret[i] = binStr.charCodeAt(i);
	    return ret;
	}

	/**
	 * Uint8Array转base64字符串
	 * @param {Uint8Array} uint8Array
	 * @returns {string}
	 */
	function uint8ArrayToBase64(uint8Array)
	{
	    let length = uint8Array.length;
	    let binStr = "";
	    for (let i = 0; i < length; i++)
	        binStr = binStr + String.fromCharCode(uint8Array[i]);
	    let ret = btoa(binStr);
	    return ret;
	}

	/**
	 * 生成唯一字符串
	 * 基于毫秒级时间和随机数
	 * 不保证安全性
	 * @param {number} [randomSection] 随机节数量
	 * @returns {string}
	 */
	function uniqueIdentifierString$1(randomSection = 2)
	{
	    var ret = Math.floor(Date.now()).toString(36);
	    for (let i = 0; i < randomSection; i++)
	        ret += "-" + Math.floor(Math.random() * 1e12).toString(36);
	    return ret;
	}

	let jsobContext = new JSOBin();

	/**
	 * rco操作上下文
	 */
	class RcoCcontext
	{
	    /**
	     * 全局命名函数
	     * @type {Map<string, function>}
	     */
	    #globalNamedFunctionMap = new Map();

	    /**
	     * 运行中传递的函数
	     * (对方持有的本地的函数)
	     * @type {Map<string, TmpFunctionInfo>}
	     */
	    #idFunctionMap = new Map();

	    /**
	     * 持有的对方的函数
	     * @type {Map<string, WeakRef<function>>}
	     */
	    #holdingFunctionMap = new Map();

	    /**
	     * 输出流
	     * @param {string | Uint8Array | object} data
	     * @returns {void}
	     */
	    #outStream = (data) => { throw "RcoCcontext: not bound to an output stream"; };

	    /**
	     * 输出流类型
	     * 0 raw Object
	     * 1 jsobin Uint8array
	     * 2 base64(jsobin) string
	     * @type {0 | 1 | 2}
	     */
	    #outStreamType = 1;

	    /**
	     * 回收持有的目标的函数
	     * 当不再持有时通知目标进行释放
	     * @type {FinalizationRegistry<string>}
	     */
	    #holdingFunctionRegistry = null;

	    constructor()
	    {
	        this.#holdingFunctionRegistry = new FinalizationRegistry((id) =>
	        {
	            this.#holdingFunctionMap.delete(id);
	            this.#outputPacket([ // 通知目标释放函数
	                2,
	                id
	            ]);
	        });
	    }

	    /**
	     * 输出数据包
	     * @param {Object} data
	     */
	    #outputPacket(data)
	    {
	        switch (this.#outStreamType)
	        {
	            case 0:
	                this.#outStream(data);
	                break;
	            case 1:
	                this.#outStream(jsobContext.encode(data));
	                break;
	            case 2:
	                this.#outStream(uint8ArrayToBase64(jsobContext.encode(data)));
	                break;
	        }
	    }

	    /**
	     * 绑定输出流
	     * 会覆盖之前绑定的输出流
	     * @param {(data: string | Uint8Array | object) => void} onDataCallback 
	     * @param { "jsob" | "jsobin" | "base64" | "raw" } [type]
	     */
	    bindOutStream(onDataCallback, type = "jsob")
	    {
	        this.#outStream = onDataCallback;

	        if (type == "raw")
	            this.#outStreamType = 0;
	        else if (type == "jsob" || type == "jsobin")
	            this.#outStreamType = 1;
	        else if (type == "base64")
	            this.#outStreamType = 2;
	        else
	            throw "RcoCcontext(bindOutStream): Unsupported output stream types";
	    }

	    /**
	     * 添加全局命名函数
	     * @param {Object<string, function>} functionMapObj 
	     */
	    addGlobalNamedFunctions(functionMapObj)
	    {
	        Object.keys(functionMapObj).forEach(functionName =>
	        {
	            this.#globalNamedFunctionMap.set(functionName, functionMapObj[functionName]);
	        });
	    }

	    /**
	     * 收到数据包
	     * @param {object} data
	     */
	    async #onPacket(data)
	    {
	        if (Array.isArray(data))
	        {
	            let type = data[0];
	            switch (type)
	            {
	                case 0: { // 调用命名函数
	                    let func = this.#globalNamedFunctionMap.get(data[1]); // arr[1] 函数名
	                    if (func)
	                    {
	                        let param = (
	                            data[3] ? // arr[3] 函数参数中包含的函数对应的id表
	                                this.#injectFunction(data[2], data[3]).result :
	                                data[2] // arr[2] 函数的参数
	                        );

	                        try
	                        {
	                            let retValue = await func(...param);
	                            if (data[4]) // arr[4] 返回时调用的函数 
	                            {
	                                let result = this.#extractFunction(retValue);
	                                this.#outputPacket([
	                                    1, // 执行id函数 (resolve函数)
	                                    data[4],
	                                    [result.result],
	                                    (result.fnMap.size > 0 ? result.fnMap : undefined)
	                                ]);
	                            }
	                        }
	                        catch (err)
	                        {
	                            if (data[5]) // arr[5] 出错时调用的函数
	                                this.#outputPacket([
	                                    1, // 执行id函数 (reject函数)
	                                    data[5],
	                                    [err]
	                                ]);
	                        }
	                    }
	                    else
	                    {
	                        if (data[5]) // arr[5] 出错时调用的函数
	                            this.#outputPacket([
	                                1,
	                                data[5],
	                                ["function does not exist"]
	                            ]);
	                    }
	                    break;
	                }
	                case 1: { // 调用id函数
	                    let id = data[1];
	                    let funcInfo = this.#idFunctionMap.get(id); // arr[1] 函数id
	                    if (funcInfo)
	                    {
	                        let param = (
	                            data[3] ? // arr[3] 函数参数中包含的函数对应的id表
	                                this.#injectFunction(data[2], data[3]).result :
	                                data[2] // arr[2] 函数的参数
	                        );

	                        let func = funcInfo.func;
	                        if (funcInfo.once)
	                            this.#idFunctionMap.delete(id);
	                        if (funcInfo.releaseTarget)
	                            this.#idFunctionMap.delete(funcInfo.releaseTarget);

	                        try
	                        {
	                            let retValue = await func(...param);
	                            if (data[4]) // arr[4] 返回时调用的函数 
	                            {
	                                let result = this.#extractFunction(retValue);
	                                this.#outputPacket([
	                                    1,
	                                    data[4],
	                                    [result.result],
	                                    (result.fnMap.size > 0 ? result.fnMap : undefined)
	                                ]);
	                            }
	                        }
	                        catch (err)
	                        {
	                            if (data[5]) // arr[5] 出错时调用的函数
	                                this.#outputPacket([
	                                    1,
	                                    data[5],
	                                    [err]
	                                ]);
	                        }
	                    }
	                    else
	                    {
	                        if (data[5]) // arr[5] 出错时调用的函数
	                            this.#outputPacket([
	                                1,
	                                data[5],
	                                ["function does not exist"]
	                            ]);
	                    }
	                    break;
	                }
	                case 2: { // 释放id函数
	                    data.slice(1).forEach(id =>
	                    {
	                        this.#idFunctionMap.delete(id);
	                    });
	                    break;
	                }
	            }
	        }
	    }

	    /**
	     * 输入流收到数据应调用
	     * @param {string | Uint8Array | object} data 
	     */
	    onData(data)
	    {
	        if (typeof (data) == "string")
	            this.#onPacket(jsobContext.decode(base64ToUint8Array(data)));
	        else if (data instanceof Uint8Array)
	            this.#onPacket(jsobContext.decode(data));
	        else if (typeof (data) == "object")
	            this.#onPacket(data);
	        else
	            throw "RcoCcontext(onData): Unable to process this data type";
	    }

	    /**
	     * 调用命名函数
	     * 
	     * @async
	     * 
	     * @param {string} name
	     * @param {Array<any>} param
	     */
	    callNamedFunction(name, ...param)
	    {
	        return new Promise((resolve, reject) =>
	        {
	            let result = this.#extractFunction(param);
	            let resolveId = uniqueIdentifierString$1();
	            let rejectId = uniqueIdentifierString$1();
	            this.#idFunctionMap.set(resolveId, new TmpFunctionInfo(resolve, true, rejectId));
	            this.#idFunctionMap.set(rejectId, new TmpFunctionInfo(reject, true, resolveId));
	            this.#outputPacket([
	                0, // 执行命名函数
	                name,
	                result.result,
	                (result.fnMap.size > 0 ? result.fnMap : undefined),
	                resolveId,
	                rejectId
	            ]);
	        });
	    }

	    /**
	     * 获取一个代理对象
	     * 以函数名为key 返回的函数用于调用命名函数
	     * @returns {Object<string, function>}
	     */
	    getGlobalNamedFunctionProxy()
	    {
	        return new Proxy({}, {
	            set: () => false,
	            get: (_target, /** @type {string} */ key) =>
	            {
	                return (/** @type {Array<any>} */ ...param) =>
	                {
	                    return this.callNamedFunction(key, ...param);
	                };
	            }
	        });
	    }

	    /**
	     * 将函数注入回对象
	     * @param {Object} obj 
	     * @param {Map<Object, string>} fnMap 
	     */
	    #injectFunction(obj, fnMap)
	    {
	        /**
	         * 函数id 到 生成出的函数 映射
	         * @type {Map<string, Function>}
	         */
	        let generatedFunctionMap = new Map();
	        fnMap.forEach((id, _functionObj) =>
	        {
	            if (!generatedFunctionMap.has(id))
	            {
	                let generatedFunction = (/** @type {Array<any>} */ ...param) =>
	                {
	                    return new Promise((resolve, reject) =>
	                    {
	                        let result = this.#extractFunction(param);
	                        let resolveId = uniqueIdentifierString$1();
	                        let rejectId = uniqueIdentifierString$1();
	                        this.#idFunctionMap.set(resolveId, new TmpFunctionInfo(resolve, true, rejectId));
	                        this.#idFunctionMap.set(rejectId, new TmpFunctionInfo(reject, true, resolveId));
	                        this.#outputPacket([
	                            1, // 执行id函数
	                            id,
	                            result.result,
	                            (result.fnMap.size > 0 ? result.fnMap : undefined),
	                            resolveId,
	                            rejectId
	                        ]);
	                    });
	                };
	                generatedFunctionMap.set(id, generatedFunction);

	                this.#holdingFunctionMap.set(id, new WeakRef(generatedFunction));
	                this.#holdingFunctionRegistry.register(generatedFunction, id);
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
	     * 提取对象中的函数
	     * (并生成函数对应表)
	     * @param {Object} obj
	     */
	    #extractFunction(obj)
	    {
	        let functionMap = new Map();

	        /**
	         * 遍历对象过滤函数
	         * @param {any} now 
	         * @returns {any}
	         */
	        const traversal = (now) =>
	        {
	            if (typeof (now) == "function")
	            {
	                let ret = {};
	                let functionId = uniqueIdentifierString$1();
	                this.#idFunctionMap.set(functionId, new TmpFunctionInfo(now, false, ""));
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
	        };
	        let result = traversal(obj);

	        return ({
	            result: result,
	            fnMap: functionMap
	        });
	    }
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

	let waitForId$2 = "";

	async function showMultiAccountMenu()
	{
	    /**
	     * @param {string} uid
	     */
	    function showAccountMenu(uid)
	    {
	        showMenu([
	            NList.getElement([
	                "拉取此账号的配置",
	                new NEvent("click", () =>
	                {
	                    showNotice("多账户", "正在尝试获取配置");
	                    let requestId = uniqueIdentifierString$2();
	                    forgeApi.operation.sendPrivateForgePacket(uid, {
	                        plug: "forge",
	                        type: "multiAccount",
	                        option: "syncConfigRQ",
	                        id: requestId
	                    });
	                    waitForId$2 = requestId;
	                })
	            ]),
	            NList.getElement([
	                "前往我所在的房间",
	                new NEvent("click", () =>
	                {
	                    showNotice("多账户", "正在发送命令");
	                    forgeApi.operation.sendPrivateForgePacket(uid, {
	                        plug: "forge",
	                        type: "multiAccount",
	                        option: "switchRoom",
	                        roomId: forgeApi.operation.getUserRoomId()
	                    });
	                })
	            ]),
	            NList.getElement([
	                "下线",
	                new NEvent("click", () =>
	                {
	                    showNotice("多账户", "正在发送命令");
	                    forgeApi.operation.sendPrivateForgePacket(uid, {
	                        plug: "forge",
	                        type: "multiAccount",
	                        option: "quit"
	                    });
	                })
	            ]),
	            NList.getElement([
	                "移除账号",
	                new NEvent("click", () =>
	                {
	                    storageContext.roaming.myAccountList = storageContext.roaming.myAccountList.filter(o => o != uid);
	                    storageRoamingSave();
	                    showNotice("绑定账号", `目标账号(${uid})与当前账号(${forgeApi.operation.getUserUid()})的单向绑定已解除`);
	                })
	            ])
	        ]);
	    }

	    showMenu([
	        NList.getElement([
	            "[ 添加账号 ]",
	            new NEvent("click", async () =>
	            {
	                let uid = await showInputBox("添加账号", "请输入您其他账号的唯一标识\n必须双向绑定才能进行管理", true);
	                if (uid != undefined)
	                {
	                    let myUid = forgeApi.operation.getUserUid();
	                    if (uid != myUid)
	                    {
	                        storageContext.roaming.myAccountList.push(uid);
	                        storageRoamingSave();
	                        showNotice("绑定账号", `你需要同时在目标账号(${uid})上绑定当前账号(${myUid})来完成反向绑定`);
	                    }
	                    else
	                        showNotice("无法绑定", `不能绑定此账号本身`);
	                }
	            }),
	        ]),
	        ...(Array.from(storageContext.roaming.myAccountList).map(uid =>
	        {
	            let userInfo = forgeApi.operation.getOnlineUserInfoById(uid);
	            return NList.getElement([
	                `${uid}${userInfo ? ` (${userInfo.name})` : ""}`,
	                new NEvent("click", async () =>
	                {
	                    showAccountMenu(uid);
	                }),
	            ]);
	        }))
	    ]);
	}

	let registedEvent = false;
	/**
	 * 启用多账号
	 */
	function enableMultiAccount()
	{
	    if (registedEvent)
	        return;
	    registedEvent = true;

	    protocolEvent.forge.privateForgePacket.add(e =>
	    {
	        if (e.content.type == "multiAccount")
	        {
	            if (storageContext.roaming.myAccountList.indexOf(e.senderId) == -1)
	                return;

	            let userInfo = forgeApi.operation.getOnlineUserInfoById(e.senderId);
	            let isCallback = false;

	            try
	            {
	                switch (e.content.option)
	                {
	                    case "switchRoom": {
	                        forgeApi.operation.changeRoom(e.content.roomId);
	                        break;
	                    }
	                    case "quit": {
	                        setTimeout(() =>
	                        {
	                            location.replace("about:blank");
	                            window.close();
	                        }, 1000);
	                        break;
	                    }
	                    case "syncConfigRQ": {
	                        let requestId = e.content.id;
	                        forgeApi.operation.sendPrivateForgePacket(e.senderId, {
	                            plug: "forge",
	                            type: "multiAccount",
	                            option: "syncConfigCB",
	                            id: requestId,
	                            storageObject: storageContext.roaming
	                        });
	                        break;
	                    }
	                    case "syncConfigCB": {
	                        if (waitForId$2 && e.content.id == waitForId$2)
	                        {
	                            waitForId$2 = "";
	                            /**
	                             * @type {typeof storageContext.roaming}
	                             */
	                            let storageObj = e.content.storageObject;
	                            if (storageObj)
	                            {
	                                if (storageObj?.userRemark)
	                                { // 覆盖备注配置
	                                    Object.keys(storageContext.roaming.userRemark).forEach(userId =>
	                                    {
	                                        if (!storageObj.userRemark[userId])
	                                            storageObj.userRemark[userId] = storageContext.roaming.userRemark[userId];
	                                    });
	                                }
	                                delete storageObj.myAccountList;
	                                storageRoamingSet(storageObj);
	                                storageRoamingSave();
	                                showNotice("多账号", "拉取其他账号的配置成功");
	                            }
	                        }
	                        isCallback = true;
	                        break;
	                    }
	                }
	            }
	            catch (err)
	            {
	                console.error(err);
	            }

	            if (!isCallback)
	                showNotice("多账号", `您的账号(${e.senderId}${userInfo ? ` - ${userInfo.name}` : ""})\n正在操作`);
	        }
	    });
	}

	let waitForId$1 = "";

	/**
	 * 尝试同步配置
	 */
	function trySyncConfig()
	{
	    showNotice("配置同步", "正在尝试获取配置");
	    let requestId = uniqueIdentifierString$2();
	    forgeApi.operation.sendSelfPrivateForgePacket({
	        plug: "forge",
	        type: "syncConfigRQ",
	        id: requestId
	    });
	    waitForId$1 = requestId;
	}

	let registedReturnConfig = false;
	/**
	 * 启用配置同步
	 */
	function enableSyncConfig()
	{
	    if (registedReturnConfig)
	        return;
	    registedReturnConfig = true;
	    protocolEvent.forge.selfPrivateForgePacket.add(e =>
	    {
	        if (waitForId$1)
	        {
	            if (e.content.type == "syncConfigCB" && e.content.id == waitForId$1)
	            {
	                waitForId$1 = "";
	                /**
	                 * @type {typeof storageContext.roaming}
	                 */
	                let storageObj = e.content.storageObject;
	                if (storageObj)
	                {
	                    if (storageObj?.userRemark)
	                    { // 覆盖备注配置
	                        Object.keys(storageContext.roaming.userRemark).forEach(userId =>
	                        {
	                            if (!storageObj.userRemark[userId])
	                                storageObj.userRemark[userId] = storageContext.roaming.userRemark[userId];
	                        });
	                    }
	                    storageRoamingSet(storageObj);
	                    storageRoamingSave();
	                    showNotice("配置同步", "拉取配置成功");
	                }
	            }
	        }

	        if (e.content.type == "syncConfigRQ")
	        {
	            let requestId = e.content.id;
	            forgeApi.operation.sendSelfPrivateForgePacket({
	                plug: "forge",
	                type: "syncConfigCB",
	                id: requestId,
	                storageObject: storageContext.roaming
	            });
	            showNotice("配置同步", "其他设备正在拉取本机配置");
	        }
	    });
	}

	const versionInfo = {
	    version: "alpha v1.9.0"
	};

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
	 * 创建悬浮窗
	 */
	function createPlugWindow(noSandbox = false)
	{
	    let x = 0, y = 0;
	    let width = 280, height = 190;
	    let resizeSliderShowUpTimeout = null;
	    let resizeSlider = null;
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
	            }),

	            new NEvent("touchend", () =>
	            {
	                if (resizeSliderShowUpTimeout != null)
	                {
	                    clearTimeout(resizeSliderShowUpTimeout);
	                    resizeSliderShowUpTimeout = null;
	                }
	                else
	                {
	                    resizeSlider.setDisplay("block");
	                }
	                resizeSliderShowUpTimeout = setTimeout(() =>
	                {
	                    resizeSliderShowUpTimeout = null;
	                    resizeSlider.setDisplay("none");
	                }, 2500);
	            }),
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
	            new NAsse(e => { iframeHolder = e; })
	        ],

	        [ // 右下角设置大小拖拽块
	            createNStyleList({
	                position: "absolute",
	                right: "0.5px",
	                bottom: "0.5px",
	                height: "1.5em",
	                aspectRatio: "1",
	                cursor: "nwse-resize",
	                display: "none",
	                boxSizing: "border-box",
	                borderRight: "0.75em blue solid",
	                borderBottom: "0.75em blue solid",
	                borderTop: "0.75em transparent solid",
	                borderLeft: "0.75em transparent solid",
	            }),
	            new NEvent("click", () =>
	            {
	                windowElement.setDisplay("none");
	            }),
	            new NAsse(e => { resizeSlider = e; }),
	            new NAsse(e =>
	            {
	                var ow = 0, oh = 0;
	                var proc = (/** @type {{ sx: number, sy: number, x: number, y: number, pressing: boolean,hold: boolean }} */ o) =>
	                {
	                    if (o.hold)
	                    {
	                        if (o.pressing)
	                        {
	                            ow = width;
	                            oh = height;
	                            // pageManager.moveToTop(this);
	                        }
	                        width = ow + o.x - o.sx;
	                        height = oh + o.y - o.sy;
	                        windowElement.setStyle("width", `${width}px`);
	                        windowElement.setStyle("height", `${height}px`);
	                        iframe.setStyle("pointerEvents", "none");
	                    }
	                    else
	                        iframe.setStyle("pointerEvents", "auto");
	                };
	                mouseBind(e, proc);
	                touchBind(e, proc);
	            })
	        ],
	    ]);
	    body.addChild(windowElement);
	    new ResizeObserver(() =>
	    {
	        width = windowElement.element.offsetWidth;
	        height = windowElement.element.offsetHeight;
	        if (x > body.element.clientWidth - width)
	            windowElement.setStyle("width", `${width = (body.element.clientWidth - x)}px`);
	        if (y > body.element.clientHeight - height)
	            windowElement.setStyle("height", `${height = (body.element.clientHeight - y)}px`);
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

	    /**
	     * @type {SandboxContext}
	     */
	    let sandbox = null;
	    if (!noSandbox)
	    {
	        sandbox = new SandboxContext(iframeHolder.element);
	        iframe = getNElement(sandbox.iframe);
	    }
	    else
	    {
	        iframe = getNElement(document.createElement("iframe"));
	        iframeHolder.addChild(iframe);
	    }
	    iframe.setStyles({
	        display: "block",
	        border: "none",
	        height: "100%",
	        width: "100%"
	    });
	    return ({
	        windowElement: windowElement,
	        sandbox: sandbox,
	        iframe: iframe
	    });
	}
	/**
	 * 在悬浮窗中创建插件沙箱
	 * 以便插件显示ui
	 */
	function createPlugSandboxWithWindow()
	{
	    let plugWindow = createPlugWindow(false);
	    return ({
	        windowElement: plugWindow.windowElement,
	        sandbox: plugWindow.sandbox
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
	    let scriptCode = `document.body.innerHTML='<div style="color:white">network_error</div>';`;
	    try
	    {
	        scriptCode = await (await fetch(scriptUrl)).text();
	    }
	    catch (err)
	    {
	    }
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
	            windowElement.setStyle("pointerEvents", "auto");
	        }
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
	        storageContext.roaming.plugInfo = plugInfo;
	        storageRoamingSave();
	    }

	    /**
	     * 读取插件列表
	     */
	    readPlugList()
	    {
	        try
	        {
	            let plugInfo = storageContext.roaming.plugInfo;
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

	/**
	 * @type {ReturnType<createPlugWindow>}
	 */
	let plugStone = null;

	/**
	 * 获取forge菜单
	 * @returns {NElement}
	 */
	function getForgeMenu()
	{
	    let menu = NList.getElement([ // 整个菜单
	        createNStyle("position", "fixed"),
	        createNStyle("top", "0"),
	        createNStyle("left", "0"),
	        createNStyle("zIndex", "91000"),
	        createNStyle("height", "100%"),
	        createNStyle("width", "100%"),
	        createNStyle("backgroundColor", "rgba(255, 255, 255, 0.75)"),
	        createNStyle("backdropFilter", "blur(3px)"),

	        [ // 标题栏
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

	        [ // 菜单主体
	            createNStyle("position", "absolute"),
	            createNStyle("width", "100%"),
	            createNStyle("top", "40px"),
	            createNStyle("bottom", "40px"),
	            createNStyle("overflow", "auto"),

	            [
	                createNStyleList({
	                    display: "grid",
	                    gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))"
	                }),
	                ...([ // 菜单列表项
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
	                        title: "侧载脚本",
	                        text: "管理侧载js",
	                        icon: "script",
	                        onClick: async () =>
	                        {
	                            await showInfoBox("警告", [
	                                "! 侧载外部脚本是高危操作 !",
	                                "侧载的脚本不接受forge权限管理",
	                                "外部脚本能获取您在此网站的所有信息",
	                                "恶意外部脚本可能盗取您的账号",
	                                "请勿加载他人提供的闭源脚本",
	                                "继续操作前 您应该了解自己正在做什么"
	                            ].join("\n"));
	                            showMenu([
	                                NList.getElement([
	                                    "[ 添加iframe外侧侧载脚本 ]",
	                                    new NEvent("click", async () =>
	                                    {
	                                        let scriptUrl = await showInputBox("添加侧载脚本", "请输入脚本地址\n每次载入会重新获取脚本\n脚本将随forge启动运行", true);
	                                        if (scriptUrl != undefined)
	                                        {
	                                            storageContext.roaming.sideLoadedScript.push([scriptUrl, scriptUrl, false]);
	                                            storageRoamingSave();
	                                            showNotice("添加侧载脚本", "已将脚本添加到侧载列表\n将在下次重启时生效");
	                                        }
	                                    }),
	                                ]),
	                                NList.getElement([
	                                    "[ 添加iframe内侧侧载脚本 ]",
	                                    new NEvent("click", async () =>
	                                    {
	                                        let scriptUrl = await showInputBox("添加侧载脚本", "请输入脚本地址\n每次载入会重新获取脚本\n脚本将随iframe重载运行", true);
	                                        if (scriptUrl != undefined)
	                                        {
	                                            storageContext.roaming.sideLoadedScript.push([scriptUrl, scriptUrl, true]);
	                                            storageRoamingSave();
	                                            showNotice("添加侧载脚本", "已将脚本添加到侧载列表\n将在下次重启或iframe重载时生效");
	                                        }
	                                    }),
	                                ]),
	                                ...(storageContext.roaming.sideLoadedScript.map(([name, url, insideIframe], ind) => NList.getElement([
	                                    `${insideIframe ? "内" : "外"} | ${name}`,
	                                    new NEvent("click", async () =>
	                                    {
	                                        showMenu([
	                                            NList.getElement([
	                                                "移除插件",
	                                                new NEvent("click", () =>
	                                                {
	                                                    storageContext.roaming.sideLoadedScript.splice(ind, 1);
	                                                    storageRoamingSave();
	                                                    showNotice("删除侧载脚本", "已将脚本从侧载列表移除\n将在下次重启时生效");
	                                                })
	                                            ])
	                                        ]);
	                                    }),
	                                ])))
	                            ]);

	                        }
	                    },
	                    {
	                        title: "插件商店",
	                        text: "打开插件商店",
	                        icon: "shopping",
	                        onClick: async () =>
	                        {
	                            if (plugStone)
	                            {
	                                plugStone.windowElement.setDisplay("block");
	                                plugStone.windowElement.setStyle("pointerEvents", "auto");
	                                return;
	                            }

	                            plugStone = createPlugWindow(true);
	                            plugStone.iframe.element.src = "https://iplugin.reifuu.icu";

	                            let channel = new MessageChannel();
	                            let port = channel.port1;

	                            let rcoContext = new RcoCcontext();
	                            rcoContext.addGlobalNamedFunctions(/** @satisfies {import("../../doc/plugStoreApi").iiroseForgePlugStoreApi} */({
	                                getForgeVersion: async () => versionInfo.version,
	                                getPlugList: async () => Array.from(plugList.map.entries()).map(o => ({
	                                    name: o[0],
	                                    url: o[1].url
	                                })),
	                                installPlug: async (name, url) =>
	                                {
	                                    return 3;
	                                },
	                                uninstallPlug: async (name) =>
	                                {
	                                    return 3;
	                                },
	                            }));
	                            port.addEventListener("message", data => { rcoContext.onData(data); });
	                            rcoContext.bindOutStream(data => { port.postMessage(data); }, "raw");

	                            plugStone.iframe.addEventListener("load", () =>
	                            {
	                                {
	                                    port.start();
	                                    plugStone.iframe.element.contentWindow.postMessage({
	                                        type: "setMessagePort",
	                                        port: channel.port2
	                                    }, "*", [channel.port2]); // 初始化通信管道
	                                }
	                            });

	                            plugStone.windowElement.setDisplay("block");
	                            plugStone.windowElement.setStyle("pointerEvents", "auto");
	                        }
	                    },
	                    {
	                        title: "拉取配置",
	                        text: "获取您其他在线设备的配置",
	                        icon: "sync",
	                        onClick: async () =>
	                        {
	                            trySyncConfig();
	                        }
	                    },
	                    {
	                        title: "附加功能",
	                        text: "设置本机的附加功能",
	                        icon: "cog",
	                        onClick: async () =>
	                        {
	                            showMenu([
	                                ...([
	                                    {
	                                        name: "用户备注",
	                                        storageKey: "enableUserRemark"
	                                    },
	                                    {
	                                        name: "聊天记录同步(测试)",
	                                        storageKey: "enableSyncChatRecord"
	                                    },
	                                    {
	                                        name: "超级菜单",
	                                        storageKey: "enableSuperMenu"
	                                    },
	                                    ...(
	                                        storageContext.local.enableExperimental ?
	                                            [
	                                                {
	                                                    name: "实验性功能",
	                                                    storageKey: "enableExperimental"
	                                                },
	                                                {
	                                                    name: "实验性功能设置",
	                                                    func: async () =>
	                                                    {
	                                                        let optionJson = JSON.stringify(storageContext.local.experimentalOption, undefined, 4);
	                                                        let newValue = await showTextareaBox("实验性功能设置", "设置实验性功能的json", true, optionJson);
	                                                        if (newValue != undefined && newValue != optionJson)
	                                                        {
	                                                            try
	                                                            {
	                                                                storageContext.local.experimentalOption = JSON.parse(newValue);
	                                                                storageLocalSave();
	                                                                showNotice("实验性功能", "已更新实验性功能设置");
	                                                            }
	                                                            catch (err)
	                                                            {
	                                                                showNotice("实验性功能", `实验性功能设置更新失败\n${err instanceof Error ? err.message : ""}`);
	                                                            }
	                                                        }
	                                                    }
	                                                },
	                                            ] :
	                                            []
	                                    )
	                                ]).map(o => NList.getElement([
	                                    `${o.storageKey ? (storageContext.local[o.storageKey] ? "(已启用)" : "(已禁用)") : ""}${o.name}`,
	                                    new NEvent("click", async () =>
	                                    {
	                                        if (o.storageKey)
	                                        {
	                                            let targetState = !storageContext.local[o.storageKey];
	                                            let confirm = await showInfoBox("设置功能", `切换 ${o.name} 功能到 ${targetState ? "启用" : "禁用"} 状态\n可能需要重载以生效`, true);
	                                            if (confirm)
	                                            {
	                                                storageContext.local[o.storageKey] = targetState;
	                                                storageLocalSave();
	                                            }
	                                        }
	                                        else if (o.func)
	                                        {
	                                            o.func();
	                                        }
	                                    }),
	                                ]))
	                            ]);
	                        }
	                    }, {
	                        title: "账号管理",
	                        text: "管理你的其他账号",
	                        icon: "account-cog",
	                        onClick: async () =>
	                        {
	                            await showMultiAccountMenu();
	                        }
	                    },
	                    {
	                        title: "安装iiroseForge",
	                        text: "下次使用无需注入",
	                        icon: "puzzle",
	                        onClick: async () =>
	                        {
	                            localStorage.setItem("installForge", "true");
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
	                            localStorage.removeItem("installForge");
	                            removeForgeFromCache();
	                            showInfoBox("卸载iiroseForge", "已完成");
	                        }
	                    }
	                ]).map(o => [ // 菜单列表项元素
	                    className("commonBox"),
	                    createNStyle("maxWidth", "calc(100% - 24px)"),
	                    createNStyle("minWidth", "355.2px"),
	                    createNStyle("minHeight", "200px"),
	                    createNStyle("float", "none"),
	                    createNStyle("boxShadow", "0 0 1px rgb(0,0,0,0.12),0 1px 1px rgb(0,0,0,0.24)"),
	                    createNStyle("margin", "24px 12px 0px 12px"),
	                    createNStyle("position", "relative"),
	                    [ // 元素标题行
	                        className("commonBoxHead"),
	                        createNStyle("backgroundColor", "rgba(255,255,255,0.2)"),
	                        createNStyle("color", "rgba(0,0,0,0.4)"),
	                        createNStyle("height", "100px"),
	                        createNStyle("width", "100%"),
	                        createNStyle("display", "flex"),
	                        createNStyle("justifyContent", "center"),
	                        createNStyle("padding", "0 24px"),
	                        createNStyle("boxSizing", "border-box"),
	                        [ // 图标
	                            className("mdi-" + o.icon),
	                            createNStyle("lineHeight", "100px"),
	                            createNStyle("fontSize", "30px"),
	                            createNStyle("fontFamily", "md"),
	                            createNStyle("display", "inline-block"),
	                            createNStyle("verticalAlign", "top"),
	                            createNStyle("height", "100%"),
	                            createNStyle("opacity", "0.7"),
	                        ],
	                        [ // 标题文本
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
	                    [ // 元素正文
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
	                ]),

	            ],
	            [ // 菜单主体下方的填充
	                createNStyleList({
	                    height: "25px"
	                })
	            ]
	        ],

	        [ // 底栏
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
	        ],

	        ele => // 实验性功能手势
	        {
	            const gestureTable = [
	                "left",
	                "leftDown",
	                "down",
	                "rightUp",
	                "right",
	                "rightDown",
	                "up",
	                "leftUp",
	                "none"
	            ];
	            /**
	             * @type {Array<typeof gestureTable[number]>}
	             */
	            let gestureList = [];
	            // 跟踪点的累计值
	            let trackPointX = 0;
	            let trackPointY = 0;
	            /**
	             * @type {null | number | NodeJS.Timeout}
	             */
	            let intervalId = null;
	            /**
	             * @type {typeof gestureTable[number]}
	             */
	            let nowDirection = "none";

	            /**
	             * @param {import("../../lib/qwqframe").PointerData} e
	             */
	            function pointerMove(e)
	            {
	                if (e.pressing)
	                {
	                    trackPointX = 0;
	                    trackPointY = 0;
	                    nowDirection = "none";
	                    if (intervalId == null)
	                        intervalId = setInterval(checkPath, 85);
	                }
	                else
	                {
	                    trackPointX += e.vx;
	                    trackPointY += e.vy;
	                }

	                if (!e.hold)
	                {
	                    if (intervalId != null)
	                    {
	                        clearInterval(intervalId);
	                        intervalId = null;
	                    }
	                }
	            }

	            function checkPath()
	            {
	                let nowTickDirection = "none";
	                if (Math.abs(trackPointX) >= 10 || Math.abs(trackPointY) >= 10)
	                {
	                    nowTickDirection = gestureTable[
	                        Math.floor(((Math.floor(
	                            ((Math.atan2(-trackPointY, trackPointX)) / (2 * Math.PI) + 0.5) * 16
	                        ) + 1) % 16) / 2)
	                    ];
	                }
	                trackPointX = 0;
	                trackPointY = 0;

	                if (nowTickDirection != nowDirection)
	                {
	                    nowDirection = nowTickDirection;
	                    if (nowDirection != "none")
	                        gestureList.push(nowDirection);
	                }

	                while (gestureList.length > 200)
	                    gestureList.shift();

	                /**
	                 * @type {Array<typeof gestureTable[number]>}
	                 */
	                const targetGesture = [
	                    "down",

	                    "down",

	                    "leftDown",
	                    "right",
	                    "down"
	                ];

	                if (targetGesture.every((o, index) => o == gestureList.at(index - targetGesture.length)))
	                {
	                    gestureList = [];

	                    storageContext.local.enableExperimental = true;
	                    storageLocalSave();
	                    showNotice("实验性功能", "已激活实验性功能\n部分功能需要重载以启用");
	                }
	            }

	            mouseBind(ele, pointerMove, 0, iframeContext.iframeWindow);
	            touchBind(ele, pointerMove, false);
	            ele.addEventListener("mousedown", e => { e.stopPropagation(); });
	            ele.addEventListener("mouseup", e => { e.stopPropagation(); });
	            ele.addEventListener("touchstart", e => { e.stopPropagation(); });
	            ele.addEventListener("touchend", e => { e.stopPropagation(); });
	            ele.addEventListener("touchmove", e => { e.stopPropagation(); });
	            ele.addEventListener("touchcancel", e => { e.stopPropagation(); });
	        }
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
	    let referElement = iframeContext.iframeDocument?.querySelector("div#functionHolder div.functionButton.functionButtonGroup");

	    let buttonBackgroundColor = (referElement ? getComputedStyle(referElement).backgroundColor : "rgb(255, 255, 255)");
	    let buttonTextColor = (referElement ? getComputedStyle(referElement).color : "rgb(33, 33, 33)");

	    let button = NList.getElement([
	        createNStyle("backgroundColor", buttonBackgroundColor),
	        createNStyle("boxShadow", "0 0 1px rgb(0,0,0,0.12),0 1px 1px rgb(0,0,0,0.24)"),
	        createNStyle("position", "relative"),
	        createNStyle("zIndex", "1"),

	        createNStyle("color", buttonTextColor),
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

	        new NEvent("mouseenter", (_e, ele) =>
	        {
	            ele.setStyle("backgroundColor", (
	                (
	                    buttonBackgroundColor == "#202020" ||
	                    buttonBackgroundColor == "rgb(32, 32, 32)"
	                ) ?
	                    "rgb(42, 42, 42)" :
	                    "rgb(245, 245, 245)"
	            ));
	            iframeContext.iframeWindow?.["Utils"]?.Sound?.play?.(0);
	        }),
	        new NEvent("mouseleave", (_e, ele) =>
	        {
	            ele.setStyle("backgroundColor", buttonBackgroundColor);
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

	let waitForId = "";
	let waitStartTime = 0;

	/**
	 * 尝试同步聊天记录
	 */
	function trySyncChatRecord()
	{
	    showNotice("聊天记录同步", "正在尝试获取聊天记录");
	    let requestId = uniqueIdentifierString$2();
	    forgeApi.operation.sendSelfPrivateForgePacket({
	        plug: "forge",
	        type: "syncPrivateChatRecordRQ",
	        id: requestId,
	        startTime: Math.max(
	            Date.now() - 3 * 24 * 60 * 60 * 1000,
	            storageContext.local.lastCloseTime - 30 * 60 * 60 * 1000,
	            storageContext.local.syncChatRecordTo - 15 * 60 * 1000
	        ),
	        endTime: Date.now() + 30 * 1000
	    });
	    waitForId = requestId;
	    waitStartTime = Date.now();
	}

	let registedReturnChatRecord = false;
	/**
	 * 启用聊天记录同步
	 */
	function enableSyncChatRecord()
	{
	    if (registedReturnChatRecord)
	        return;
	    registedReturnChatRecord = true;
	    protocolEvent.forge.selfPrivateForgePacket.add(e =>
	    {
	        if (waitForId)
	        {
	            if (
	                e.content.type == "syncPrivateChatRecordCB" &&
	                e.content.id == waitForId &&
	                waitStartTime + 35 * 1000 >= Date.now()
	            ) // 收到请求回调
	            {
	                if (e.content.content)
	                {
	                    let diffCount = checkRecordDiff(e.content.content, e.content.startTime);
	                    // console.log(e.content.content);
	                    if (diffCount == 0)
	                        showNotice("聊天记录同步", "本地聊天记录已为最新");
	                    else
	                        showNotice("聊天记录同步", `从其他设备获取到 ${diffCount} 条记录\n点击合并记录到当前设备`, undefined, () =>
	                        {
	                            storageContext.local.syncChatRecordTo = Math.min(Date.now(), e.content.endTime);
	                            if (Number.isNaN(storageContext.local.syncChatRecordTo))
	                                storageContext.local.syncChatRecordTo = Date.now();
	                            storageLocalSave();
	                            mergeRecordToLocal(e.content.content, e.content.startTime);
	                        });
	                }
	            }
	        }

	        if (e.content.type == "syncPrivateChatRecordRQ")
	        { // 收到同步请求
	            let startTime = Number(e.content.startTime);
	            let endTime = Number(e.content.endTime);
	            if (
	                Number.isNaN(startTime) ||
	                Number.isNaN(endTime) ||
	                !(startTime < endTime)
	            )
	                return;

	            let recordList = getLocalRecordList();

	            let callbackContent = [];

	            recordList.forEach(o =>
	            {
	                if (
	                    o.records.length == 0 ||
	                    !(processSingleRecord(o.records.at(-1))[1] >= startTime)
	                )
	                    return;

	                let needSendRecords = [];
	                for (let i = o.records.length - 1; i >= 0; i--)
	                {
	                    let nowRecord = processSingleRecord(o.records[i]);
	                    let time = nowRecord[1];
	                    if (time < startTime)
	                        break;
	                    if (startTime <= time && time < endTime)
	                        needSendRecords.push(nowRecord);
	                }
	                if (needSendRecords.length > 0)
	                {
	                    needSendRecords.sort((a, b) => a[1] - b[1]);
	                    callbackContent.push({
	                        name: o.name,
	                        info: o.info,
	                        uid: o.uid,
	                        otherInfo: o.otherInfo,
	                        records: needSendRecords
	                    });
	                }
	            });

	            let requestId = e.content.id;
	            forgeApi.operation.sendSelfPrivateForgePacket({
	                plug: "forge",
	                type: "syncPrivateChatRecordCB",
	                id: requestId,
	                content: callbackContent,
	                startTime: startTime,
	                endTime: endTime
	            });
	            showNotice("聊天记录同步", "其他设备正在拉取本机聊天记录");
	        }
	    });
	}

	/**
	 * 获取本地记录
	 * @returns {Array<{
	 *  uid: string,
	 *  name: string,
	 *  info: Array<string>,
	 *  records: Array<string | [boolean, number, ...Array<string>]>,
	 *  otherInfo: Array<string>
	 * }>}
	 */
	function getLocalRecordList()
	{
	    iframeContext.iframeWindow["Utils"]?.service?.saveStatus?.(7, 1);
	    let rawRecordStr = localStorage.getItem(`pmLog_${forgeApi.operation.getUserUid()}`);
	    if (rawRecordStr)
	        return rawRecordStr.split("<").map(o =>
	        {
	            let part = o.split(`"`).map(o => o.split(`>`));
	            return {
	                uid: part[0]?.[0],
	                name: part[1]?.[2],
	                info: part[1],
	                records: part[2],
	                otherInfo: part[3]
	            };
	        });
	    else
	        return [];
	}

	/**
	 * 设置本地记录
	 * @param {ReturnType<typeof getLocalRecordList>} recordList 
	 */
	function setLocalRecordList(recordList)
	{
	    let rawRecordStr = recordList.map(o =>
	        ([
	            o.uid,
	            o.info.map((e, ind) =>
	            {
	                if ((ind == 7 || ind == 8) && o.records.length > 0)
	                    return processSingleRecord(o.records.at(-1))[3];
	                return e;
	            }).join(`>`),

	            o.records.map(o =>
	            {
	                if (typeof (o) == "string")
	                    return o;
	                else
	                    return [
	                        (o[0] ? "1" : ""),
	                        Math.floor(o[1] / 1000).toString(10),
	                        ...o.slice(2)
	                    ].join(`'`);
	            }).join(`>`),

	            o.records.length.toString(10)
	            // o.otherInfo.join(`>`)
	        ]).join(`"`)
	    ).join("<");
	    localStorage.setItem(`pmLog_${forgeApi.operation.getUserUid()}`, rawRecordStr);
	}

	/**
	 * 处理单条记录
	 * @param {string | [boolean, number, ...Array<string>]} record
	 * @returns {[boolean, number, ...Array<string>]}
	 */
	function processSingleRecord(record)
	{
	    if (typeof (record) == "string")
	    {
	        let part = record.split(`'`);

	        let time = Number(part[1]) * 1000;
	        let sendBySelf = (part[0] == "1");

	        return [
	            sendBySelf,
	            time,
	            ...part.slice(2)
	        ];
	    }
	    else
	        return record;
	}

	/**
	 * 检查本地记录中不存在的记录
	 * @param {ReturnType<typeof getLocalRecordList>} remoteRecordList
	 * @param {number} startTime
	 * @returns {number}
	 */
	function checkRecordDiff(remoteRecordList, startTime)
	{
	    let diffCount = 0;

	    let localRecordList = getLocalRecordList();
	    let localRecordMap = new Map(localRecordList.map(o => [o.uid, o]));

	    remoteRecordList.forEach(o =>
	    {
	        let localRecordInfo = localRecordMap.get(o.uid);
	        if (localRecordInfo)
	        {
	            let localRecordMessageMap = new Map();
	            for (let i = localRecordInfo.records.length - 1; i >= 0; i--)
	            {
	                let nowRecord = processSingleRecord(localRecordInfo.records[i]);
	                let time = nowRecord[1];
	                let messageId = nowRecord[3];
	                if (time < startTime - 60 * 1000)
	                    break;
	                localRecordMessageMap.set(messageId, nowRecord);
	            }

	            o.records.forEach(o =>
	            {
	                let nowRecord = processSingleRecord(o);
	                let messageId = nowRecord[3];
	                if (!localRecordMessageMap.has(messageId))
	                    diffCount++;
	            });
	        }
	        else
	            diffCount += o.records.length;
	    });

	    return diffCount;
	}

	/**
	 * 合并记录到本地
	 * 将刷新内侧iframe
	 * @param {ReturnType<typeof getLocalRecordList>} remoteRecordList
	 * @param {number} startTime
	 */
	function mergeRecordToLocal(remoteRecordList, startTime)
	{
	    let localRecordList = getLocalRecordList();
	    let localRecordMap = new Map(localRecordList.map(o => [o.uid, o]));

	    remoteRecordList.forEach(o =>
	    {
	        let localRecordInfo = localRecordMap.get(o.uid);
	        if (localRecordInfo)
	        {
	            let localRecordMessageMap = new Map();
	            for (let i = localRecordInfo.records.length - 1; i >= 0; i--)
	            {
	                let nowRecord = processSingleRecord(localRecordInfo.records[i]);
	                let time = nowRecord[1];
	                let messageId = nowRecord[3];
	                if (time < startTime - 5 * 60 * 1000)
	                    break;
	                localRecordMessageMap.set(messageId, nowRecord);
	            }

	            let localRecordIndex = localRecordInfo.records.length;
	            for (let i = o.records.length - 1; i >= 0; i--)
	            {
	                let nowRecord = processSingleRecord(o.records[i]);
	                let time = nowRecord[1];
	                let messageId = nowRecord[3];
	                if (!localRecordMessageMap.has(messageId))
	                {
	                    while (
	                        localRecordIndex > 0 &&
	                        processSingleRecord(localRecordInfo.records[localRecordIndex - 1])[1] > time
	                    )
	                        localRecordIndex--;
	                    localRecordInfo.records.splice(localRecordIndex, 0, nowRecord);
	                }
	            }        }
	        else
	        {
	            localRecordList.push(o);
	        }
	    });

	    setLocalRecordList(localRecordList);

	    let oldSaveState = (iframeContext.iframeWindow["Utils"].service.saveStatus).bind(iframeContext.iframeWindow["Utils"].service);
	    iframeContext.iframeWindow["Utils"].service.saveStatus = () =>
	    {
	        for (let i = 0; i <= 11; i++)
	            if (i != 7)
	                oldSaveState(i, 1);
	    };

	    iframeContext.iframeWindow.location.reload();
	}

	/**
	 * 注册动画帧
	 * 每帧调用回调直到动画停止
	 * @param {(time: number, timeOffset: number) => boolean | void} callback 返回true时停止动画
	 * @returns {() => void} 执行此函数停止动画
	 */
	function registAnimationFrame(callback)
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
	     * @type {import("./ForgeSuperMenu").ForgeSuperMenu}
	     */
	    menu = null;

	    constructor()
	    {
	        this.element = NList.getElement([
	            createNStyleList({
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
	            createNStyleList({
	                height: "100%",
	                width: "100%",
	                top: "0",
	                left: "0",
	                position: "fixed",
	                backgroundColor: "rgba(230, 230, 230, 0.5)",
	                zIndex: "10000000",
	            }),

	            this.cursorIndicator.element = NList.getElement([
	                createNStyleList({
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
	        const sizeX = 375;
	        const sizeY = 75;


	        let minX = -(this.startColumnIndex + 0.5) * sizeX;
	        let maxX = (this.menuList.length - this.startColumnIndex - 0.5) * sizeX;
	        if (this.menuPointerX >= maxX)
	            this.menuPointerX = maxX - 1;
	        else if (this.menuPointerX < minX)
	            this.menuPointerX = minX;

	        let columnIndex = this.startColumnIndex + Math.round(this.menuPointerX / sizeX);
	        this.setCurrentColumn(columnIndex);



	        let nowColumn = this.menuList[this.currentColumnIndex];

	        let minY = -(nowColumn.startRowIndex + 0.5) * sizeY;
	        let maxY = (nowColumn.list.length - nowColumn.startRowIndex - 0.5) * sizeY;
	        if (this.menuPointerY >= maxY)
	            this.menuPointerY = maxY - 1;
	        else if (this.menuPointerY < minY)
	            this.menuPointerY = minY;

	        let rowIndex = nowColumn.startRowIndex + Math.round(this.menuPointerY / sizeY);
	        nowColumn.setCurrentRow(rowIndex);

	        let verticalRemainderPercentage = (this.menuPointerY / sizeY) - Math.round(this.menuPointerY / sizeY) + 0.5;
	        let horizontalRemainderPercentage = (this.menuPointerX / sizeX) - Math.round(this.menuPointerX / sizeX) + 0.5;

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
	        this.menuList[this.currentColumnIndex]?.triggerCurrent();
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
	            if (Math.abs(rect.x - this.cursorIndicator.x) >= eps ||
	                Math.abs(rect.y - this.cursorIndicator.y) >= eps ||
	                Math.abs(rect.width - this.cursorIndicator.width) >= eps ||
	                Math.abs(rect.height - this.cursorIndicator.height) >= eps ||
	                !this.cursorIndicator.visible)
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

	/**
	 * 启用超级菜单
	 */
	function enableSuperMenu()
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

	            let nowRoomId = forgeApi.operation.getUserRoomId();
	            rightColumn.addChild(createRoomListItemById(nowRoomId), () => { });
	            try
	            {
	                /** @type {Array<string>} */
	                let roomHistory = JSON.parse(localStorage.getItem("database"))?.["roomHistory"]?.split?.(",");
	                if (roomHistory)
	                    roomHistory.forEach(o =>
	                    {
	                        if (o != nowRoomId)
	                            rightColumn.addChild(createRoomListItemById(o, "历史"), () =>
	                            {
	                                forgeApi.operation.switchRoom(o);
	                            });
	                    });
	            }
	            catch (err)
	            {
	                console.error("forge supper menu:", err);
	            }

	            rightColumn.currentRowIndex = 0;
	        }
	        // 左侧的列表
	        {
	            leftColumn.clearChild();

	            leftColumn.addChild(createListItem("", "无动作", ""), () => { });
	            leftColumn.addChild(createListItem("mdi-mailbox", "打开信箱", ""), () =>
	            {
	                iframeContext.iframeWindow?.["functionBtnDo"]?.(2);
	            });
	            leftColumn.addChild(createListItem("mdi-music", "切换媒体开关", ""), () =>
	            {
	                iframeContext.iframeWindow?.["functionBtnDo"]?.(90);
	            });
	            leftColumn.addChild(createListItem("mdi-music-box-multiple", "打开播放列表", ""), () =>
	            {
	                iframeContext.iframeWindow?.["functionBtnDo"]?.(1, iframeContext.iframeDocument?.createElement("div"));
	            });
	            leftColumn.addChild(createListItem("mdi-store", "打开商店", ""), () =>
	            {
	                iframeContext.iframeWindow?.["functionBtnDo"]?.(10, iframeContext.iframeDocument?.createElement("div"));
	            });
	            leftColumn.addChild(createListItem("mdi-camera-iris", "打开朋友圈", ""), () =>
	            {
	                iframeContext.iframeWindow?.["functionBtnDo"]?.(5);
	            });
	            leftColumn.addChild(createListItem("mdi-forum", "打开论坛", ""), () =>
	            {
	                iframeContext.iframeWindow?.["functionBtnDo"]?.(3);
	            });
	            leftColumn.addChild(createListItem("mdi-clipboard-check-multiple", "打开任务版", ""), () =>
	            {
	                iframeContext.iframeWindow?.["functionBtnDo"]?.(4);
	            });

	            leftColumn.currentRowIndex = 0;
	        }

	        supperMenu.setCurrentColumn(1);
	    }

	    /**
	     * @param {{ movementX: number, movementY: number }} e
	     */
	    let mouseMove = (e) =>
	    {
	        if (supperMenuDisplay)
	            supperMenu.menuPointerMove(e.movementX, e.movementY);
	    };

	    iframeContext.iframeWindow.addEventListener("mousedown", e =>
	    {
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
	            supperMenu.menuElement.element.requestPointerLock({
	                unadjustedMovement: true
	            });
	        }, 125);
	    }, true);
	    iframeContext.iframeWindow.addEventListener("mouseup", e =>
	    {
	        if (e.button != 2)
	            return;
	        if (supperMenuDisplayTimeOutId != null)
	        {
	            clearTimeout(supperMenuDisplayTimeOutId);
	            supperMenuDisplayTimeOutId = null;
	        }
	        if (!supperMenuDisplay)
	            return;
	        supperMenu.triggerCurrent();
	        iframeContext.iframeWindow.removeEventListener("mousemove", mouseMove, true);

	        document.exitPointerLock();
	        iframeContext.iframeDocument.exitPointerLock();

	        setTimeout(() =>
	        {
	            supperMenuDisplay = false;
	            supperMenu.hide();
	        }, 10);
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
	                        supperMenu.triggerCurrent();
	                        supperMenuDisplay = false;
	                        supperMenu.hide();
	                    }, 10);
	            }
	        }, false);
	        let msgholderElement = iframeContext.iframeDocument.getElementById("msgholder");
	        msgholderElement?.addEventListener("contextmenu", e =>
	        {
	            console.log(e.target);
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
	            }
	        }, true);
	    }
	}


	/**
	 * 通过房间id创建列表项
	 * @param {string} roomId 
	 * @param {string} [addition]
	 * @returns 
	 */
	function createRoomListItemById(roomId, addition = "")
	{
	    let roomInfo = forgeApi.operation.getRoomInfoById(roomId);
	    if (roomInfo)
	        return createListItem(
	            "http" + roomInfo.roomImage,
	            roomInfo.name,
	            roomInfo.description,
	            (roomInfo.currentUserNum != "hidden" ? `${roomInfo.currentUserNum}人` : "隐藏人数"),
	            addition,
	            `rgba(${roomInfo.color}, 0.8)`
	        );
	    else
	        return createListItem(
	            "",
	            "不存在的房间",
	            "",
	            "",
	            "",
	            `rgba(0, 0, 0, 0.8)`
	        );
	}

	/**
	 * 创建列表项
	 * @param {string} image
	 * @param {string} title
	 * @param {string} text
	 * @param {string} [addition]
	 * @param {string} [cornerMark]
	 * @returns {NElement}
	 */
	function createListItem(image, title, text, addition = "", cornerMark = "", color = "rgba(240, 240, 240, 0.8)")
	{
	    /**
	     * 检测是亮色或暗色
	     * @param {string} colorStr
	     */
	    function rgbLightOrDark(colorStr)
	    {
	        let braceIndex = color.indexOf("(");
	        if (braceIndex != -1)
	            colorStr = colorStr.slice(braceIndex + 1, colorStr.lastIndexOf(")"));
	        let part = colorStr.split(",").map(o => Number.parseInt(o));
	        return (part[0] * 0.299 + part[1] * 0.587 + part[2] * 0.114 > 186);
	    }

	    let textColor = (rgbLightOrDark(color) ? "rgba(0, 0, 0, 0.75)" : "rgba(255, 255, 255, 0.75)");
	    return NList.getElement([
	        className("sessionHolderPmTaskBoxItem"),
	        createNStyleList({
	            backgroundColor: color,
	            color: textColor
	        }),
	        [
	            createNStyleList({
	                height: "100px",
	                width: "100px",
	                position: "relative",
	                WebkitMaskImage: "linear-gradient(to right,#000 50%,transparent)",
	                display: (image ? "block" : "none")
	            }),
	            [
	                className("bgImgBox"),
	                (
	                    image.startsWith("mdi-") ?
	                        [
	                            createNStyleList({
	                                width: "100%",
	                                height: "100%",
	                                textAlign: "center"
	                            }),
	                            [
	                                createNStyleList({
	                                    lineHeight: "100px",
	                                    fontSize: "50px",
	                                    fontFamily: "md",
	                                    height: "100%",
	                                }),
	                                className(image),
	                                new NTagName("span"),
	                            ]
	                        ] :
	                        [
	                            className("bgImg"),
	                            new NTagName("img"),
	                            new NAttr("loading", "lazy"),
	                            new NAttr("decoding", "async"),
	                            new NAttr("src", image),
	                        ]
	                ),
	                [
	                    className("fullBox")
	                ]
	            ]
	        ],
	        [
	            createNStyleList({
	                height: "100%",
	                position: "absolute",
	                top: "0",
	                left: "100px",
	                right: "0"
	            }),
	            [
	                className("sessionHolderPmTaskBoxItemName textOverflowEllipsis"),
	                [
	                    createNStyleList({
	                        fontSize: "inherit",
	                        fontWeight: "inherit"
	                    }),
	                    title
	                ]
	            ],
	            [
	                className("sessionHolderPmTaskBoxItemTime textOverflowEllipsis"),
	                addition
	            ],
	            [
	                className("sessionHolderPmTaskBoxItemMsg textOverflowEllipsis"),
	                text
	            ]
	        ],
	        [
	            createNStyleList({
	                position: "absolute",
	                top: "1px",
	                right: "1px",
	                backgroundColor: textColor,
	                color: color,
	                fontSize: "16px",
	                fontWeight: "bold",
	                padding: "0px 8px",
	                height: "26.5px",
	                lineHeight: "26.5px",
	                transition: "transform 0.25s ease 0s",
	                borderRadius: "0px 0px 0px 2px",
	                display: (cornerMark ? "block" : "none")
	            }),
	            cornerMark
	        ]
	    ]);
	}

	let textEncoder = new TextEncoder();

	/**
	 * 启动实验性功能
	 */
	function enableExperimental()
	{
	    let shiftDown = false;

	    keyboardBind(iframeContext.iframeBody.element, e =>
	    {
	        if (e.key == "Shift")
	            shiftDown = e.hold;
	    });

	    iframeContext.iframeWindow["Objs"].mapHolder.function.roomchanger = proxyFunction(
	        iframeContext.iframeWindow["Objs"].mapHolder.function.roomchanger,
	        (param) =>
	        {
	            if (param.length == 1 && typeof (param[0]) == "string")
	            {
	                if (
	                    storageContext.local.experimentalOption["ejection"] ||
	                    (storageContext.local.experimentalOption["ejectionButton"] && shiftDown)
	                )
	                {
	                    const targetRoomId = param[0];
	                    ejectionEscape(targetRoomId);
	                    return true;
	                }
	            }
	            return false;
	        }
	    );

	    if (storageContext.local.experimentalOption["ejectionButton"])
	    {
	        let oldFunction_Objs_mapHolder_function_event = iframeContext.iframeWindow["Objs"]?.mapHolder?.function?.event;
	        if (oldFunction_Objs_mapHolder_function_event)
	        { // 房间按钮点击
	            iframeContext.iframeWindow["Objs"].mapHolder.function.event = proxyFunction(oldFunction_Objs_mapHolder_function_event, function (param, srcFunction, _targetFn, thisObj)
	            {
	                if (param.length == 1 && param[0] == 8)
	                {
	                    let roomId = (/** @type {HTMLElement} */ (thisObj))?.getAttribute?.("rid");
	                    if (!roomId)
	                        return false;

	                    srcFunction(...param);

	                    let selectHolderBox = iframeContext.iframeDocument.getElementById("selectHolderBox");
	                    selectHolderBox.appendChild(
	                        createIiroseMenuElement(
	                            "mdi-ghost-outline",
	                            `弹射起步`,
	                            async e =>
	                            {
	                                ejectionEscape(roomId);
	                            }
	                        ).element
	                    );
	                    return true;
	                }
	                return false;
	            });
	        }
	    }

	    if (storageContext.local.experimentalOption["withdraw"])
	    {
	        takeoverWithdraw();
	    }
	}

	/**
	 * @param {string} targetRoomId
	 */
	function ejectionEscape(targetRoomId)
	{
	    iframeContext.socket?._send(textEncoder.encode("m" + targetRoomId));
	    iframeContext.socket.onclose = () => { };
	    iframeContext.socket?.close();
	    setTimeout(() =>
	    {
	        iframeContext.iframeWindow?.sessionStorage?.setItem?.("lastroom", "");
	        iframeContext.iframeWindow?.sessionStorage?.setItem?.("autologin", "1");
	        iframeContext.iframeWindow?.["Cookie"]?.("roomsave", targetRoomId);
	        iframeContext.iframeWindow?.location?.reload?.();
	    }, 7 * 1000);
	    showNotice("实验性功能", "少女祈祷中...");
	    setTimeout(() =>
	    {
	        showNotice("实验性功能", "马上就好了~");
	    }, 3500);
	}

	let hadTakeoverWithdraw = false;
	function takeoverWithdraw()
	{
	    if (hadTakeoverWithdraw)
	        return;
	    hadTakeoverWithdraw = true;
	    toClientTrie.addPath("v0#", data =>
	    {
	        let part = data.split(`"`);
	        try
	        {
	            let messageElement = /** @type {HTMLElement} */(iframeContext.iframeDocument.querySelector(`div#msgholder div.fullBox[index="0"] div[data-id="${part[0]}"]`));
	            domPath(messageElement, [0, 0, 0])?.appendChild(NList.getElement([
	                createNStyleList({
	                    backgroundColor: cssG.rgb(100, 100, 100, 0.6),
	                    color: cssG.rgb(255, 255, 255, 0.9),
	                    borderRadius: "3px",

	                    position: "absolute",
	                    padding: "0.2em",
	                    bottom: "-0.7em",
	                    [messageElement.style.float != "right" ? "right" : "left"]: "-1.7em"
	                }),
	                "已撤回"
	            ]).element);
	        }
	        catch (err)
	        {
	            console.error(err);
	        }
	        return true;
	    });
	    toClientTrie.addPath("v0*", data =>
	    {
	        let part = data.split(`"`);
	        try
	        {
	            let messageElement = /** @type {HTMLElement} */(iframeContext.iframeDocument.querySelector(`div#msgholder div.fullBox[ip="${part[0]}"] div[data-id="${part[1]}"]`));
	            domPath(messageElement, [1, 0])?.appendChild(NList.getElement([
	                createNStyleList({
	                    backgroundColor: cssG.rgb(100, 100, 100, 0.6),
	                    color: cssG.rgb(255, 255, 255, 0.9),
	                    borderRadius: "3px",

	                    position: "absolute",
	                    padding: "0.2em",
	                    bottom: "-0.7em",
	                    [messageElement.style.float != "right" ? "right" : "left"]: "-1.7em"
	                }),
	                "已撤回"
	            ]).element);
	        }
	        catch (err)
	        {
	            console.error(err);
	        }
	        return true;
	    });
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
	        iframeContext.iframeDocument = iframeDocument;
	        iframeContext.iframeWindow = iframeWindow;
	        iframeContext.iframeBody = getNElement(/** @type {HTMLBodyElement} */(iframeDocument.body));

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

	        iframeContext.socket = iframeWindow["socket"];

	        (() => // 注入socket
	        {
	            iframeContext.socket._onmessage = proxyFunction(iframeContext.socket._onmessage.bind(iframeContext.socket), (param) =>
	            {
	                if (globalState.debugMode)
	                    console.log("receive packet", param);
	                try
	                {
	                    if (toClient(/** @type {[string]} */(param)))
	                        return true;
	                }
	                catch (err)
	                {
	                    console.error("[iiroseForge]", err);
	                    return false;
	                }
	                return false;
	            });

	            iframeContext.socketApi.send = iframeContext.socket.send.bind(iframeContext.socket);

	            iframeContext.socket.send = proxyFunction(iframeContext.socketApi.send, (param) =>
	            {
	                if (globalState.debugMode)
	                    console.log("send packet", param);
	                try
	                {
	                    if (toServer(/** @type {[string]} */(param)))
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

	        iframeWindow["iiroseForgeApi"] = forgeApi; // 给内侧侧载脚本预留forgeApi

	        if (globalState.debugMode)
	            enableForgeDebugMode(globalState.debugMode);

	        (async () =>
	        { // 侧载在内侧执行的脚本
	            let scriptCount = 0;
	            storageContext.roaming.sideLoadedScript.forEach(([name, url, insideIframe]) =>
	            {
	                if (insideIframe)
	                {
	                    let script = document.createElement("script");
	                    script.src = url;
	                    iframeDocument.body.appendChild(script);
	                    scriptCount++;
	                }
	            });
	            if (scriptCount > 0)
	                showNotice("iiroseForge plug-in", `已在iframe内侧侧载 ${scriptCount} 个js脚本`);
	        })();

	        // 附加功能
	        ([
	            {
	                func: enableSyncConfig,
	            },
	            {
	                func: enableSyncChatRecord
	            },
	            {
	                func: enableMultiAccount
	            },
	            {
	                func: enableUserRemark,
	                condition: "enableUserRemark"
	            },
	            {
	                func: trySyncChatRecord,
	                condition: "enableSyncChatRecord"
	            },
	            {
	                func: enableSuperMenu,
	                condition: "enableSuperMenu"
	            },
	            {
	                func: enableExperimental,
	                condition: "enableExperimental"
	            }
	        ]).forEach(o =>
	        {
	            try
	            {
	                if ((!o.condition) || storageContext.local[o.condition])
	                    o.func();
	            }
	            catch (err)
	            {
	                console.error("patch error:", err);
	            }
	        });
	    }, 1000);

	    if (localStorage.getItem("installForge") == "true")
	    {
	        intervalTry(() => // 循环尝试注入
	        {
	            /**
	             * @type {HTMLIFrameElement}
	             */
	            let mainIframe = (/** @type {HTMLIFrameElement} */(document.getElementById("mainFrame")));

	            let iframeWindow = mainIframe.contentWindow;
	            if (iframeWindow["iiroseForgeClearCacheInjected"])
	                return;

	            if (!(iframeWindow["Utils"]?.service?.clearCache))
	                throw "Incomplete load";
	            let old_Utils_service_clearCache = iframeWindow["Utils"].service.clearCache.bind(iframeWindow["Utils"].service);
	            iframeWindow["Utils"].service.clearCache = (...param) =>
	            {
	                let old_parent_location__reload = iframeWindow.parent.location["_reload"].bind(iframeWindow.parent.location);
	                iframeWindow.location["_reload"] = iframeWindow.parent.location["_reload"] = (...param) =>
	                {
	                    setTimeout(async () =>
	                    {
	                        await writeForgeToCache();
	                        setTimeout(() =>
	                        {
	                            old_parent_location__reload(...param);
	                        }, 5);
	                    }, 100);
	                };
	                old_Utils_service_clearCache(...param);
	            };

	            iframeWindow["iiroseForgeClearCacheInjected"] = true;
	        }, 5);
	    }
	}

	if (location.host == "iirose.com")
	{
	    if (location.pathname == "/")
	    {
	        if (!window["iiroseForgeInjected"])
	        {
	            window["iiroseForgeInjected"] = true; // 最外层页面已被注入标记

	            console.log("[iiroseForge] iiroseForge已启用");

	            window["enableForgeDebugMode"] = enableForgeDebugMode;
	            if (sessionStorage.getItem("iiroseForgeDebugMode") == "true")
	                enableForgeDebugMode(true);

	            storageRoamingRead();
	            storageLocalRead();

	            plugList.readPlugList();


	            let mainIframe = (/** @type {HTMLIFrameElement} */(document.getElementById("mainFrame")));
	            mainIframe.addEventListener("load", () => // 主iframe加载事件
	            {
	                console.log("[iiroseForge] 已重载 正在将iiroseForge注入iframe");
	                initInjectIframe();
	            });
	            console.log("[iiroseForge] 正在将iiroseForge注入iframe");
	            initInjectIframe();
	            window.addEventListener("beforeunload", () =>
	            {
	                storageContext.local.lastCloseTime = Date.now();
	                storageLocalSave();
	            });

	            // 长时间连不上ws弹出提示

	            let cannotLoad = 0;
	            let showHelpNotice = false;
	            setInterval(() =>
	            {
	                if (mainIframe.contentWindow?.["socket"]?.readyState == 0)
	                {
	                    if (cannotLoad >= 2)
	                    {
	                        if (!showHelpNotice)
	                        {
	                            showHelpNotice = true;
	                            showNotice(
	                                "无法连接",
	                                ([
	                                    `检测到连接到iirose服务器的速度过慢`,
	                                    `正在连接: ${mainIframe.contentWindow?.["socket"]?.url}`,
	                                    `可能是当前尝试连接的服务器出现了问题`,
	                                    `点击以尝试连接其他候选服务器`
	                                ]).join("\n"),
	                                undefined,
	                                () =>
	                                {
	                                    cannotLoad = 0;
	                                    showHelpNotice = false;
	                                    if (mainIframe.contentWindow?.["socket"]?.readyState == 0)
	                                    {
	                                        try
	                                        {
	                                            mainIframe.contentWindow?.["socket"]?.close();
	                                        }
	                                        catch (err)
	                                        { }
	                                        try
	                                        {
	                                            mainIframe.contentWindow?.["socket"]?.onerror();
	                                        }
	                                        catch (err)
	                                        { }
	                                    }
	                                }
	                            );
	                        }
	                    }
	                    else
	                        cannotLoad++;
	                }
	                else
	                {
	                    cannotLoad = 0;
	                    showHelpNotice = false;
	                }
	            }, 3000);

	            (async () =>
	            { // 侧载在外侧执行的脚本
	                let scriptCount = 0;
	                storageContext.roaming.sideLoadedScript.forEach(([name, url, insideIframe]) =>
	                {
	                    if (!insideIframe)
	                    {
	                        let script = document.createElement("script");
	                        script.src = url;
	                        window.document.body.appendChild(script);
	                        scriptCount++;
	                    }
	                });
	                if (scriptCount > 0)
	                    showNotice("iiroseForge plug-in", `已在iframe外部侧载 ${scriptCount} 个js脚本`);
	            })();
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
