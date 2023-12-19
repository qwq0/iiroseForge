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
	 * html特殊符号转义
	 * @param {string} e 
	 * @returns {string}
	 */
	function htmlSpecialCharsEscape(e)
	{
	    e = e.replaceAll(`&`, "&amp;");

	    e = e.replaceAll(`<`, "&lt;");
	    e = e.replaceAll(`>`, "&gt;");
	    e = e.replaceAll(`"`, "&quot;");
	    e = e.replaceAll(`'`, "&#039;");
	    e = e.replaceAll(`\\`, "&#092;");
	    
	    return e;
	}
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
	            if (iframeContext.iframeWindow?.["myself"])
	                return iframeContext.iframeWindow["myself"];
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
	         *  currentUserNum: number | "hidden",
	         *  ownerName: string,
	         *  member: Array<{ name: string, auth: "member" | "admin"| "unknow" }>
	         * }}
	         */
	        getRoomInfoById: (roomId) =>
	        {
	            roomId = String(roomId);
	            let roomInfoArray = iframeContext.iframeWindow?.["Objs"]?.mapHolder?.Assets?.roomJson?.[roomId];
	            if (roomInfoArray)
	            {
	                /** @type {Array<Array<string>>} */
	                let roomInfoPart = roomInfoArray[5].split("&&").map((/** @type {string} */ o) => o.split(" & "));
	                let imageAndDescription = htmlSpecialCharsDecode(roomInfoPart[0][0]);
	                let firstSpaceIndex = imageAndDescription.indexOf(" ");
	                return {
	                    name: roomInfoArray[1],
	                    color: roomInfoArray[2],
	                    roomPath: (/** @type {string} */(roomInfoArray[0])).split("_"),
	                    description: imageAndDescription.slice(firstSpaceIndex + 1),
	                    roomImage: imageAndDescription.slice(0, firstSpaceIndex),
	                    currentUserNum: (typeof (roomInfoArray[7]) == "number" ? roomInfoArray[7] : "hidden"),
	                    ownerName: roomInfoPart[1][0],
	                    member: roomInfoPart[4].map(o => ({
	                        name: htmlSpecialCharsDecode(o.slice(1)),
	                        auth: (o[0] == "0" ? "member" : o[0] == "1" ? "admin" : "unknow")
	                    }))
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
	         *  uid: string,
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
	                return {
	                    name: userInfoArray[2],
	                    uid: uid,
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
	         * 通过uid获取在线用户的信息
	         * @returns {Array<{
	         *  name: string,
	         *  uid: string,
	         *  color: string,
	         *  avatar: string,
	         *  roomId: string,
	         *  personalizedSignature: string
	         * }>}
	         */
	        getAllOnlineUserInfo: () =>
	        {
	            let userInfoMapObj = iframeContext.iframeWindow?.["Objs"]?.mapHolder.Assets.userJson;
	            if (userInfoMapObj)
	            {
	                return (Object.keys(userInfoMapObj)).map(key =>
	                {
	                    let o = userInfoMapObj[key];
	                    return {
	                        name: o[2],
	                        uid: o[8],
	                        color: o[3],
	                        avatar: o[0],
	                        roomId: o[4],
	                        personalizedSignature: o[6]
	                    };
	                });
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
	         * @returns {{
	         *  messageId: string
	         * }}
	         */
	        sendPrivateMessageSilence: (targetUid, content) =>
	        {
	            targetUid = String(targetUid);
	            content = String(content);
	            if (!content || !targetUid)
	                return;
	            let messageId = String(Date.now()).slice(-5) + String(Math.random()).slice(-7);
	            iframeContext.socketApi.send(JSON.stringify({
	                "g": targetUid,
	                "m": content,
	                "mc": forgeApi.operation.getUserInputColor(),
	                "i": messageId
	            }));
	            return { messageId };
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
	            if (!content || !targetUid)
	                return;
	            let messageId = forgeApi.operation.sendPrivateMessageSilence(targetUid, content).messageId;
	            iframeContext.iframeWindow?.["privatechatfunc"](([
	                Math.floor(Date.now() / 1000).toString(10), // 0
	                forgeApi.operation.getUserUid(), // 1
	                htmlSpecialCharsEscape(forgeApi.operation.getUserName()), // 2
	                htmlSpecialCharsEscape(forgeApi.operation.getUserProfilePictureUrl()), // 3
	                htmlSpecialCharsEscape(content), // 4
	                htmlSpecialCharsEscape(forgeApi.operation.getUserInputColor()), // 5
	                "", // 6
	                htmlSpecialCharsEscape(forgeApi.operation.getUserInputColor()), // 7
	                "", // 8
	                "", // 9
	                messageId, // 10
	                targetUid, // 11
	                "", // 12
	                "", // 13
	                "", // 14
	                "", // 15
	                "", // 16
	            ]).join(">"));
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

	let injectorScript = "!function(){\"use strict\";!function(){if(\"iirose.com\"!=location.host)return;let e=null;if(\"/\"==location.pathname)e=window;else{if(\"/messages.html\"!=location.pathname)return;e=parent.window}if(e.iiroseForgeInjected)return;let t=!1,o=!1,i=[\"https://qwq0.github.io/iiroseForge/iiroseForge.js\",\"https://cdn.jsdelivr.net/gh/qwq0/iiroseForge@page/iiroseForge.js\"];!function n(a){!async function(n){let a=await fetch(n,{cache:\"no-cache\"});if(a.ok){let c=await a.text();if(c&&(t||(t=!0,console.log(`[iiroseForgeInjector] load from ${n}`),new e.Function(c)()),!o)){o=!0;let e=await(window?.caches?.open?.(\"v\"));if(e){let t=new Response(new Blob([c],{type:\"text/javascript\"}),{status:200,statusText:\"OK\"});e.put(i[0],t),console.log(\"[iiroseForgeInjector] cache updated\")}}}}(i[a]),a<i.length-1&&setTimeout((()=>{t||n(a+1)}),2e3)}(0),(async()=>{if(t)return;let o=await((await(window?.caches?.open?.(\"v\")))?.match(i[0]));if(o&&o.ok){let i=await o.text();i&&!t&&(t=!0,console.log(\"[iiroseForgeInjector] load from cache\"),new e.Function(i)())}})()}()}();";

	const injectCacheStartTag = `<!-- iiroseForge Installed Start -->`;
	const injectCacheEndTag = `<!-- iiroseForge Installed End -->`;

	/**
	 * 在缓存字符串中加入forge注入器
	 * @param {string} originalCacheStr
	 * @param {boolean} requireUpdate
	 * @returns {string}
	 */
	function insertForgeInjectorToString(originalCacheStr, requireUpdate)
	{
	    let cacheStr = originalCacheStr;
	    if (cacheStr.indexOf(injectCacheStartTag) != -1)
	    {
	        if (!requireUpdate)
	            return originalCacheStr;
	    }
	    cacheStr = removeForgeInjectorFromString(cacheStr);
	    let insertIndex = cacheStr.lastIndexOf("</body></html>");
	    if (insertIndex == -1)
	    {
	        showNotice("安装forge", "无法安装forge (缓存错误)");
	        return originalCacheStr;
	    }
	    return ([
	        cacheStr.slice(0, insertIndex),

	        injectCacheStartTag,
	        "<script>",
	        injectorScript,
	        "</script>",
	        injectCacheEndTag,

	        cacheStr.slice(insertIndex)
	    ]).join("");
	}

	/**
	 * 从缓存字符串中移除forge注入器
	 * @param {string} originalCacheStr
	 * @returns {string}
	 */
	function removeForgeInjectorFromString(originalCacheStr)
	{
	    const oldForgeLoaderElementHtml = `<script type="text/javascript" src="https://qwq0.github.io/iiroseForge/l.js"></script>`;

	    let cacheStr = originalCacheStr;

	    let oldRemoveIndex = cacheStr.indexOf(oldForgeLoaderElementHtml);
	    if (oldRemoveIndex != -1)
	        cacheStr = cacheStr.slice(0, oldRemoveIndex) + cacheStr.slice(oldRemoveIndex + oldForgeLoaderElementHtml.length);

	    let removeStartIndex = cacheStr.indexOf(injectCacheStartTag);
	    let removeEndIndex = cacheStr.lastIndexOf(injectCacheEndTag);
	    if (removeStartIndex != -1 && removeEndIndex != -1)
	        cacheStr = cacheStr.slice(0, removeStartIndex) + cacheStr.slice(removeEndIndex + injectCacheEndTag.length);

	    return cacheStr;
	}

	/**
	 * 向缓存中注入iiroseForge
	 * @param {boolean} requireUpdate
	 * @returns {Promise<void>}
	 */
	async function writeForgeToCache(requireUpdate)
	{
	    let cache = await caches.open("v");
	    let catchMatch = await caches.match("/");
	    if (catchMatch)
	    {
	        let mainPageCacheStr = await catchMatch.text();
	        let newCacheMainPage = insertForgeInjectorToString(mainPageCacheStr, requireUpdate);
	        await cache.put("/", new Response(new Blob([newCacheMainPage], { type: "text/html" }), { status: 200, statusText: "OK" }));
	    }
	    else
	    {
	        let newMainPageCacheStr = ([
	            `<!DOCTYPE html>`,
	            `<html>`,
	            `<head>`,
	            `</head>`,
	            `<body>`,
	            `<script>`,
	            `(async () => {`,

	            `let cache = await caches.open("v");`,
	            `await cache.delete("/");`,

	            `let mainPageCacheStr = await (await fetch("/", { cache: "no-cache" })).text();`,
	            `let insertIndex = mainPageCacheStr.lastIndexOf("</body></html>");`,

	            `if(insertIndex != -1)`,
	            `mainPageCacheStr = mainPageCacheStr.slice(0, insertIndex) + `,
	            ` "${injectCacheStartTag}" + "<scr" + "ipt>" + ${JSON.stringify(injectorScript)} + "<\\/sc" + "ript>" + "${injectCacheEndTag}" `,
	            ` + mainPageCacheStr.slice(insertIndex);`,

	            `await cache.put("/", new Response(new Blob([mainPageCacheStr], { type: "text/html" }), { status: 200, statusText: "OK" }));`,

	            `location.reload();`,

	            `})();`,
	            `</script>`,
	            `</body>`,
	            `</html>`
	        ]).join("");
	        await cache.put("/", new Response(new Blob([newMainPageCacheStr], { type: "text/html" }), { status: 200, statusText: "OK" }));
	    }
	}

	/**
	 * 从缓存中清除iiroseForge的注入
	 * @returns {Promise<void>}
	 */
	async function removeForgeFromCache()
	{
	    let cache = await caches.open("v");
	    let catchMatch = await caches.match("/");
	    if (catchMatch)
	    {
	        let mainPageCacheStr = await catchMatch.text();
	        let newCacheMainPage = removeForgeInjectorFromString(mainPageCacheStr);
	        await cache.put("/", new Response(new Blob([newCacheMainPage], { type: "text/html" }), { status: 200, statusText: "OK" }));
	    }
	}

	if (localStorage.getItem("installForge") == "true")
	{ // 用户要求安装
	    writeForgeToCache(false);
	}

	/**
	 * 储存上下文
	 * 将使用json进行序列化
	 */
	const storageContext = {
	    processed: {
	        /**
	         * 黑名单uid集合
	         * @type {Set<string>}
	         */
	        uidBlacklistSet: new Set(),
	        /**
	         * 我的其他账号uid集合
	         * @type {Set<string>}
	         */
	        myAccountSet: new Set(),
	        /**
	         * 置顶会话的uid集合
	         * @type {Set<string>}
	         */
	        pinSessionSet: new Set()
	    },
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
	        myAccountList: [],
	        /**
	         * 美化设置
	         * @type {Object<string, string>}
	         */
	        beautify: {},
	        /**
	         * 自定义资料卡设置
	         * @type {{
	         *  topPinned?: Array<string>,
	         *  bottomPinned?: Array<string>
	         * }}
	         */
	        customInfoPage: {},
	        /**
	         * 黑名单uid列表
	         * @type {Array<string>}
	         */
	        uidBlacklist: [],
	        /**
	         * 置顶会话的uid列表
	         * @type {Array<string>}
	         */
	        pinSessionList: [],
	        /**
	         * 黑名单自动回复文本
	         * @type {string}
	         */
	        blacklistAutoReply: "根据对方的隐私设置 您暂时无法向对方发送私信",
	        /**
	         * 勿扰模式自动回复文本
	         * @type {string}
	         */
	        notDisturbModeAutoReply: "你好 我现在有事不在 一会再和你联系"
	    },
	    local: {
	        // 启用同步聊天记录
	        enableSyncChatRecord: false,
	        // 启用用户备注
	        enableUserRemark: true,
	        // 启用音频接管
	        enableAudioTakeover: true,
	        // 启用超级菜单
	        enableSuperMenu: false,
	        // 启用快速房管操作
	        enableRoomAdminOperation: true,
	        // 启用置顶聊天
	        enablePinSession: true,
	        // 最后一次关闭的时间
	        lastCloseTime: 0,
	        // 已同步聊天记录到此时间
	        syncChatRecordTo: 0,
	        // 启用实验性功能
	        enableExperimental: false,
	        // 实验性功能选项
	        experimentalOption: {},
	        /**
	         * 补丁设置
	         * @type {Object<string, string | boolean>}
	         */
	        patch: {},
	        /**
	         * 超级菜单优先级
	         * @type {Object<string, Object<string, number>>}
	         */
	        superMenuPriority: {}
	    }
	};

	/**
	 * 获取漫游储存
	 * @returns {typeof storageContext.roaming}
	 */
	function storageRoamingGet()
	{
	    try
	    {
	        storageContext.roaming.myAccountList = Array.from(storageContext.processed.myAccountSet);
	        storageContext.roaming.uidBlacklist = Array.from(storageContext.processed.uidBlacklistSet);
	        storageContext.roaming.pinSessionList = Array.from(storageContext.processed.pinSessionSet);
	    }
	    catch (err)
	    {
	        showNotice("错误", "无法处理储存 这可能导致iiroseForge配置丢失");
	    }
	    return storageContext.roaming;
	}

	/**
	 * 设置漫游储存
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
	        storageContext.processed.myAccountSet = new Set(storageContext.roaming.myAccountList);
	        storageContext.processed.uidBlacklistSet = new Set(storageContext.roaming.uidBlacklist);
	        storageContext.processed.pinSessionSet = new Set(storageContext.roaming.pinSessionList);
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
	        let storageJson = JSON.stringify(storageRoamingGet());
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
	    let input = expandElement({
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
	    setTimeout(() => input.element.focus(), 100);
	    let confirm = await showInfoBox(title, text, allowCancel, input);
	    return (confirm ? input.element.value : undefined);
	}

	/**
	 * 显示复制框
	 * @async
	 * @param {string} title
	 * @param {string} text
	 * @param {string} copyText
	 * @returns {Promise<string>}
	 */
	async function showCopyBox(title, text, copyText)
	{
	    let copyTextarea = expandElement({
	        tagName: "textarea",
	        style: {
	            resize: "none",
	            height: "24em",
	            width: "18em",
	        },
	        attr: {
	            value: copyText
	        }
	    });
	    copyTextarea.addEventListener("keydown", e => { e.stopPropagation(); }, true);
	    copyTextarea.addEventListener("input", () =>
	    {
	        copyTextarea.element.value = copyText;
	    });
	    setTimeout(() => copyTextarea.element.focus(), 100);
	    let confirm = await showInfoBox(title, text, false, copyTextarea);
	    return (confirm ? copyTextarea.element.value : undefined);
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
	    let textarea = expandElement({
	        tagName: "textarea",
	        style: {
	            resize: "none",
	            height: "24em",
	            width: "19em",
	        },
	        attr: {
	            value: initValue
	        }
	    });
	    textarea.addEventListener("keydown", e => { e.stopPropagation(); }, true);
	    setTimeout(() => textarea.element.focus(), 100);
	    let confirm = await showInfoBox(title, text, allowCancel, textarea);
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

	let menuHookList = {
	    /**
	     * @type {Array<{
	     *  creater: (e: { uid: string }) => ({ text: string, icon: string } | null),
	     *  callback: (e: { uid: string }) => void
	     * }>}
	     */
	    userMenu: [],
	    /**
	     * @type {Array<{
	     *  creater: (e: { uid: string }) => ({ text: string, icon: string } | null),
	     *  callback: (e: { uid: string }) => void
	     * }>}
	     */
	    sessionMenu: [],
	    /**
	     * @type {Array<{
	     *  creater: (e: { roomId: string }) => ({ text: string, icon: string } | null),
	     *  callback: (e: { roomId: string }) => void
	     * }>}
	     */
	    roomMenu: [],
	    /**
	     * @type {Array<{
	     *  creater: (e: { uid: string, userName?: string, messageContent?: string, messageId?: string }) => ({ text: string, icon: string } | null),
	     *  callback: (e: { uid: string, userName?: string, messageContent?: string, messageId?: string }) => void
	     * }>}
	     */
	    roomMessageMenu: [],
	};


	let hookIdSet = new Set();

	/**
	 * @template {keyof menuHookList} K
	 * @param {string | symbol} hookId
	 * @param {K} location
	 * @param {menuHookList[K][number]["creater"]} creater
	 * @param {menuHookList[K][number]["callback"]} callback
	 */
	function addMenuHook(hookId, location, creater, callback)
	{
	    enableUiHook();

	    if (hookIdSet.has(hookId))
	        return;
	    hookIdSet.add(hookId);

	    menuHookList[location].push({
	        // @ts-ignore
	        creater: creater,
	        // @ts-ignore
	        callback: callback
	    });
	}

	/**
	 * 已启用ui钩子的symbol
	 */
	let hadEnableUiHookSymbol = Symbol();
	function enableUiHook()
	{
	    if ((!iframeContext.iframeWindow) || iframeContext.iframeWindow[hadEnableUiHookSymbol] == true)
	        return;
	    iframeContext.iframeWindow[hadEnableUiHookSymbol] = true;


	    let oldFunction_Objs_mapHolder_function_event = iframeContext.iframeWindow["Objs"]?.mapHolder?.function?.event;
	    if (oldFunction_Objs_mapHolder_function_event)
	    {
	        iframeContext.iframeWindow["Objs"].mapHolder.function.event = proxyFunction(oldFunction_Objs_mapHolder_function_event, (param, srcFunction, _targetFn, thisObj) =>
	        {
	            // 资料卡头像菜单
	            if (param.length == 1 && param[0] == 7)
	            {
	                let uid = thisObj?.dataset?.uid;
	                if (!uid)
	                    return false;

	                srcFunction(...param);

	                let selectHolderBox = iframeContext.iframeDocument.getElementById("selectHolderBox");
	                menuHookList.userMenu.forEach(o =>
	                {
	                    let info = o.creater({ uid });
	                    if (!info)
	                        return;
	                    selectHolderBox.appendChild(
	                        createIiroseMenuElement(
	                            `mdi-${info.icon}`,
	                            info.text,
	                            async e =>
	                            {
	                                e.stopPropagation();
	                                o.callback({ uid });
	                            }
	                        ).element
	                    );
	                });
	                return true;
	            }
	            // 房间消息头像点击
	            else if (
	                param.length == 2 &&
	                param[0] == 7 &&
	                Array.isArray(param[1]) &&
	                thisObj?.classList?.contains("msgavatar")
	            )
	            {
	                let uid = thisObj?.dataset?.uid;
	                let userName = param[1]?.[0];
	                let messageId = thisObj?.parentNode?.parentNode?.dataset?.id?.split("_")?.[1];
	                if (typeof (userName) != "string")
	                    userName = undefined;
	                if (!uid)
	                    return false;

	                srcFunction(...param);

	                let selectHolderBox = iframeContext.iframeDocument.getElementById("selectHolderBox");
	                menuHookList.roomMessageMenu.forEach(o =>
	                {
	                    let info = o.creater({
	                        uid,
	                        messageId,
	                        userName
	                    });
	                    if (!info)
	                        return;
	                    selectHolderBox.appendChild(
	                        createIiroseMenuElement(
	                            `mdi-${info.icon}`,
	                            info.text,
	                            async e =>
	                            {
	                                e.stopPropagation();
	                                o.callback({
	                                    uid,
	                                    messageId,
	                                    userName
	                                });
	                            }
	                        ).element
	                    );
	                });
	                return true;
	            }
	            // 房间菜单
	            else if (
	                (param.length == 1 && param[0] == 8) ||
	                (param.length == 2 && param[0] == 8 && param[1] == 1)
	            )
	            {
	                let roomId = (/** @type {HTMLElement} */ (thisObj))?.getAttribute?.("rid");
	                if((!roomId) && (/** @type {HTMLElement} */ (thisObj))?.getAttribute?.("n") == "2_1")
	                    roomId = thisObj?.nextElementSibling?.getAttribute?.("rid");
	                if (!roomId)
	                    return false;

	                srcFunction(...param);

	                let selectHolderBox = iframeContext.iframeDocument.getElementById("selectHolderBox");
	                menuHookList.roomMenu.forEach(o =>
	                {
	                    let info = o.creater({ roomId });
	                    if (!info)
	                        return;
	                    selectHolderBox.appendChild(
	                        createIiroseMenuElement(
	                            `mdi-${info.icon}`,
	                            info.text,
	                            async e =>
	                            {
	                                e.stopPropagation();
	                                o.callback({ roomId });
	                            }
	                        ).element
	                    );
	                });
	                return true;
	            }
	            return false;
	        });
	    }

	    // 私聊标签页点击
	    let oldFunction_Utils_service_pm_menu = iframeContext.iframeWindow["Utils"]?.service?.pm?.menu;
	    if (oldFunction_Utils_service_pm_menu)
	    {
	        iframeContext.iframeWindow["Utils"].service.pm.menu = proxyFunction(oldFunction_Utils_service_pm_menu, (param, srcFunction) =>
	        {
	            if (param.length == 1)
	            {
	                let uid = param[0]?.parentNode?.getAttribute?.("ip");
	                if (!uid)
	                    return false;

	                srcFunction(...param);

	                let selectHolderBox = iframeContext.iframeDocument.getElementById("selectHolderBox");
	                menuHookList.sessionMenu.concat(menuHookList.userMenu).forEach(o =>
	                {
	                    let info = o.creater({ uid });
	                    if (!info)
	                        return;
	                    selectHolderBox.appendChild(
	                        createIiroseMenuElement(
	                            `mdi-${info.icon}`,
	                            info.text,
	                            async e =>
	                            {
	                                e.stopPropagation();
	                                o.callback({ uid });
	                            }
	                        ).element
	                    );
	                });
	                return true;
	            }
	            return false;
	        });
	    }
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

	    // 添加菜单ui
	    addMenuHook(
	        "userMark",
	        "userMenu",
	        e =>
	        {
	            let oldRemarkName = storageContext.roaming.userRemark[e.uid];
	            return {
	                icon: "account-cog",
	                text: `设置备注${oldRemarkName ? `(${oldRemarkName})` : ""}`
	            };
	        },
	        async (e) =>
	        {
	            let oldRemarkName = storageContext.roaming.userRemark[e.uid];
	            let newRemark = await showInputBox("设置备注", `给 ${e.uid} 设置备注`, true, (oldRemarkName ? oldRemarkName : ""));
	            if (newRemark != undefined)
	            {
	                storageContext.roaming.userRemark[e.uid] = newRemark;
	                storageRoamingSave();
	            }
	        }
	    );
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
	                    overflowY: "auto",
	                    scrollbarWidth: "none",
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

	async function showBlacklistMenu()
	{
	    /**
	     * @param {string} targetUid
	     * @param {string | undefined} targetUserName
	     */
	    function showAccountMenu(targetUid, targetUserName)
	    {
	        showMenu([
	            NList.getElement([
	                "移出黑名单",
	                new NEvent("click", () =>
	                {
	                    showSetBlacklistDialog(targetUid, true);
	                })
	            ])
	        ]);
	    }

	    showMenu([
	        NList.getElement([
	            "设置自动回复内容",
	            new NEvent("click", async () =>
	            {
	                let oldValue = storageContext.roaming.blacklistAutoReply;
	                let value = await showInputBox("自定义自动回复", "输入黑名单用户私聊的自动回复内容\n留空关闭自动回复", true, oldValue);
	                if (value != undefined && oldValue != value)
	                {
	                    storageContext.roaming.blacklistAutoReply = value;
	                    storageRoamingSave();
	                    if (value == "")
	                        showNotice("黑名单", "已关闭黑名单自动回复");
	                    else
	                        showNotice("黑名单", "已更新黑名单自动回复内容");
	                }
	            }),
	        ]),
	        NList.getElement([
	            "[ 添加黑名单 ]",
	            new NEvent("click", async () =>
	            {
	                let uid = await showInputBox("添加黑名单", "输入目标的唯一标识", true);
	                if (uid != undefined)
	                {
	                    let myUid = forgeApi.operation.getUserUid();
	                    if (uid != myUid)
	                        showSetBlacklistDialog(uid, false);
	                    else
	                        showNotice("黑名单", `不能添加此账号本身`);
	                }
	            }),
	        ]),
	        ...(Array.from(storageContext.processed.uidBlacklistSet).map(uid =>
	        {
	            let userInfo = forgeApi.operation.getOnlineUserInfoById(uid);
	            return NList.getElement([
	                `${uid}${userInfo ? ` (${userInfo.name})` : ""}`,
	                new NEvent("click", async () =>
	                {
	                    showAccountMenu(uid, userInfo?.name);
	                }),
	            ]);
	        }))
	    ]);
	}

	/**
	 * 显示设置用户黑名单的对话框 (加入或移出黑名单)
	 * @param {string} uid
	 * @param {boolean} removeFromBlacklist
	 */
	async function showSetBlacklistDialog(uid, removeFromBlacklist)
	{
	    let action = (removeFromBlacklist ? "移出黑名单" : "加入黑名单");
	    let userInfo = forgeApi.operation.getOnlineUserInfoById(uid);

	    if (await showInfoBox(action, `确定将用户 ${uid}${userInfo ? `(${userInfo.name})` : ""}\n${action}吗?`, true))
	    {
	        if (removeFromBlacklist)
	            storageContext.processed.uidBlacklistSet.delete(uid);
	        else
	            storageContext.processed.uidBlacklistSet.add(uid);
	        storageRoamingSave();
	        showNotice("黑名单", `已将用户 ${uid}${userInfo ? `(${userInfo.name})` : ""} ${action}`);
	    }
	}

	/**
	 * 启用黑名单
	 */
	function enableBlacklist()
	{
	    // 添加菜单ui
	    addMenuHook(
	        "blacklist",
	        "userMenu",
	        e =>
	        {
	            let isInBlacklist = storageContext.processed.uidBlacklistSet.has(e.uid);
	            if (e.uid != forgeApi.operation.getUserUid() || isInBlacklist)
	                return {
	                    icon: (isInBlacklist ? "account-lock-open-outline" : "account-cancel-outline"),
	                    text: (isInBlacklist ? "此人已在黑名单中" : "添加到黑名单")
	                };
	            else
	                return null;
	        },
	        async (e) =>
	        {
	            let isInBlacklist = storageContext.processed.uidBlacklistSet.has(e.uid);
	            showSetBlacklistDialog(e.uid, isInBlacklist);
	        }
	    );

	    // 聊天消息列表节点(房间消息)
	    let msgBox = iframeContext.iframeDocument.getElementsByClassName("msgholderBox")[0];
	    Array.from(msgBox.children).forEach(o =>
	    { // 处理已有的消息
	        try
	        {
	            let messageElement = /** @type {HTMLElement} */(o);
	            if (messageElement.classList.length == 1 && messageElement.classList.item(0) == "msg")
	            { // 发送的消息
	                let uid = (
	                    messageElement.dataset.id ?
	                        messageElement.dataset.id.split("_")[0] :
	                        (/** @type {HTMLElement} */(domPath(messageElement, [0, -1, 0])))?.dataset?.uid
	                );
	                if (uid && messageNeedBlock(uid))
	                    o.remove();
	            }
	            if (messageElement.classList.length == 2 && messageElement.classList.contains("pubMsgSystem"))
	            { // 系统消息
	                let uid = (/** @type {HTMLElement} */(domPath(messageElement, [0, 0])))?.dataset?.uid;
	                if (!uid)
	                    uid = (/** @type {HTMLElement} */(domPath(messageElement, [0, 0, 0])))?.dataset?.uid;
	                if (uid && messageNeedBlock(uid))
	                    o.remove();
	            }
	        }
	        catch (err)
	        {
	            console.error(err);
	        }
	    });
	    Array.from(msgBox.children).forEach((o, index, childArray) =>
	    { // 处理多个消息时间相邻
	        try
	        {
	            let messageElement = /** @type {HTMLElement} */(o);
	            if (messageElement.classList.length == 1 && messageElement.classList.item(0) == "pubMsgTime")
	            { // 消息时间
	                if (
	                    index == childArray.length - 1 ||
	                    childArray[index + 1]?.classList?.contains("pubMsgTime")
	                )
	                    o.remove();
	            }
	        }
	        catch (err)
	        {
	            console.error(err);
	        }
	    });
	}

	/**
	 * 测试消息是否需要屏蔽
	 * @param {string} uid
	 * @param {string} [message]
	 * @param {string} [userName]
	 * @returns {boolean}
	 */
	function messageNeedBlock(uid, message = "", userName = "")
	{
	    if (forgeApi.operation.getUserUid() == uid)
	        return false;
	    return storageContext.processed.uidBlacklistSet.has(uid);
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
	     * @param {(restStr: string, srcStr: string) => any} callback
	     */
	    addPath(pathStr, callback)
	    {
	        this.#root.addPath(pathStr, 0, callback);
	    }

	    /**
	     * 匹配前缀
	     * @param {string} str
	     * @returns {any}
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
	     * @type {(restStr: string, srcStr:string) => any}
	     */
	    #callback = null;

	    /**
	     * 添加路径
	     * @param {string} pathStr
	     * @param {number} pathInd
	     * @param {(restStr: string, srcStr:string) => any} callback
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
	     * @returns {any}
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
	        roomForgePacket: new EventHandler$1(),
	        /**
	         * 接收到私聊的由forge本身发送的forge数据包
	         * @type {EventHandler<{ senderId: string, senderName: string, content: Object }>}
	         */
	        privateForgePacket: new EventHandler$1(),
	        /**
	         * 接收到自己发给自己的由forge本身发送的forge数据包
	         * @type {EventHandler<{ content: Object }>}
	         */
	        selfPrivateForgePacket: new EventHandler$1(),
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

	/**
	 * @param {string} data
	 */
	function setPackageData(data)
	{
	    packageData[0] = data;
	}

	toClientTrie.addPath(`"`, (data) => // 房间消息
	{
	    packageData[0] = `"` + data.split("<").reverse().map(data =>
	    {
	        let part = data.split(">");
	        // console.log(part);
	        let senderId = part[8];
	        let senderName = htmlSpecialCharsDecode(part[2]);
	        let content = part[3];

	        if (part[4] != "s" && content[0] != `'`)
	        {

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

	        if (messageNeedBlock(senderId, content, senderName))
	            return undefined;

	        return data;
	    }).filter(o => o != undefined).reverse().join("<");
	});

	toClientTrie.addPath(`""`, (data) => // 私聊消息
	{
	    let userId = forgeApi.operation.getUserUid();
	    packageData[0] = `""` + data.split("<").map(data =>
	    {
	        let part = data.split(">");

	        let senderId = part[1];
	        let senderName = htmlSpecialCharsDecode(part[2]);
	        let content = part[4];
	        let receiverId = part[11];

	        if (part[6] == "")
	        {
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
	            else if (senderId == userId && receiverId != userId)
	            {
	                let forgePacket = readForgePacket(content, senderId);
	                if (forgePacket != undefined)
	                    return undefined;
	            }

	            if (messageNeedBlock(senderId, content, senderName))
	            {
	                if (storageContext.roaming.blacklistAutoReply)
	                    forgeApi.operation.sendPrivateMessageSilence(senderId, `[自动回复] ${storageContext.roaming.blacklistAutoReply}`);
	                return undefined;
	            }
	        }

	        if (messageNeedBlock(senderId, content, senderName))
	            return undefined;

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
	 * 启用美化功能
	 */
	async function enableBeautify()
	{
	    let styleStr = "";
	    await delayPromise(1100);
	    ([
	        { // 侧边栏顶部图片
	            key: "sidebarTopPicture",
	            cb: (/** @type {string} */ o) =>
	            {
	                let imgElement = /** @type {HTMLImageElement} */(domPath(iframeContext.iframeDocument?.getElementById("functionHolderImg"), [0, 0]));
	                if (imgElement)
	                    imgElement.src = o;
	            }
	        },
	        { // 侧边栏列表背景图片
	            key: "sidebarListPicture",
	            cb: (/** @type {string} */ o) =>
	            {
	                let functionHolder = iframeContext.iframeDocument?.getElementById("functionHolder");
	                if (functionHolder)
	                {
	                    functionHolder.style.backgroundImage = `url("${o}")`;
	                    functionHolder.style.backgroundSize = `cover`;
	                    functionHolder.style.backgroundPosition = `top ${functionHolder.children[0].children[0]["style"].height} left 0px`;
	                    Array.from(functionHolder.children[0].children).forEach((/** @type {HTMLElement} */ o) =>
	                    {
	                        if (o.classList.contains("functionItemBox"))
	                            o.style.backgroundColor = "rgba(127, 127, 127, 0.1)";
	                        else
	                            o.style.backgroundColor = "transparent";
	                    });
	                    styleStr += ([
	                        ".functionButtonGroup:hover, .functionButton:hover",
	                        "{",
	                        "background: rgba(127, 127, 127, 0.3) !important;",
	                        "}",
	                    ]).join("\n");
	                }
	            }
	        },
	        { // 选择菜单背景图片
	            key: "selectMenuBackground",
	            cb: (/** @type {string} */ o) =>
	            {
	                let selectHolderBox = iframeContext.iframeDocument?.getElementById("selectHolderBox");
	                if (selectHolderBox)
	                {
	                    selectHolderBox.style.backgroundImage = `url("${o}")`;
	                    selectHolderBox.style.backgroundSize = `cover`;
	                }
	            }
	        },
	        { // 选择菜单圆角半径
	            key: "selectMenuBorderRadius",
	            cb: (/** @type {string} */ o) =>
	            {
	                let selectHolderBox = iframeContext.iframeDocument?.getElementById("selectHolderBox");
	                if (selectHolderBox)
	                {
	                    selectHolderBox.style.borderRadius = o + "px";
	                }
	            }
	        },
	        { // 消息图片圆角半径
	            key: "messageImgBorderRadius",
	            cb: (/** @type {string} */ o) =>
	            {
	                styleStr += ([
	                    ".roomChatContentBox img, .privatemsgMessagesBodyItemBodyBox img",
	                    "{",
	                    `border-radius: ${o}px !important;`,
	                    "}",
	                ]).join("\n");
	            }
	        },
	        { // 消息头像圆角半径
	            key: "messageAvatarBorderRadius",
	            cb: (/** @type {string} */ o) =>
	            {
	                styleStr += ([
	                    ".msgavatar, .msgavatar img, .privatemsgMessagesBodyItem .privatemsgMessagesBodyItemIcon, .privatemsgMessagesBodyItem .privatemsgMessagesBodyItemIcon img",
	                    "{",
	                    `border-radius: ${o}px !important;`,
	                    "}",
	                ]).join("\n");
	            }
	        },
	        { // 系统消息圆角半径
	            key: "systemMessageBorderRadius",
	            cb: (/** @type {string} */ o) =>
	            {
	                styleStr += ([
	                    ".pubMsgSystem span",
	                    "{",
	                    `border-radius: ${o}px !important;`,
	                    "}",
	                ]).join("\n");
	            }
	        },
	        { // 系统消息图片圆角半径
	            key: "systemMessageImgBorderRadius",
	            cb: (/** @type {string} */ o) =>
	            {
	                styleStr += ([
	                    ".pubMsgSystem .pubMsgSystemIcon, .pubMsgSystem img",
	                    "{",
	                    `border-radius: ${o}px !important;`,
	                    "}",
	                ]).join("\n");
	            }
	        },
	        { // 会话列表项目圆角半径
	            key: "sessionListItemBorderRadius",
	            cb: (/** @type {string} */ o) =>
	            {
	                styleStr += ([
	                    ".sessionHolderPmTaskBoxItem, .sessionHolderPmTaskBoxItem img",
	                    "{",
	                    `border-radius: ${o}px !important;`,
	                    "}",
	                ]).join("\n");
	            }
	        },
	        { // 面板项圆角半径
	            key: "panelItemBorderRadius",
	            cb: (/** @type {string} */ o) =>
	            {
	                styleStr += ([
	                    "#panelHolder .shopItem, #panelHolder img, .contentItemContent :is(.commonBox, .commonBox .commonBoxHead, .commonBox .shopItemColor, .cardTag)",
	                    "{",
	                    `border-radius: ${o}px !important;`,
	                    "}",
	                ]).join("\n");
	            }
	        },
	        { // 提示框背景图片
	            key: "alertBackground",
	            cb: (/** @type {string} */ o) =>
	            {
	                styleStr += ([
	                    "#alertHolder > div",
	                    "{",
	                    `background-image: url("${o}") !important;`,
	                    `background-size: cover !important;`,
	                    "}",
	                ]).join("\n");
	            }
	        },
	        { // 会话消息圆角半径
	            key: "sessionMessageBorderRadius",
	            cb: (/** @type {string} */ o) =>
	            {
	                styleStr += ([
	                    // 公屏
	                    ".room_chat_content",
	                    "{",
	                    `border-radius: ${o}px;`,
	                    "}",

	                    `.room_chat_content[style*="border-right"]`,
	                    "{",
	                    `border-radius: ${o}px ${o}px 0 ${o}px;`,
	                    "}",

	                    `.room_chat_content[style*="border-right"] .systemCardMediaShareImg`,
	                    "{",
	                    `border-radius: ${o}px 0 0 ${o}px`,
	                    "}",

	                    ".chatContentHolder:not(.publicMsgHasBubble)",
	                    "{",
	                        `border-radius: ${o}px;`,
	                        "overflow: hidden;",
	                    "}",

	                    `.room_chat_content[style*="border-right"]>div[style*="top:0;bottom:0;right:-6px;"]>div`,
	                    "{",
	                    `width: ${o}px !important;`,
	                    `border-radius: 0 ${o}px 0 0;`,
	                    "}",

	                    `.room_chat_content[style*="border-right"]>div[style*="top:0;bottom:0;right:-6px;"]>svg`,
	                    "{",
	                    "right:-7.5px !important;",
	                    "}",

	                    `.room_chat_content[style*="border-left"]`,
	                    "{",
	                    "overflow: visible;",
	                    `border-radius: ${o}px ${o}px ${o}px 0;`,
	                    "}",

	                    `.room_chat_content[style*="border-left"] .systemCardMediaShareImg`,
	                    "{",
	                    `border-radius: 0 ${o}px ${o}px 0`,
	                    "}",

	                    `.room_chat_content[style*="border-left"]>div[style*="top:0;bottom:0;left:-6px;"]>div`,
	                    "{",
	                    `width: ${o}px !important;`,
	                    `border-radius: ${o}px 0 0 0;`,
	                    "}",

	                    // 私聊
	                    ".privateMsgNoBubble",
	                    "{",
	                    `border-radius: ${o}px;`,
	                    "overflow: hidden;",
	                    "}",

	                    ".privatemsgMessagesBodyItemBodyBG",
	                    "{",
	                    `border-radius: ${o}px;`,
	                    "}",

	                    `.privatemsgMessagesBodyItemBodyBG[style*="border-right"]`,
	                    "{",
	                    "overflow: visible;",
	                    `border-radius: ${o}px ${o}px 0 ${o}px;`,
	                    "}",

	                    `.privatemsgMessagesBodyItemBodyBG[style*="border-right"]>div[style*="right:-6px;top:0;bottom:0;"]>div`,
	                    "{",
	                    `width: ${o}px !important;`,
	                    `border-radius: 0 ${o}px 0 0;`,
	                    "}",

	                    `.privatemsgMessagesBodyItemBodyBG[style*="border-right"]>div[style*="right:-6px;top:0;bottom:0;"]>svg`,
	                    "{",
	                    "right:-7.5px !important;",
	                    "}",

	                    `.privatemsgMessagesBodyItemBodyBG[style*="border-left"]`,
	                    "{",
	                    `border-radius: ${o}px ${o}px ${o}px 0;`,
	                    "}",

	                    `.privatemsgMessagesBodyItemBodyBG[style*="border-left"]>div[style*="left:-6px;top:0;bottom:0;"]>div`,
	                    "{",
	                    `width: ${o}px !important;`,
	                    `border-radius: ${o}px 0 0 0;`,
	                    "}",

	                ]).join("\n");
	            }
	        },
	    ]).forEach(o =>
	    {
	        let value = storageContext.roaming.beautify[o.key];
	        if (value)
	        {
	            try
	            {
	                o.cb(value);
	            }
	            catch (err)
	            {
	                console.error(err);
	            }
	        }
	    });

	    if (styleStr)
	    {
	        let styleElement = document.createElement("style");
	        styleElement.textContent = styleStr;
	        iframeContext.iframeDocument.body.appendChild(styleElement);
	    }
	}

	/**
	 * 显示美化菜单
	 */
	function showBeautifyMenu()
	{
	    showMenu([
	        ...(([
	            {
	                name: "侧边栏顶部图片",
	                key: "sidebarTopPicture",
	                type: "text"
	            },
	            {
	                name: "侧边栏列表背景图片",
	                key: "sidebarListPicture",
	                type: "text"
	            },
	            {
	                name: "选择菜单背景图片",
	                key: "selectMenuBackground",
	                type: "text"
	            },
	            {
	                name: "选择菜单圆角半径",
	                key: "selectMenuBorderRadius",
	                type: "number"
	            },
	            {
	                name: "消息图片圆角半径",
	                key: "messageImgBorderRadius",
	                type: "number"
	            },
	            {
	                name: "消息头像圆角半径",
	                key: "messageAvatarBorderRadius",
	                type: "number"
	            },
	            {
	                name: "系统消息圆角半径",
	                key: "systemMessageBorderRadius",
	                type: "number"
	            },
	            {
	                name: "系统消息图片圆角半径",
	                key: "systemMessageImgBorderRadius",
	                type: "number"
	            },
	            {
	                name: "会话消息圆角半径",
	                key: "sessionMessageBorderRadius",
	                type: "number"
	            },
	            {
	                name: "会话选择项圆角半径",
	                key: "sessionListItemBorderRadius",
	                type: "number"
	            },
	            {
	                name: "面板项圆角半径",
	                key: "panelItemBorderRadius",
	                type: "number"
	            },
	            {
	                name: "提示框背景图片",
	                key: "alertBackground",
	                type: "text"
	            },
	        ]).map(o => NList.getElement([
	            o.name + (storageContext.roaming.beautify[o.key] ? " (已设置)" : ""),
	            new NEvent("click", async () =>
	            {
	                let promptText = (o.type == "number" ? "填写一个数字" : "");
	                let oldValue = storageContext.roaming.beautify[o.key];

	                let value = await showInputBox("美化设置", `设置 ${o.name}${promptText ? "\n" + promptText : ""}`, true, (oldValue ? oldValue : ""));
	                if (value != undefined)
	                {
	                    if (value != "")
	                    {
	                        if (o.type == "number")
	                        {
	                            if (!Number.isFinite(Number(value)))
	                            {
	                                showNotice("美化设置", "设置的值不是一个数字");
	                                return;
	                            }
	                        }
	                        storageContext.roaming.beautify[o.key] = value;
	                        storageRoamingSave();
	                    }
	                    else
	                    {
	                        delete storageContext.roaming.beautify[o.key];
	                        storageRoamingSave();
	                    }
	                }
	            }),
	        ])))
	    ]);
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


	        iframeElementParent.appendChild(
	            
	            
	            
	            
	            
	            
	            
	            
	            
	            
	            
	            
	            
	            
	            
	            
	            
	            
	            
	            
	            
	            
	            
	            
	            
	            
	            
	            
	            
	            iframe);
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
	            e =>
	            {
	                let ox = 0, oy = 0;
	                let proc = (/** @type {{ sx: number, sy: number, x: number, y: number, pressing: boolean,hold: boolean }} */ o) =>
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
	            },

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
	 * 房间消息历史
	 * @type {Array<{
	 *  sender: string,
	 *  content: string
	 * }>}
	 */
	let roomMessageHistory = [{
	    sender: "系统",
	    content: `forge已加载 ${(new Date()).toLocaleString()}`
	}];
	/**
	 * 房间消息历史更新回调
	 * @type {(x: Array<{
	 *  sender: string,
	 *  content: string
	 * }>) => void}
	 */
	let newRoomMessageHistoryCB = null;

	/**
	 * 设置监视的操作者
	 * @param {(x: Array<{
	 *  sender: string,
	 *  content: string
	 * }>) => void} callback
	 */
	function setMonitorOperator(callback)
	{
	    if (callback)
	    {
	        callback(roomMessageHistory.slice(-100));
	        newRoomMessageHistoryCB = callback;
	    }
	    else
	        newRoomMessageHistoryCB = null;
	}


	let enabledMonitor = false;

	/**
	 * 启用监视
	 * 允许跨账号查看房间消息
	 */
	function enableMonitor()
	{
	    if (enabledMonitor)
	        return;
	    enabledMonitor = true;

	    let lastRoomId = "";
	    let lastRoomName = "";

	    /**
	     * @param {{ senderName: string, content: string }} e
	     */
	    function onNewRoomMessage(e)
	    {
	        let newHistory = [];
	        let nowRoomId = forgeApi.operation.getUserRoomId();
	        if (nowRoomId != lastRoomId)
	        {
	            let nowRoomName = forgeApi.operation.getRoomInfoById(nowRoomId)?.name;
	            newHistory.push({
	                sender: "系统",
	                content: `房间切换 ${lastRoomName}->${nowRoomName ? nowRoomName : nowRoomId}`
	            });
	            lastRoomId = nowRoomId;
	            lastRoomName = nowRoomName;
	        }

	        newHistory.push({
	            sender: e.senderName,
	            content: e.content
	        });

	        if (newHistory.length > 0)
	        {
	            roomMessageHistory.push(...newHistory);
	            while (roomMessageHistory.length >= 500)
	                roomMessageHistory.shift();
	            if (newRoomMessageHistoryCB)
	                newRoomMessageHistoryCB(newHistory);
	        }
	    }

	    forgeApi.event.roomMessage.add(o =>
	    {
	        onNewRoomMessage(o);
	    });
	}

	/**
	 * @type {ReturnType<createPlugWindow>}
	 */
	let monitorWindow = null;
	/**
	 * @type {Window}
	 */
	let monitorContextWindow = null;
	/**
	 * @type {NElement}
	 */
	let monitorMessageContainer = null;
	/**
	 * @type {NElement<HTMLInputElement>}
	 */
	let monitorInput = null;
	/**
	 * @type { (x: string) => void }
	 */
	let monitorSendMessageCB = null;

	/**
	 * 创建监视器窗口
	 */
	async function showMonitorWindow()
	{
	    if (!monitorWindow)
	    {
	        monitorWindow = createPlugWindow(true);
	        monitorWindow.iframe.element.src = "about:blank";
	        await (new Promise(resolve =>
	        {
	            monitorWindow.iframe.addEventListener("load", () => { resolve(); });
	        }));
	        monitorContextWindow = monitorWindow.iframe.element.contentWindow;
	        let body = getNElement(monitorContextWindow.document.body);
	        body.setStyles({
	            margin: "0",
	            position: "absolute",
	            left: "0",
	            top: "0",
	            width: "100%",
	            height: "100%",
	        });

	        body.addChild(NList.getElement([
	            createNStyleList({
	                position: "absolute",
	                left: "0",
	                top: "0",
	                width: "100%",
	                height: "100%",
	            }),

	            monitorMessageContainer = NList.getElement([
	                createNStyleList({
	                    position: "absolute",
	                    left: "0",
	                    top: "0",
	                    width: "100%",
	                    bottom: "27px",
	                    whiteSpace: "pre-wrap",
	                    wordBreak: "break-all",
	                    color: "white",
	                    overflow: "auto",
	                    scrollbarWidth: "thin",
	                    scrollbarColor: "rgb(120, 120, 120) rgb(160, 160, 160)"
	                })
	            ]),

	            monitorInput = NList.getElement([
	                new NTagName("input"),
	                new NAttr("type", "text"),
	                new NAttr("placeholder", "远程发送"),
	                new NAttr("size", "1000"),

	                createNStyleList({
	                    position: "absolute",
	                    left: "0",
	                    bottom: "0",
	                    width: "100%",
	                    height: "27px",
	                    lineHeight: "27px",
	                    backgroundColor: cssG.rgb(150, 150, 150, 0.3),
	                    color: cssG.rgb(255, 255, 255)
	                }),

	                new NEvent("keydown", (e, ele) =>
	                {
	                    if (e.key == "Enter")
	                    {
	                        e.stopPropagation();
	                        e.preventDefault();
	                        if (monitorSendMessageCB)
	                        {
	                            let value = ele.element.value;
	                            ele.element.value = "";
	                            monitorSendMessageCB(value);
	                        }
	                    }
	                })
	            ])
	        ]));
	    }
	    monitorWindow.windowElement.setDisplay("block");
	    monitorWindow.windowElement.setStyle("pointerEvents", "auto");
	}

	/**
	 * 监视器窗口清空消息
	 */
	function monitorClearMessage()
	{
	    if (!monitorMessageContainer)
	        return;
	    monitorMessageContainer.removeChilds();
	}

	/**
	 * 监视器窗口添加消息
	 * @param {Array<{
	 *  sender: string,
	 *  content: string
	 * }>} messages
	 */
	function monitorAddMessage(messages)
	{
	    if (!monitorMessageContainer)
	        return;
	    monitorMessageContainer.addChilds(messages.map(o => NList.getElement([
	        createNStyleList({
	            margin: "2px",
	            border: "1.5px rgba(255, 255, 255, 0.5) solid",
	            padding: "3px"
	        }),
	        `${o.sender}: ${o.content}`,
	    ])));
	}

	/**
	 * 设置监视器窗口中的文本框占位提示文本
	 * @param {string} text
	 */
	function monitorSetPlaceholderText(text)
	{
	    if (!monitorInput)
	        return;
	    monitorInput.element.placeholder = text;
	}

	/**
	 * 监视器窗口绑定发送消息回调
	 * @param { (x: string) => void } sendCB
	 */
	function monitorBindSendCB(sendCB)
	{
	    monitorSendMessageCB = sendCB;
	}

	let waitForId$2 = "";
	let monitorId = "";
	let monitorUserId = "";

	async function showMultiAccountMenu()
	{
	    /**
	     * @param {string} targetUid
	     * @param {string | undefined} targetUserName
	     */
	    function showAccountMenu(targetUid, targetUserName)
	    {
	        showMenu([
	            NList.getElement([
	                "拉取此账号的配置",
	                new NEvent("click", () =>
	                {
	                    showNotice("多账户", "正在尝试获取配置");
	                    let requestId = uniqueIdentifierString$2();
	                    forgeApi.operation.sendPrivateForgePacket(targetUid, {
	                        plug: "forge",
	                        type: "multiAccount",
	                        option: "syncConfigRQ",
	                        id: requestId
	                    });
	                    waitForId$2 = requestId;
	                })
	            ]),
	            NList.getElement([
	                "戴上他的眼睛",
	                new NEvent("click", () =>
	                {
	                    if (monitorId)
	                    {
	                        forgeApi.operation.sendPrivateForgePacket(monitorUserId, {
	                            plug: "forge",
	                            type: "multiAccount",
	                            option: "monitorQuit",
	                            id: monitorId
	                        });
	                        monitorId = "";
	                        monitorUserId = "";
	                    }

	                    showNotice("多账户", `正在连接 ${targetUid}`);
	                    monitorId = uniqueIdentifierString$2();
	                    monitorUserId = targetUid;
	                    forgeApi.operation.sendPrivateForgePacket(targetUid, {
	                        plug: "forge",
	                        type: "multiAccount",
	                        option: "monitorRQ",
	                        id: monitorId
	                    });

	                    showMonitorWindow();
	                    monitorClearMessage();
	                    monitorBindSendCB(o =>
	                    {
	                        if (o)
	                            forgeApi.operation.sendPrivateForgePacket(monitorUserId, {
	                                plug: "forge",
	                                type: "multiAccount",
	                                option: "monitorSend",
	                                id: monitorId,
	                                content: o
	                            });
	                    });
	                    monitorSetPlaceholderText("正在连接中");
	                })
	            ]),
	            NList.getElement([
	                "前往我所在的房间",
	                new NEvent("click", () =>
	                {
	                    showNotice("多账户", "正在发送命令");
	                    forgeApi.operation.sendPrivateForgePacket(targetUid, {
	                        plug: "forge",
	                        type: "multiAccount",
	                        option: "switchRoom",
	                        roomId: forgeApi.operation.getUserRoomId()
	                    });
	                })
	            ]),
	            NList.getElement([
	                "下线",
	                new NEvent("click", async () =>
	                {
	                    if (await showInfoBox("远程下线", "确认发送下线指令吗?\n您必须手动重新上线此账号", true))
	                    {
	                        showNotice("多账户", "正在发送命令");
	                        forgeApi.operation.sendPrivateForgePacket(targetUid, {
	                            plug: "forge",
	                            type: "multiAccount",
	                            option: "quit"
	                        });
	                    }
	                })
	            ]),
	            NList.getElement([
	                "移除账号",
	                new NEvent("click", () =>
	                {
	                    storageContext.processed.myAccountSet.delete(targetUid);
	                    storageContext.roaming.myAccountList = storageContext.roaming.myAccountList.filter(o => o != targetUid);
	                    storageRoamingSave();
	                    showNotice("绑定账号", `目标账号(${targetUid})与当前账号(${forgeApi.operation.getUserUid()})的单向绑定已解除`);
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
	                        storageContext.processed.myAccountSet.add(uid);
	                        storageContext.roaming.myAccountList.push(uid);
	                        storageRoamingSave();
	                        showNotice("绑定账号", `你需要同时在目标账号(${uid})上绑定当前账号(${myUid})来完成反向绑定`);
	                    }
	                    else
	                        showNotice("无法绑定", `不能绑定此账号本身`);
	                }
	            }),
	        ]),
	        ...(
	            monitorId ?
	                [
	                    NList.getElement([
	                        "正在戴着的眼睛",
	                        new NEvent("click", () =>
	                        {
	                            showMonitorWindow();
	                        })
	                    ]),
	                    NList.getElement([
	                        "停止戴着眼睛",
	                        new NEvent("click", () =>
	                        {
	                            monitorBindSendCB(null);
	                            monitorAddMessage([{
	                                sender: "系统",
	                                content: "您已断开远程连接"
	                            }]);
	                            forgeApi.operation.sendPrivateForgePacket(monitorUserId, {
	                                plug: "forge",
	                                type: "multiAccount",
	                                option: "monitorQuit",
	                                id: monitorId
	                            });
	                            monitorId = "";
	                            monitorUserId = "";
	                            monitorSetPlaceholderText("已断开");
	                        })
	                    ])
	                ] :
	                []
	        ),
	        ...(storageContext.roaming.myAccountList.map(uid =>
	        {
	            let userInfo = forgeApi.operation.getOnlineUserInfoById(uid);
	            return NList.getElement([
	                `${uid}${userInfo ? ` (${userInfo.name})` : ""}`,
	                new NEvent("click", async () =>
	                {
	                    showAccountMenu(uid, userInfo?.name);
	                }),
	            ]);
	        }))
	    ]);
	}


	let monitorOperatorStartTime = 0;
	let monitorOperatorId = "";
	let monitorOperatorUserId = "";
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
	            if (!storageContext.processed.myAccountSet.has(e.senderId))
	                return;

	            let userInfo = forgeApi.operation.getOnlineUserInfoById(e.senderId);
	            let isCallback = false;

	            try
	            {
	                switch (e.content.option) // 远程指令类别
	                {
	                    case "switchRoom": { // 切换房间
	                        forgeApi.operation.changeRoom(e.content.roomId);
	                        break;
	                    }
	                    case "quit": { // 下线 (退出)
	                        setTimeout(() =>
	                        {
	                            let reload = iframeContext.iframeWindow?.location?.reload?.bind(iframeContext.iframeWindow.location);
	                            iframeContext.iframeBody?.addChild(NList.getElement([
	                                createNStyleList({
	                                    position: "absolute",
	                                    left: "0",
	                                    top: "0",
	                                    width: "100%",
	                                    height: "100%",
	                                    zIndex: "9999999",
	                                    backgroundColor: "rgb(28, 28, 28)",
	                                    cursor: "default",
	                                    whiteSpace: "pre-wrap",
	                                    textAlign: "center",
	                                    color: "rgb(255, 255, 255)"
	                                }),

	                                [
	                                    createNStyleList({
	                                        position: "absolute",
	                                        inset: "0 0 0 0",
	                                        height: "fit-content",
	                                        width: "fit-content",
	                                        margin: "auto",
	                                        backgroundColor: "rgb(21, 21, 21)",
	                                        padding: "10px",
	                                        borderRadius: "3px"
	                                    }),

	                                    `已通过远程指令下线\n下线时间: ${(new Date()).toLocaleString()}\n点击恢复`,
	                                    new NEvent("click", () =>
	                                    {
	                                        reload();
	                                    })
	                                ]
	                            ]));
	                            iframeContext.iframeWindow["Utils"]?.service?.saveStatus?.(0);
	                            if (iframeContext.socket)
	                            {
	                                try
	                                {
	                                    iframeContext.socket.onclose = null;
	                                    iframeContext.socket.onerror = null;
	                                    iframeContext.socket.send = () => { };
	                                    iframeContext.socket.onmessage = () => { };
	                                    iframeContext.socket?.close();
	                                }
	                                catch (err)
	                                {
	                                    console.error(err);
	                                }
	                            }
	                            iframeContext.iframeWindow.addEventListener("keydown", e => e.stopImmediatePropagation(), true);
	                            iframeContext.iframeWindow.addEventListener("keyup", e => e.stopImmediatePropagation(), true);
	                            iframeContext.iframeWindow.addEventListener("keypress", e => e.stopImmediatePropagation(), true);
	                            iframeContext.iframeWindow.addEventListener("mousemove", e => e.stopImmediatePropagation(), true);
	                            iframeContext.iframeWindow.addEventListener("mousedown", e => e.stopImmediatePropagation(), true);
	                            iframeContext.iframeWindow.addEventListener("mouseup", e => e.stopImmediatePropagation(), true);
	                            if (iframeContext.iframeWindow.location)
	                                iframeContext.iframeWindow.location["_reload"] = () => { };
	                        }, 1000);
	                        break;
	                    }
	                    case "syncConfigRQ": { // 请求拉取远程配置
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
	                    case "syncConfigCB": { // 收到请求的配置
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
	                    case "monitorRQ": { // 监视开始请求
	                        let requestId = e.content.id;

	                        if (monitorOperatorId)
	                        {
	                            forgeApi.operation.sendPrivateForgePacket(monitorUserId, {
	                                plug: "forge",
	                                type: "multiAccount",
	                                option: "monitorQuit",
	                                id: monitorOperatorId
	                            });
	                        }

	                        monitorOperatorId = requestId;
	                        monitorOperatorUserId = e.senderId;
	                        monitorOperatorStartTime = Date.now();

	                        setMonitorOperator(o =>
	                        {
	                            if (Date.now() > monitorOperatorStartTime + 12 * 60 * 60 * 1000)
	                            {
	                                setMonitorOperator(null);
	                                monitorOperatorId = "";
	                                monitorOperatorUserId = "";
	                                return;
	                            }
	                            forgeApi.operation.sendPrivateForgePacket(e.senderId, {
	                                plug: "forge",
	                                type: "multiAccount",
	                                option: "monitorCB",
	                                id: requestId,
	                                messages: o
	                            });
	                        });
	                        break;
	                    }
	                    case "monitorSend": { // 监视发送信息
	                        let requestId = e.content.id;
	                        if (requestId == monitorOperatorId)
	                        {
	                            forgeApi.operation.sendRoomMessage(e.content.content);
	                        }
	                        break;
	                    }
	                    case "monitorQuit": { // 断开监视
	                        let requestId = e.content.id;
	                        if (requestId == monitorOperatorId)
	                        {
	                            setMonitorOperator(null);
	                            monitorOperatorId = "";
	                            monitorOperatorUserId = "";
	                            showNotice("多账号", "多账号监视已断开");
	                        }
	                        else if (requestId == monitorId)
	                        {
	                            monitorBindSendCB(null);
	                            monitorAddMessage([{
	                                sender: "系统",
	                                content: "连接被远端断开"
	                            }]);
	                            monitorId = "";
	                            monitorUserId = "";
	                            monitorSetPlaceholderText("已断开");
	                        }
	                        isCallback = true;
	                        break;
	                    }
	                    case "monitorCB": { // 监视回调 (收到消息时)
	                        let requestId = e.content.id;
	                        if (requestId == monitorId)
	                        {
	                            monitorAddMessage(e.content.messages);
	                            monitorSetPlaceholderText(`使用 ${e.senderName} 发送消息`);
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

	let enabledAutoResponse = false;
	let autoResponseText = "";

	/**
	 * @param {typeof forgeApi.event.privateMessage extends EventHandler<infer T> ? T : never} e
	 */
	function onPrivateMessage(e)
	{
	    if (enabledAutoResponse && !messageNeedBlock(e.senderId))
	    {
	        setTimeout(() =>
	        {
	            forgeApi.operation.sendPrivateMessage(e.senderId, `[自动回复] ${autoResponseText}`);
	        }, 1.5 * 1000);
	        showNotice("勿扰模式", "您已开启勿扰模式\n将会发送自动回复消息\n点击关闭", undefined, () =>
	        {
	            setNotDisturbMode(false);
	        });
	    }
	}

	/**
	 * @param {typeof forgeApi.event.privateMessage extends EventHandler<infer T> ? T : never} e
	 */
	function onRoomMessage(e)
	{
	    if (
	        enabledAutoResponse &&
	        e.senderId != forgeApi.operation.getUserUid() &&
	        e.content.indexOf(` [*${forgeApi.operation.getUserName()}*] `) != -1 &&
	        !messageNeedBlock(e.senderId)
	    )
	    {
	        forgeApi.operation.sendRoomMessage(`[自动回复]  [*${e.senderName}*]  ${autoResponseText}`);
	        showNotice("勿扰模式", "您已开启勿扰模式\n将会发送自动回复消息\n点击关闭", undefined, () =>
	        {
	            setNotDisturbMode(false);
	        });
	    }
	}

	/**
	 * 设置自动回复
	 * @param {string | null} text
	 */
	function setAutoResponse(text)
	{
	    if (text != null)
	    {
	        autoResponseText = text;
	        if (!enabledAutoResponse)
	        {
	            enabledAutoResponse = true;
	            forgeApi.event.privateMessage.add(onPrivateMessage);
	            forgeApi.event.roomMessage.add(onRoomMessage);
	        }
	    }
	    else
	    {
	        if (enabledAutoResponse)
	        {
	            forgeApi.event.privateMessage.remove(onPrivateMessage);
	            forgeApi.event.roomMessage.remove(onRoomMessage);
	            enabledAutoResponse = false;
	        }
	    }
	}

	let notDisturbMode = false;

	/**
	 * 设置勿扰模式
	 * @param {boolean | "switch"} enable
	 */
	function setNotDisturbMode(enable)
	{
	    if (typeof (enable) == "boolean")
	        notDisturbMode = enable;
	    else if (enable == "switch")
	        notDisturbMode = !notDisturbMode;

	    if (notDisturbMode)
	    {
	        setAutoResponse(String(storageContext.roaming.notDisturbModeAutoReply));
	        showNotice("勿扰模式", `已开启勿扰模式\n私聊 和 @您的信息 将自动回复`);
	    }
	    else
	    {
	        setAutoResponse(null);
	        showNotice("勿扰模式", `已关闭勿扰模式`);
	    }
	}

	/**
	 * 显示勿扰模式菜单
	 */
	function showNotDisturbModeMenu()
	{
	    showMenu([

	        NList.getElement([
	            (notDisturbMode ? "关闭勿扰模式" : "打开勿扰模式"),
	            new NEvent("click", async () =>
	            {
	                setNotDisturbMode("switch");
	            }),
	        ]),

	        NList.getElement([
	            "设置勿扰自动回复内容",
	            new NEvent("click", async () =>
	            {
	                let oldValue = storageContext.roaming.notDisturbModeAutoReply;
	                let value = await showInputBox("自定义自动回复", "输入开启勿扰模式时私聊的自动回复内容", true, oldValue);
	                if (value != undefined && oldValue != value)
	                {
	                    storageContext.roaming.notDisturbModeAutoReply = value;
	                    storageRoamingSave();
	                    autoResponseText = value;
	                    showNotice("勿扰模式", "已更新免打扰自动回复文本");
	                }
	            }),
	        ])

	    ]);
	}

	/**
	 * 启用补丁
	 */
	async function enablePatch()
	{
	    await delayPromise(1100);
	    ([
	        {
	            key: "disableDoubleClickFullScreen",
	            cb: () =>
	            {
	                iframeContext.iframeBody.addEventListener("dblclick", e => e.stopPropagation());
	            }
	        },
	        {
	            key: "disableRightEdgeTrigger",
	            cb: () =>
	            {
	                Array.from(
	                    iframeContext.iframeDocument.getElementById("msgholderDisplay").children
	                ).some(o =>
	                {
	                    let onMouseEnterStr = o.getAttribute("onmouseenter");
	                    if (typeof (onMouseEnterStr) == "string" && onMouseEnterStr.indexOf("buttonProcesser(12)") != -1)
	                    {
	                        o.remove();
	                        return true;
	                    }
	                    return false;
	                });
	            }
	        },
	        {
	            key: "f5RefreshInside",
	            cb: () =>
	            {
	                iframeContext.iframeWindow?.addEventListener("keydown", e =>
	                {
	                    if (e.key == "F5")
	                    {
	                        e.preventDefault();
	                        e.stopPropagation();
	                        iframeContext.iframeWindow?.location?.reload?.();
	                    }
	                }, true);
	            }
	        }
	    ]).forEach(o =>
	    {
	        let value = storageContext.local.patch[o.key];
	        if (value)
	        {
	            try
	            {
	                o.cb();
	            }
	            catch (err)
	            {
	                console.error(err);
	            }
	        }
	    });
	}

	/**
	 * 显示补丁菜单
	 */
	function showPatchMenu()
	{
	    showMenu([
	        ...(([
	            {
	                name: "禁用双击全屏",
	                key: "disableDoubleClickFullScreen"
	            },
	            {
	                name: "禁用右侧边缘显示聊天列表",
	                key: "disableRightEdgeTrigger"
	            },
	            {
	                name: "F5键仅刷新iframe内侧",
	                key: "f5RefreshInside"
	            }
	        ]).map(o => NList.getElement([
	            (storageContext.local.patch[o.key] ? " (已启用)" : "(已禁用)") + o.name,
	            new NEvent("click", async () =>
	            {
	                let targetState = !storageContext.local.patch[o.key];
	                let confirm = await showInfoBox("设置补丁", `切换 ${o.name} 补丁到 ${targetState ? "启用" : "禁用"} 状态\n可能需要 重载 或 深度重载(刷新页面) 以生效`, true);
	                if (confirm)
	                {
	                    if (targetState)
	                        storageContext.local.patch[o.key] = targetState;
	                    else
	                        delete storageContext.local.patch[o.key];
	                    storageLocalSave();
	                }
	            }),
	        ])))
	    ]);
	}

	let waitForId$1 = "";
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
	    waitForId$1 = requestId;
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
	        if (waitForId$1)
	        {
	            if (
	                e.content.type == "syncPrivateChatRecordCB" &&
	                e.content.id == waitForId$1 &&
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
	                    {
	                        let content = nowRecord[2];
	                        if (!(content.startsWith("iiroseForge:") && content.endsWith(":end")))
	                            needSendRecords.push(nowRecord);
	                    }
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
	 * 用户年报生成
	 */
	async function reportGeneration()
	{
	    let record = getLocalRecordList();

	    let userUid = forgeApi.operation.getUserUid();
	    let statisticsStartTime = (new Date("2023/1/1")).getTime();
	    let statisticsEndTime = (new Date("2024/1/1")).getTime();
	    const oneDay = 24 * 60 * 60 * 1000;
	    let dayOfThisYear = Math.round((statisticsEndTime - statisticsStartTime) / oneDay);

	    let sendCount = 0;
	    let receiveCount = 0;
	    let sendCharCount = 0;
	    let receiveCharCount = 0;
	    /**
	     * @type {Map<string, {
	     *  targetName: string,
	     *  sendCount: number,
	     *  receiveCount: number,
	     *  nightMessageCount: number,
	     *  secondHalfOfTheYear: number,
	     *  continuousChatMaxDuration: number,
	     *  continuousChatMaxStartTime: number,
	     *  nightContinuousChatMaxDuration: number,
	     *  nightContinuousChatMaxStartTime: number,
	     * }>}
	     */
	    let sessionStatisticsMap = new Map();

	    /**
	     * 以每天的每半个小时分段
	     * @type {Array<{
	     *  count: 0,
	     *  isPeakTime: boolean
	     * }>}
	     */
	    let timePeriod = new Array(48).fill(0).map(() => ({ count: 0, isPeakTime: false }));
	    /**
	     * 以每半个月分段
	     * @type {Array<{
	     *  count: 0,
	     * }>}
	     */
	    let datePeriod = new Array(24).fill(0).map(() => ({ count: 0 }));
	    /**
	     * 以每天分段
	     * @type {Array<{
	     *  count: 0,
	     * }>}
	     */
	    let eachDay = new Array(400).fill(0).map(() => ({ count: 0 }));

	    let sessionCount = 0;

	    /**
	     * @type {Map<string, number>}
	     */
	    let sendContentCountMap = new Map();
	    /**
	     * @type {Map<string, number>}
	     */
	    let sendImageCountMap = new Map();

	    /**
	     * @type {Array<{
	     *  targetUid: string,
	     *  sendBySelf: boolean,
	     *  time: number,
	     *  content: string
	     * }>}
	     */
	    let allMessageMatch = [];

	    record.forEach(session =>
	    {
	        if (session.uid == userUid)
	            return;

	        let sessionObj = sessionStatisticsMap.get(session.uid);
	        if (!sessionObj)
	        {
	            sessionObj = {
	                targetName: session.name,
	                // 发出的消息
	                sendCount: 0,
	                // 收到的消息
	                receiveCount: 0,
	                // 夜间的消息数
	                nightMessageCount: 0,
	                // 后半年的消息数
	                secondHalfOfTheYear: 0,
	                // 最大持续聊天持续时间
	                continuousChatMaxDuration: 0,
	                // 最大持续聊天开始的时间
	                continuousChatMaxStartTime: 0,
	                // 夜间最大持续聊天持续时间
	                nightContinuousChatMaxDuration: 0,
	                // 夜间最大持续聊天开始的时间
	                nightContinuousChatMaxStartTime: 0,
	            };
	            sessionStatisticsMap.set(session.uid, sessionObj);
	        }

	        let hasRecordSendByMe = false;

	        let continuousChatStartTime = 0;
	        let lastReceivedTime = 0;
	        let lastSendByMeTime = 0;

	        session.records.forEach(rawRecord =>
	        {
	            let record = processSingleRecord(rawRecord);

	            let sendBySelf = record[0];
	            let time = record[1];
	            let content = record[2];

	            if (!(statisticsStartTime < time && time < statisticsEndTime))
	                return;

	            allMessageMatch.push({
	                sendBySelf,
	                content,
	                time,
	                targetUid: session.uid
	            });

	            // 打断连续聊天
	            if (time - lastReceivedTime > 20 * 60 * 1000 || time - lastSendByMeTime > 20 * 60 * 1000)
	            {
	                let continuousChatDuration = Math.max(0, Math.min(lastReceivedTime, lastSendByMeTime) - continuousChatStartTime);

	                if (continuousChatDuration > sessionObj.continuousChatMaxDuration)
	                {
	                    sessionObj.continuousChatMaxDuration = continuousChatDuration;
	                    sessionObj.continuousChatMaxStartTime = continuousChatStartTime;
	                }

	                if (
	                    continuousChatDuration > 50 * 60 * 1000 &&
	                    continuousChatDuration > sessionObj.nightContinuousChatMaxDuration &&
	                    (new Date(continuousChatStartTime)).getHours() <= 1
	                )
	                {
	                    sessionObj.nightContinuousChatMaxDuration = continuousChatDuration;
	                    sessionObj.nightContinuousChatMaxStartTime = continuousChatStartTime;
	                }

	                continuousChatStartTime = time;
	            }

	            if (sendBySelf)
	            {
	                lastSendByMeTime = time;
	                sendCount++;
	                sessionObj.sendCount++;
	                sendCharCount += Math.min(100, content.length);

	                hasRecordSendByMe = true;
	                if (content != "&")
	                {
	                    if (content.length < 500)
	                    {
	                        let imageUrl = content.match(/https?:\/\/[a-zA-Z0-9\.\_\-]+\/[a-zA-Z0-9\.\_\-\/\?\=\#\&]+?(\.(png|jpg|gif|jpeg|avif|webp))/)?.[0];
	                        if (imageUrl)
	                        {
	                            let oldValue = sendImageCountMap.get(imageUrl);
	                            if (oldValue == undefined)
	                                oldValue = 0;
	                            sendImageCountMap.set(imageUrl, oldValue + 1);
	                        }
	                        else if (content.length < 100)
	                        {
	                            let oldValue = sendContentCountMap.get(content);
	                            if (oldValue == undefined)
	                                oldValue = 0;
	                            sendContentCountMap.set(content, oldValue + 1);
	                        }
	                    }
	                }
	            }
	            else
	            {
	                lastReceivedTime = time;
	                receiveCount++;
	                sessionObj.receiveCount++;
	                receiveCharCount += Math.min(100, content.length);
	            }


	            let dateObj = new Date(time);

	            let timePeriodIndex = dateObj.getHours() * 2 + (dateObj.getMinutes() >= 30 ? 1 : 0);
	            if (0 <= timePeriodIndex && timePeriodIndex < timePeriod.length)
	            {
	                timePeriod[timePeriodIndex].count++;
	                if (0 <= timePeriodIndex && timePeriodIndex < 10)
	                    sessionObj.nightMessageCount++;
	            }

	            let datePeriodIndex = dateObj.getMonth() * 2 + (dateObj.getDate() >= 16 ? 1 : 0);
	            if (0 <= datePeriodIndex && datePeriodIndex < datePeriod.length)
	            {
	                datePeriod[datePeriodIndex].count++;
	                if (12 <= datePeriodIndex && datePeriodIndex < 24)
	                    sessionObj.secondHalfOfTheYear++;
	            }

	            let eachDayIndex = Math.floor((time - statisticsStartTime) / oneDay);
	            if (0 <= eachDayIndex && eachDayIndex < eachDay.length)
	            {
	                eachDay[eachDayIndex].count++;
	            }
	        });

	        {
	            let continuousChatDuration = Math.max(0, Math.min(lastReceivedTime, lastSendByMeTime) - continuousChatStartTime);

	            if (continuousChatDuration > sessionObj.continuousChatMaxDuration)
	            {
	                sessionObj.continuousChatMaxDuration = continuousChatDuration;
	                sessionObj.continuousChatMaxStartTime = continuousChatStartTime;
	            }
	        }

	        if (hasRecordSendByMe)
	            sessionCount++;
	    });

	    // 最喜欢发送的内容

	    let sendContentMaxContent = "";
	    let sendContentMaxValue = 0;
	    sendContentCountMap.forEach((count, content) =>
	    {
	        if (count > sendContentMaxValue)
	        {
	            sendContentMaxValue = count;
	            sendContentMaxContent = content;
	        }
	    });

	    // 最喜欢发送的图片

	    let sendImageMaxUrl = "";
	    let sendImageMaxValue = 0;
	    sendImageCountMap.forEach((count, url) =>
	    {
	        if (count > sendImageMaxValue)
	        {
	            sendImageMaxValue = count;
	            sendImageMaxUrl = url;
	        }
	    });

	    // 聊天数量排行

	    let sessionList = Array.from(sessionStatisticsMap.entries()).map(o => ({ targetUid: o[0], ...o[1] }));
	    sessionList.sort((a, b) =>
	    {
	        return (b.sendCount + b.receiveCount) - (a.sendCount + a.receiveCount);
	    });


	    // 夜间消息最多

	    let nightMessageMaxUid = "";
	    let nightMessageMaxValue = 0;
	    sessionList.forEach(o =>
	    {
	        if (o.nightMessageCount > nightMessageMaxValue)
	        {
	            nightMessageMaxValue = o.nightMessageCount;
	            nightMessageMaxUid = o.targetUid;
	        }
	    });

	    // 连续聊天最长

	    let continuousChatMaxUid = "";
	    let continuousChatMaxDuration = 0;
	    let continuousChatMaxStartTime = 0;
	    sessionList.forEach(o =>
	    {
	        if (o.continuousChatMaxDuration > continuousChatMaxDuration)
	        {
	            continuousChatMaxDuration = o.continuousChatMaxDuration;
	            continuousChatMaxStartTime = o.continuousChatMaxStartTime;
	            continuousChatMaxUid = o.targetUid;
	        }
	    });

	    // 后半年不再联系

	    let usedToChatUid = "";
	    for (let o of sessionList)
	    {
	        if (o.sendCount > 100 && o.receiveCount > 100 && o.secondHalfOfTheYear == 0)
	        {
	            usedToChatUid = o.targetUid;
	            break;
	        }
	    }
	    let usedToChatSession = usedToChatUid ? sessionStatisticsMap.get(usedToChatUid) : null;

	    // 聊得最晚

	    let nightContinuousChatMaxUid = "";
	    let nightContinuousChatMaxDuration = 0;
	    let nightContinuousChatMaxStartTime = 0;
	    sessionList.forEach(o =>
	    {
	        if (o.nightContinuousChatMaxDuration > nightContinuousChatMaxDuration)
	        {
	            nightContinuousChatMaxDuration = o.nightContinuousChatMaxDuration;
	            nightContinuousChatMaxStartTime = o.nightContinuousChatMaxStartTime;
	            nightContinuousChatMaxUid = o.targetUid;
	        }
	    });

	    // 最多同时聊天
	    allMessageMatch.sort((a, b) => a.time - b.time);
	    /** @type {Array<string>} */
	    let multipleChatMaxList = [];
	    let multipleChatMaxTime = 0;
	    /**
	     * @type {typeof allMessageMatch}
	     */
	    let messageQueue = [];
	    /**
	     * @type {Map<string, number>}
	     */
	    let messageInQueueCount = new Map();
	    for (let o of allMessageMatch)
	    {
	        if (o.sendBySelf)
	        {
	            messageQueue.push(o);

	            let oldValue = messageInQueueCount.get(o.targetUid);
	            if (oldValue == undefined)
	                oldValue = 0;
	            messageInQueueCount.set(o.targetUid, oldValue + 1);
	        }

	        while (messageQueue.length > 0 && messageQueue[0].time < o.time - (15 * 60 * 1000))
	        {
	            let shiftMessage = messageQueue.shift();
	            let oldValue = messageInQueueCount.get(shiftMessage.targetUid);
	            if (oldValue >= 2)
	                messageInQueueCount.set(shiftMessage.targetUid, oldValue - 1);
	            else
	                messageInQueueCount.delete(shiftMessage.targetUid);
	        }

	        if (messageInQueueCount.size > multipleChatMaxList.length)
	        {
	            multipleChatMaxList = Array.from(messageInQueueCount.keys());
	            multipleChatMaxTime = o.time;
	        }
	    }

	    console.log("-- 蔷薇年报 --");

	    sessionStatisticsMap.forEach(o =>
	    {
	        if (o.sendCount == 0 && o.receiveCount == 0)
	            return;
	        console.log(`(你与 ${o.targetName}) `, o);
	    });

	    // 按时段统计

	    /**
	     * @type {Array<string>}
	     */
	    let peakTimeSclices = [];
	    let peakTimeSlicesStartIndex = 0;
	    /**
	     * @param {number} index
	     */
	    function timeIndexToString(index) { return `${Math.floor(index / 2)}:${(index % 2 == 0 ? "00" : "30")}`; }
	    timePeriod.forEach((o, index) =>
	    {
	        console.log(`(${timeIndexToString(index)} - ${timeIndexToString(index + 1)}) `, "总数量:", o.count);

	        if (o.count > ((sendCount + receiveCount) / timePeriod.length) * 1.6)
	        {
	            o.isPeakTime = true;
	        }
	        else
	        {
	            if (peakTimeSlicesStartIndex < index)
	            {
	                peakTimeSclices.push(`(${timeIndexToString(peakTimeSlicesStartIndex)} - ${timeIndexToString(index)})`);
	            }
	            peakTimeSlicesStartIndex = index + 1;
	        }
	    });
	    if (peakTimeSlicesStartIndex < timePeriod.length)
	    {
	        peakTimeSclices.push(`(${timeIndexToString(peakTimeSlicesStartIndex)} - ${timeIndexToString(timePeriod.length)})`);
	    }

	    // 按日期段统计

	    let datePeriodMaxIndex = 0;
	    let datePeriodMaxValue = 0;
	    /**
	     * @param {number} index
	     */
	    function dateIndexToString(index) { return `${(Math.floor(index / 2) % 12) + 1}月${(index % 2 == 0 ? "初" : "中旬")}`; }
	    datePeriod.forEach((o, index) =>
	    {
	        console.log(`(${dateIndexToString(index)} - ${dateIndexToString(index + 1)}) `, "总数量:", o.count);
	        if (o.count > datePeriodMaxValue)
	        {
	            datePeriodMaxIndex = index;
	            datePeriodMaxValue = o.count;
	        }
	    });

	    // 按每天统计

	    let dayCount = 0;
	    eachDay.forEach(o =>
	    {
	        if (o.count != 0)
	        {
	            dayCount++;
	        }
	    });
	    console.log("有进行私聊的天数占今年总天数的", (Math.min(dayCount / dayOfThisYear, 1) * 100).toFixed(2), "%");

	    /**
	     * 时间间隔转可读字符串
	     * @param {number} duration
	     */
	    function timeDurationToString(duration)
	    {
	        let ret = "";
	        if (duration >= 60 * 60 * 1000)
	            ret += `${Math.floor(duration / (60 * 60 * 1000))}小时`;
	        if ((duration % (60 * 60 * 1000)) >= (60 * 1000))
	            ret += `${Math.floor((duration % (60 * 60 * 1000)) / (60 * 1000))}分钟`;
	        if ((duration % (60 * 1000)) >= 1000 || duration < 1000)
	            ret += `${Math.floor((duration % (60 * 1000)) / 1000)}秒`;
	        return ret;
	    }

	    let pageMainBody = ([
	        ( // 1
	            [
	                [
	                    "在2023年里,",
	                    `你一共和 ${sessionCount} 位用户私聊过。`,
	                    "",
	                    `共发出了 ${sendCount}条私信,`,
	                    `总共约 ${sendCharCount} 字;`,
	                    `共收到了 ${receiveCount}条私信,`,
	                    `总共约 ${receiveCharCount} 字。`,
	                    (
	                        sendCount < 1000 ?
	                            "也许今年你在花园里并不常常私聊呢 > <" :
	                            sendCount < 10000 ?
	                                "与好友聊天 话总不嫌太多。" :
	                                "获得 蔷薇花园 私聊小能手称号~"
	                    )
	                ].join("\n")
	            ]
	        ),
	        ( // 2
	            datePeriodMaxValue > 60 ?
	                [
	                    [
	                        `这一年里,`,
	                        `你进行过私聊的天数占今年总天数的 ${(Math.min(dayCount / dayOfThisYear, 1) * 100).toFixed(2)}%,`,
	                        `${dateIndexToString(datePeriodMaxIndex)} 到 ${dateIndexToString(datePeriodMaxIndex + 1)} 是你私聊最多的时候。`,
	                        `你在这半月内,`,
	                        `共收发了 ${datePeriodMaxValue} 条私聊消息。`,
	                        (datePeriodMaxValue > 800 ? "这段时间 或许你有很多话要诉说。" : "这段时间的自己 正在经历些什么呢?")
	                    ].join("\n")
	                ] :
	                null
	        ),
	        ( // 3
	            (peakTimeSclices.length > 0) ?
	                [
	                    [
	                        "一天之中,",
	                        `你偏爱的聊天时段是 ${peakTimeSclices.join(", ")}。`,
	                        (peakTimeSclices.length > 3 ? "碎片的时光, 留存着与好友的点滴。" : "美好的时光格外令人珍惜。")
	                    ].join("\n")
	                ] :
	                null
	        ),
	        ( // 4
	            sessionList[0] ?
	                [
	                    [
	                        `与你往来私信最多的人 非 ${sessionList[0].targetName} 莫属,`,
	                        `你们之间一共往来了 ${sessionList[0].sendCount + sessionList[0].receiveCount} 条私信,`,
	                        `你发出了 ${sessionList[0].sendCount} 条, ta发出了 ${sessionList[0].receiveCount} 条。`,
	                        "",
	                        (sessionList[1] ? `与你互发私信次多的是 ${sessionList[1].targetName} 共收发 ${sessionList[1].sendCount + sessionList[1].receiveCount} 条` : ""),
	                        (sessionList[2] ? `再其次是 ${sessionList[2].targetName} 共收发 ${sessionList[2].sendCount + sessionList[2].receiveCount} 条` : "")
	                    ].join("\n")
	                ] :
	                null
	        ),
	        ( // 5
	            (sendContentMaxValue > 5 || sendImageMaxValue > 5) ?
	                [
	                    (
	                        sendContentMaxValue > 5 ?
	                            [
	                                `今年里,`,
	                                `你最喜欢发送的内容是 "${htmlSpecialCharsDecode(sendContentMaxContent)}"`,
	                                `你一共发送过 ${sendContentMaxValue} 次。`
	                            ].join("\n") :
	                            null
	                    ),
	                    "\n",
	                    ...(
	                        sendImageMaxValue > 5 ?
	                            [
	                                `你最喜欢发送的图片是 "${htmlSpecialCharsDecode(sendImageMaxUrl)}"\n`,

	                                [
	                                    new NTagName("img"),
	                                    new NAttr("src", htmlSpecialCharsDecode(sendImageMaxUrl)),
	                                    createNStyleList({
	                                        maxHeight: "30vh",
	                                        maxWidth: "30vw",
	                                        border: "1px solid white"
	                                    })
	                                ],

	                                `\n你一共发送过 ${sendImageMaxValue} 次。`
	                            ] :
	                            []
	                    )
	                ] :
	                null
	        ),
	        ( // 6
	            (nightMessageMaxValue > 100) ?
	                [
	                    [
	                        `夜深了,`,
	                        (nightMessageMaxValue > 3000 ? `但对你来说夜生活刚刚开始,` : `你的私聊也在继续,`),
	                        `夜间 你常常与 ${sessionStatisticsMap.get(nightMessageMaxUid).targetName} 畅谈,`,
	                        `你们在转钟后的收发的私聊数量达到了 ${nightMessageMaxValue} 条。`
	                    ].join("\n")
	                ] :
	                null
	        ),
	        ( // 7
	            (continuousChatMaxDuration > 1.5 * 60 * 60 * 1000) ?
	                [
	                    [
	                        "还记得吗,",
	                        `在 ${(new Date(continuousChatMaxStartTime)).toLocaleString()},`,
	                        `你与 ${sessionStatisticsMap.get(continuousChatMaxUid).targetName} 展开了一段`,
	                        `长达 ${timeDurationToString(continuousChatMaxDuration)} 的超长的连续聊天!`
	                    ].join("\n")
	                ] :
	                null
	        ),
	        ( // 8
	            (nightContinuousChatMaxDuration > 50 * 60 * 1000 && nightContinuousChatMaxStartTime != continuousChatMaxStartTime) ?
	                [
	                    [
	                        `在 ${(new Date(nightContinuousChatMaxStartTime)).toLocaleDateString()},`,
	                        `从 ${(new Date(nightContinuousChatMaxStartTime)).toLocaleTimeString()}`,
	                        `到 ${(new Date(nightContinuousChatMaxStartTime + nightContinuousChatMaxDuration)).toLocaleTimeString()}`,
	                        "星月交辉,",
	                        `你与 ${sessionStatisticsMap.get(nightContinuousChatMaxUid).targetName} 的交流从未停歇。`
	                    ].join("\n")
	                ] :
	                null
	        ),
	        ( // 9
	            multipleChatMaxList.length >= 3 ?
	                [
	                    [
	                        `${(new Date(multipleChatMaxTime)).toLocaleDateString()},`,
	                        `这一天里,`,
	                        `你曾最多同时和 ${multipleChatMaxList.length} 位好友聊天,`,
	                        `他们分别是 ${multipleChatMaxList.map(uid => sessionStatisticsMap.get(uid).targetName).join(", ")}。`,
	                    ].join("\n")
	                ] :
	                null
	        ),
	        ( // 10
	            usedToChatUid ?
	                [
	                    [
	                        "你有过一位好友,",
	                        `${usedToChatSession.targetName} 曾与你互发 ${usedToChatSession.sendCount + usedToChatSession.receiveCount} 条消息,`,
	                        "今年下半,",
	                        "你们不曾联系过。",
	                        "也许找时间去打个招呼?"
	                    ].join("\n")
	                ] :
	                null
	        ),
	    ]).filter(o => o != null);

	    let longPictureBackgroundList = [
	        "https://r.iirose.com/i/23/12/19/15/3650-3T.png",
	        "https://r.iirose.com/i/23/12/19/15/3658-TW.png",
	        "https://r.iirose.com/i/23/12/19/15/3707-0C.jpg",
	        "https://r.iirose.com/i/23/12/19/15/3720-73.jpg",
	        "https://r.iirose.com/i/23/12/19/15/3725-Z0.jpg",
	        "https://r.iirose.com/i/23/12/19/15/3734-09.png",
	        "https://r.iirose.com/i/23/12/19/15/3739-SD.png",
	        "https://r.iirose.com/i/23/12/19/15/3746-Q9.jpg",
	        "https://r.iirose.com/i/23/12/19/15/3756-LZ.jpg",
	        "https://r.iirose.com/i/23/12/19/15/3800-BF.jpg",
	        "https://r.iirose.com/i/23/12/19/15/3805-UG.png",
	        "https://r.iirose.com/i/23/12/19/15/3808-W0.jpg",
	        "https://r.iirose.com/i/23/12/19/15/3813-M5.jpg"
	    ];

	    showReportPages(
	        "2023蔷薇私聊年报",
	        ([
	            NList.getElement([
	                "向上滑动\n领取你的2023蔷薇私聊年报"
	            ]),
	            ...pageMainBody.map(o => NList.getElement(o)),
	            NList.getElement([
	                "后面没有啦\n\n",
	                [
	                    createNStyleList({
	                        display: "inline-block",
	                        padding: "6px",
	                        border: "1px solid white",
	                        backgroundColor: "rgba(0, 0, 0, 0.7)",
	                        fontSize: "0.8em"
	                    }),
	                    "生成年报长图",
	                    new NEvent("click", async () =>
	                    {
	                        let textLines = pageMainBody.map(o => o.map(o => (typeof (o) == "string" ? o : "")).join("")).join("\n\n").split("\n").map(o =>
	                        {
	                            if (o.length <= 50)
	                                return o;
	                            let section = [];
	                            for (let i = 0, sectionCount = Math.ceil(o.length / 50); i < sectionCount; i++)
	                            {
	                                section.push(o.slice(i * 50, (i + 1) * 50));
	                            }
	                            return section;
	                        }).flat();

	                        /**
	                         * @type {typeof OffscreenCanvas}
	                         */
	                        let OffscreenCanvasConstructor = (iframeContext.iframeWindow?.["OffscreenCanvas"] ? iframeContext.iframeWindow?.["OffscreenCanvas"] : OffscreenCanvas);
	                        let canvas = new OffscreenCanvasConstructor(1500, 350 + textLines.length * 30);

	                        console.log(textLines);

	                        showNotice("生成年报", "正在生成长图");

	                        let canvasContext = canvas.getContext("2d");

	                        canvasContext.fillStyle = "rgb(30, 30, 30)";
	                        canvasContext.fillRect(0, 0, canvas.width, canvas.height);

	                        /**
	                         * @type {HTMLImageElement | undefined}
	                         */
	                        let backgroundImage = await Promise.any([
	                            new Promise((resolve) =>
	                            {
	                                let image = new Image();
	                                image.addEventListener("load", () =>
	                                {
	                                    resolve(image);
	                                });
	                                image.crossOrigin = "anonymous";
	                                image.src = `${longPictureBackgroundList[Math.floor(Math.random() * longPictureBackgroundList.length)]}`;
	                            }),
	                            delayPromise(4500)
	                        ]);

	                        if (backgroundImage != undefined)
	                        {
	                            let imageRatio = Math.max(canvas.width / backgroundImage.naturalWidth, canvas.height / backgroundImage.naturalHeight);
	                            let captureWidth = canvas.width / imageRatio;
	                            let captureHeight = canvas.height / imageRatio;
	                            canvasContext.drawImage(
	                                backgroundImage,
	                                (backgroundImage.naturalWidth - captureWidth) / 2, (backgroundImage.naturalHeight - captureHeight) / 2, captureWidth, captureHeight,
	                                0, 0, canvas.width, canvas.height
	                            );

	                            canvasContext.fillStyle = "rgba(0, 0, 0, 0.5)";
	                            canvasContext.fillRect(0, 0, canvas.width, canvas.height);
	                        }

	                        {
	                            let titleText = "蔷薇花园2023年报";
	                            canvasContext.font = `40px "noto", serif`;
	                            canvasContext.textAlign = "center";
	                            canvasContext.strokeStyle = "rgba(0, 0, 0, 0.7)";
	                            canvasContext.lineWidth = 3;
	                            canvasContext.lineJoin = "round";
	                            canvasContext.strokeText(titleText, canvas.width / 2, 120);
	                            canvasContext.fillStyle = "rgb(255, 255, 255)";
	                            canvasContext.fillText(titleText, canvas.width / 2, 120);
	                        }

	                        textLines.forEach((lineText, index) =>
	                        {
	                            canvasContext.font = `27px "noto", serif`;
	                            canvasContext.textAlign = "center";

	                            canvasContext.strokeStyle = "rgba(0, 0, 0, 0.9)";
	                            canvasContext.lineWidth = 2;
	                            canvasContext.lineJoin = "round";
	                            canvasContext.strokeText(lineText, canvas.width / 2, 250 + index * 30);

	                            canvasContext.fillStyle = "rgb(255, 255, 255)";
	                            canvasContext.fillText(lineText, canvas.width / 2, 250 + index * 30);
	                        });

	                        canvasContext.fillStyle = "rgba(255, 255, 255, 0.5)";
	                        canvasContext.font = `24px "noto", serif`;
	                        canvasContext.textAlign = "center";
	                        canvasContext.fillText("由 iirose-Forge 使用 ❤ 生成", canvas.width / 2, canvas.height - 27);

	                        let blob = await canvas.convertToBlob({
	                            type: "image/png",
	                            quality: 0.9
	                        });

	                        /**
	                         * @param {Blob} blob
	                         */
	                        function blobToDataURL(blob)
	                        {
	                            return new Promise((resolve, reject) =>
	                            {
	                                const reader = new FileReader();
	                                reader.onload = () => resolve(reader.result);
	                                reader.onerror = () => reject(reader.error);
	                                reader.onabort = () => reject(new Error("Read aborted"));
	                                reader.readAsDataURL(blob);
	                            });
	                        }

	                        if (iframeContext.iframeWindow?.["device"] != 5)
	                        {
	                            let url = URL.createObjectURL(blob);
	                            iframeContext.iframeWindow?.["showImg"]?.(url);
	                        }
	                        else
	                        {
	                            iframeContext.iframeWindow?.["showImg"]?.(await blobToDataURL(blob));
	                        }

	                        showNotice("生成年报", "重新生成可以使用不同背景哦\n长按(右键)图片保存");
	                    })
	                ]
	            ]),
	        ]),
	        [
	            "https://r.iirose.com/i/23/10/11/21/3338-QK.jpg",
	            "https://r.iirose.com/i/22/12/18/15/4513-0A.png",
	            "https://r.iirose.com/i/22/5/11/15/3838-IY.jpg",
	            "https://r.iirose.com/i/23/9/7/1/1047-5Y.jpg",
	            "https://r.iirose.com/i/23/8/24/5/0224-LF.jpg",
	            "https://r.iirose.com/i/23/12/17/16/2214-M1.jpg",
	            "https://r.iirose.com/i/23/12/17/16/2223-ZH.jpg",
	            "https://r.iirose.com/i/23/12/17/16/2229-EV.jpg",
	            "https://r.iirose.com/i/23/12/17/16/2237-6O.jpg",
	            "https://r.iirose.com/i/23/12/17/16/2242-AR.jpg",
	            "https://r.iirose.com/i/23/12/17/16/2334-XA.jpg",
	            "https://r.iirose.com/i/23/12/17/16/2319-TO.png"
	        ]
	    );
	}
	/*
	    1   + [x] 和多少人私聊过 私聊总条数 私聊总字数
	    2   + [x] 聊天月历
	    3   + [x] 最多的聊天时段
	    4   + [x] 聊的最多的前三
	    5   + [x] 最喜欢发送的内容 最喜欢使用的图片
	    6   + [x] 夜间分段第一
	    7   + [x] 持续时间最长的聊天
	    8   + [x] 聊得最晚(夜间聊天持续时间最长)
	    9   + [x] 最多同时聊天的人数 (大于或等于3)
	    10  + [x] 不再聊天的人 (去年或上半年经常聊天 下半年几乎没有聊天)
	*/

	/**
	 * 展示报告页
	 * @param {string} title
	 * @param {Array<NElement>} pages
	 * @param {Array<string>} backgroundList
	 */
	function showReportPages(title, pages, backgroundList)
	{
	    let nowPageIndex = 0;
	    let pageData = createHookObj({
	        textElement: pages[nowPageIndex]
	    });
	    /**
	     * @type {NElement}
	     */
	    let textElement = null;
	    /**
	     * @type {NElement}
	     */
	    let backgroundElement = null;
	    /**
	     * @type {NElement}
	     */
	    let backgroundOverlayElement = null;

	    let switchPageFinish = true;

	    /**
	     * 切换页面
	     * @param {number} index
	     */
	    async function switchPageTo(index)
	    {
	        // if (index < 0 || index >= pages.length)
	        //     index = (index + pages.length) % pages.length;
	        if (!switchPageFinish || !pages[index])
	            return;
	        switchPageFinish = false;
	        nowPageIndex = index;

	        textElement.animate([
	            {
	                opacity: "1"
	            },
	            {
	                opacity: "0"
	            }
	        ], {
	            duration: 1000,
	            easing: "ease-in",
	            fill: "forwards"
	        });
	        await backgroundOverlayElement.animateCommit([
	            {
	                backgroundColor: "rgba(0, 0, 0, 0.5)"
	            },
	            {
	                backgroundColor: "rgba(0, 0, 0, 1)"
	            }
	        ], 300);

	        backgroundElement.setStyle("backgroundImage", `url("${backgroundList[index % backgroundList.length]}")`);
	        await delayPromise(700);
	        pageData.textElement = pages[index];

	        textElement.animate([
	            {
	                opacity: "0"
	            },
	            {
	                opacity: "1"
	            }
	        ], {
	            duration: 1000,
	            easing: "ease-in",
	            fill: "forwards"
	        });
	        await backgroundOverlayElement.animateCommit([
	            {
	                backgroundColor: "rgba(0, 0, 0, 1)"
	            },
	            {
	                backgroundColor: "rgba(0, 0, 0, 0.5)"
	            }
	        ], 500);

	        await delayPromise(500);
	        switchPageFinish = true;
	    }

	    let page = NList.getElement([ // 整个页面
	        createNStyleList({
	            position: "fixed",
	            top: "0",
	            left: "0",
	            zIndex: "92000",
	            height: "100%",
	            width: "100%",
	            backgroundColor: "rgb(255, 255, 255)",
	        }),


	        [ // 标题栏
	            createNStyleList({
	                opacity: "0.8",
	                backgroundColor: "#303030",
	                width: "100%",
	                boxShadow: "0 0 1px rgb(0, 0, 0, 0.12), 0 1px 1px rgb(0, 0, 0, 0.24)",
	                zIndex: "2",
	                fontFamily: "md",
	                height: "40px",
	                lineHeight: "40px",
	                fontSize: "26px",
	                whiteSpace: "nowrap",
	                boxSizing: "border-box",
	                position: "relative",
	                color: "#fff",
	            }),

	            [ // 返回按钮
	                className("mdi-chevron-left"),
	                createNStyleList({
	                    display: "inline-flex",
	                    opacity: "0.8",
	                    backgroundColor: "#303030",
	                    boxShadow: "0 0 1px rgb(0,0,0,0.12), 0 1px 1px rgb(0,0,0,0.24)",
	                    borderRight: "1px solid rgb(255,255,255,0.3)",
	                    zIndex: "2",
	                    fontFamily: "md",
	                    width: "40px",
	                    height: "40px",
	                    lineHeight: "40px",
	                    fontSize: "26px",
	                    padding: "0 0 0 0",
	                    whiteSpace: "nowrap",
	                    boxSizing: "border-box",
	                    position: "relative",
	                    color: "#fff",
	                    justifyContent: "center",
	                    alignItems: "center"
	                }),

	                new NEvent("click", () =>
	                {
	                    page.remove();
	                })
	            ],
	            [
	                className("mdi-fire"),
	                createNStyleList({
	                    display: "inline-block",
	                    opacity: "0.8",
	                    backgroundColor: "#303030",
	                    boxShadow: "0 0 1px rgb(0,0,0,0.12), 0 1px 1px rgb(0,0,0,0.24)",
	                    marginLeft: "15px",
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
	                createNStyleList({
	                    display: "inline",
	                    fontSize: "16px",
	                    opacity: "0.7",
	                    fontWeight: "bold",
	                    marginLeft: "16px",
	                    height: "100%",
	                    lineHeight: "40px",
	                    verticalAlign: "top",
	                }),

	                title
	            ]
	        ],

	        [ // 内容主体
	            createNStyleList({
	                position: "absolute",
	                left: "0",
	                width: "100%",
	                top: "40px",
	                bottom: "0",
	                overflow: "auto",
	            }),

	            [ // 文本内容
	                createNStyleList({
	                    position: "absolute",
	                    inset: "0",
	                    margin: "auto",
	                    width: "fit-content",
	                    maxWidth: "90%",
	                    height: "fit-content",
	                    fontSize: "1.8em",
	                    whiteSpace: "pre-wrap",
	                    color: "white",
	                    zIndex: "5"
	                }),

	                ele => textElement = ele,

	                bindValue(pageData, "textElement")
	            ],

	            [ // 背景图片
	                createNStyleList({
	                    position: "absolute",
	                    left: "0",
	                    top: "0",
	                    width: "100%",
	                    height: "100%",
	                    backgroundImage: `url("${backgroundList[nowPageIndex]}")`,
	                    backgroundPosition: "center",
	                    backgroundSize: "cover",
	                    zIndex: "1"
	                }),

	                ele => backgroundElement = ele,
	            ],

	            [ // 背景遮罩
	                createNStyleList({
	                    position: "absolute",
	                    left: "0",
	                    top: "0",
	                    width: "100%",
	                    height: "100%",
	                    backgroundColor: "rgba(0, 0, 0, 0.5)",
	                    zIndex: "2"
	                }),

	                ele => backgroundOverlayElement = ele,

	                ele =>
	                {
	                    ele.animate([
	                        {
	                            backgroundColor: "rgba(0, 0, 0, 0)"
	                        },
	                        {
	                            backgroundColor: "rgba(0, 0, 0, 0.5)"
	                        }
	                    ], 1000);
	                }
	            ],

	            new NEvent("wheel", e =>
	            {
	                if (e.deltaY > 0)
	                {
	                    switchPageTo(nowPageIndex + 1);
	                }
	                else if (e.deltaY < 0)
	                {
	                    switchPageTo(nowPageIndex - 1);
	                }
	            }),

	            e =>
	            {
	                /**
	                 * 按下的时间
	                 */
	                let startPressTime = 0;
	                /**
	                 * 位置未移动
	                 */
	                let notMove = false;
	                let proc = (/** @type {{ sx: number, sy: number, x: number, y: number, pressing: boolean,hold: boolean }} */ e) =>
	                {
	                    let now = Date.now();
	                    if (e.pressing)
	                    {
	                        startPressTime = now;
	                        notMove = true;
	                    }
	                    if (Math.abs(e.x - e.sx) > 10 || Math.abs(e.y - e.sy) > 10)
	                        notMove = false;
	                    if (!e.hold)
	                    {
	                        if (notMove && now - startPressTime < 150)
	                        {
	                            let startTargetElement = iframeContext.iframeDocument.elementFromPoint(e.sx, e.sy);
	                            let endTargetElement = iframeContext.iframeDocument.elementFromPoint(e.x, e.y);
	                            if (startTargetElement == endTargetElement)
	                            {
	                                startTargetElement.dispatchEvent(new MouseEvent("click"));
	                            }
	                        }
	                        else if (now - startPressTime < 600 && Math.abs(e.y - e.sy) > 100 && Math.abs(e.x - e.sx) / Math.abs(e.y - e.sy) < 0.5)
	                        {
	                            if (e.y - e.sy > 0)
	                            {
	                                switchPageTo(nowPageIndex - 1);
	                            }
	                            else
	                            {
	                                switchPageTo(nowPageIndex + 1);
	                            }
	                        }
	                    }
	                };

	                e.addEventListener("mousedown", e => e.preventDefault(), true);
	                e.addEventListener("mouseup", e => e.preventDefault(), true);
	                touchBind(e, proc);

	                e.addEventListener("mousedown", e => e.stopPropagation());
	                e.addEventListener("mouseup", e => e.stopPropagation());
	                e.addEventListener("touchstart", e => e.stopPropagation());
	                e.addEventListener("touchend", e => e.stopPropagation());
	                e.addEventListener("touchcancel", e => e.stopPropagation());
	            },
	        ]
	    ]);
	    iframeContext.iframeBody.addChild(page);
	}

	let waitForId = "";

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
	    waitForId = requestId;
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
	        if (waitForId)
	        {
	            if (e.content.type == "syncConfigCB" && e.content.id == waitForId)
	            {
	                waitForId = "";
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
	    version: "alpha v1.18.6"
	};

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
	                    ...(
	                        (
	                            (new Date("2023/12/20")).getTime() < Date.now() && Date.now() < (new Date("2024/1/16")).getTime() ||
	                            (storageContext.local.enableExperimental && storageContext.local.experimentalOption["annualReport"])
	                        ) ?
	                            [
	                                {
	                                    title: "(限时) 蔷薇年报",
	                                    text: "获取你的2023蔷薇年报",
	                                    icon: "fire",
	                                    onClick: async () =>
	                                    {
	                                        reportGeneration();
	                                    }
	                                },
	                            ] :
	                            []
	                    ),
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
	                        title: "勿扰模式",
	                        text: "设置自动回复",
	                        icon: "bell-minus-outline",
	                        onClick: async () =>
	                        {
	                            showNotDisturbModeMenu();
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
	                        title: "美化设置",
	                        text: "定制你的界面",
	                        icon: "brush-outline",
	                        onClick: async () =>
	                        {
	                            showBeautifyMenu();
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
	                                        name: "接管音频(测试)",
	                                        storageKey: "enableAudioTakeover"
	                                    },
	                                    {
	                                        name: "超级菜单",
	                                        storageKey: "enableSuperMenu"
	                                    },
	                                    {
	                                        name: "快捷房管操作",
	                                        storageKey: "enableRoomAdminOperation"
	                                    },
	                                    {
	                                        name: "置顶会话",
	                                        storageKey: "enablePinSession"
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
	                    },
	                    {
	                        title: "补丁设置",
	                        text: "启用或禁用补丁",
	                        icon: "bandage",
	                        onClick: async () =>
	                        {
	                            showPatchMenu();
	                        }
	                    },
	                    {
	                        title: "账号管理",
	                        text: "管理你的其他账号",
	                        icon: "account-cog",
	                        onClick: async () =>
	                        {
	                            await showMultiAccountMenu();
	                        }
	                    },
	                    {
	                        title: "黑名单",
	                        text: "管理黑名单",
	                        icon: "account-cancel-outline",
	                        onClick: async () =>
	                        {
	                            await showBlacklistMenu();
	                        }
	                    },
	                    {
	                        title: "安装iiroseForge",
	                        text: "下次使用无需注入",
	                        icon: "puzzle",
	                        onClick: async () =>
	                        {
	                            localStorage.setItem("installForge", "true");
	                            writeForgeToCache(true);
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
	            if (ele.getStyle("backgroundColor") == "transparent")
	            {
	                buttonBackgroundColor = "transparent";
	                ele.setStyle("backgroundColor", "rgba(127, 127, 127, 0.3)");
	            }
	            else
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
	     *  execute: () => void,
	     *  optionMenu?: () => void
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
	     * @param {() => void} [optionMenuCB]
	     */
	    addChild(element, executeCB, optionMenuCB)
	    {
	        this.list.push({
	            element: element,
	            execute: executeCB,
	            optionMenu: optionMenuCB
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

	    /**
	     * 触发当前选择的项
	     */
	    triggerCurrent()
	    {
	        if (this.currentRowIndex != this.startRowIndex)
	            this.list[this.currentRowIndex]?.execute();
	    }

	    /**
	     * 触发当前选择的项的选项菜单
	     */
	    triggerCurrentOptionMenu()
	    {
	        this.list[this.currentRowIndex]?.optionMenu?.();
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
	            createNStyleList({
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
	                        createNStyleList({
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
	     * 当前选择被取消
	     */
	    let canceled = false;

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

	            /**
	             * @type {Array<{ id?: string, item: any, execute: () => void }>}
	             */
	            let menuList = [];

	            let nowRoomId = forgeApi.operation.getUserRoomId();
	            menuList.push({
	                item: createRoomListItemById(nowRoomId),
	                execute: () => { }
	            });

	            try
	            {
	                /** @type {Array<string>} */
	                let roomHistory = JSON.parse(localStorage.getItem("database"))?.["roomHistory"]?.split?.(",");
	                if (roomHistory)
	                    roomHistory.forEach(o =>
	                    {
	                        if (o != nowRoomId)
	                            menuList.push({
	                                id: o,
	                                item: createRoomListItemById(o, "历史"),
	                                execute: () =>
	                                {
	                                    forgeApi.operation.switchRoom(o);
	                                }
	                            });
	                    });
	            }
	            catch (err)
	            {
	                console.error("forge supper menu:", err);
	            }

	            createSortableList(menuList, rightColumn, "right");
	        }
	        // 左侧的列表
	        {
	            leftColumn.clearChild();

	            let menuList = [
	                {
	                    item: createListItem("", "无动作", ""),
	                    execute: () => { }
	                },
	                {
	                    id: "信箱",
	                    item: createListItem("mdi-mailbox", "打开信箱", ""),
	                    execute: () =>
	                    {
	                        iframeContext.iframeWindow?.["functionBtnDo"]?.(2);
	                    }
	                },
	                {
	                    id: "媒体开关",
	                    item: createListItem("mdi-music", "切换媒体开关", ""),
	                    execute: () =>
	                    {
	                        iframeContext.iframeWindow?.["functionBtnDo"]?.(90);
	                    }
	                },
	                {
	                    id: "播放列表",
	                    item: createListItem("mdi-music-box-multiple", "打开播放列表", ""),
	                    execute: () =>
	                    {
	                        iframeContext.iframeWindow?.["functionBtnDo"]?.(1, iframeContext.iframeDocument?.createElement("div"));
	                    }
	                },
	                {
	                    id: "商店",
	                    item: createListItem("mdi-store", "打开商店", ""),
	                    execute: () =>
	                    {
	                        iframeContext.iframeWindow?.["functionBtnDo"]?.(10, iframeContext.iframeDocument?.createElement("div"));
	                    }
	                },
	                {
	                    id: "朋友圈",
	                    item: createListItem("mdi-camera-iris", "打开朋友圈", ""),
	                    execute: () =>
	                    {
	                        iframeContext.iframeWindow?.["functionBtnDo"]?.(5);
	                    }
	                },
	                {
	                    id: "论坛",
	                    item: createListItem("mdi-forum", "打开论坛", ""),
	                    execute: () =>
	                    {
	                        iframeContext.iframeWindow?.["functionBtnDo"]?.(3);
	                    }
	                },
	                {
	                    id: "任务版",
	                    item: createListItem("mdi-clipboard-check-multiple", "打开任务版", ""),
	                    execute: () =>
	                    {
	                        iframeContext.iframeWindow?.["functionBtnDo"]?.(4);
	                    }
	                },
	                {
	                    id: "勿扰模式",
	                    item: createListItem("mdi-bell-minus-outline", "切换勿扰模式", ""),
	                    execute: () =>
	                    {
	                        setNotDisturbMode("switch");
	                    }
	                },
	                {
	                    id: "状态",
	                    item: createListItem("mdi-human", "打开状态面板", ""),
	                    execute: () =>
	                    {
	                        iframeContext.iframeWindow?.["functionBtnDo"]?.(51);
	                    }
	                },
	                {
	                    id: "终端",
	                    item: createListItem("mdi-powershell", "打开终端", ""),
	                    execute: () =>
	                    {
	                        iframeContext.iframeWindow?.["functionBtnDo"]?.(21);
	                    }
	                },
	                {
	                    id: "房间推荐",
	                    item: createListItem("mdi-fire", "打开房间推荐", ""),
	                    execute: () =>
	                    {
	                        iframeContext.iframeWindow?.["functionBtnDo"]?.(101);
	                    }
	                },
	            ];
	            createSortableList(menuList, leftColumn, "left");
	        }

	        supperMenu.setCurrentColumn(1);
	    }

	    /**
	     * @param {{ movementX: number, movementY: number }} e
	     */
	    let mouseMove = (e) =>
	    {
	        if (supperMenuDisplay && !canceled)
	            supperMenu.menuPointerMove(e.movementX, e.movementY);
	    };
	    /**
	     * @param {KeyboardEvent} e
	     */
	    let keyDown = (e) =>
	    {
	        if (supperMenuDisplay && !canceled)
	            switch (e.code)
	            {
	                case "KeyW":
	                    e.preventDefault();
	                    supperMenu.menuPointerMove(0, -supperMenu.cursorScaleSizeY);
	                    break;
	                case "KeyA":
	                    e.preventDefault();
	                    supperMenu.menuPointerMove(-supperMenu.cursorScaleSizeX, 0);
	                    break;
	                case "KeyD":
	                    e.preventDefault();
	                    supperMenu.menuPointerMove(supperMenu.cursorScaleSizeX, 0);
	                    break;
	                case "KeyS":
	                    e.preventDefault();
	                    supperMenu.menuPointerMove(0, supperMenu.cursorScaleSizeY);
	                    break;
	                case "KeyE":
	                    e.preventDefault();

	                    supperMenu.triggerCurrentOptionMenu();

	                    iframeContext.iframeWindow.removeEventListener("mousemove", mouseMove, true);
	                    iframeContext.iframeWindow.removeEventListener("keydown", keyDown, true);
	                    supperMenu.hide();
	                    canceled = true;
	                    supperMenuDisplay = false;
	                    document.exitPointerLock();
	                    iframeContext.iframeDocument.exitPointerLock();
	                    break;
	                case "KeyQ":
	                    e.preventDefault();

	                    iframeContext.iframeWindow.removeEventListener("mousemove", mouseMove, true);
	                    iframeContext.iframeWindow.removeEventListener("keydown", keyDown, true);
	                    supperMenu.hide();
	                    canceled = true;
	                    document.exitPointerLock();
	                    iframeContext.iframeDocument.exitPointerLock();
	                    break;
	            }
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
	            iframeContext.iframeWindow.addEventListener("keydown", keyDown, true);
	            canceled = false;
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

	        e.stopPropagation();
	        e.preventDefault();
	        if (!canceled)
	            supperMenu.triggerCurrent();
	        iframeContext.iframeWindow.removeEventListener("mousemove", mouseMove, true);
	        iframeContext.iframeWindow.removeEventListener("keydown", keyDown, true);

	        document.exitPointerLock();
	        iframeContext.iframeDocument.exitPointerLock();

	        setTimeout(() =>
	        {
	            supperMenuDisplay = false;
	            supperMenu.hide();

	            document.exitPointerLock();
	            iframeContext.iframeDocument.exitPointerLock();
	        }, 10);
	    }, true);
	    iframeContext.iframeWindow.addEventListener("contextmenu", e =>
	    {
	        if (supperMenuDisplay)
	        {
	            e.stopPropagation();
	            e.preventDefault();
	        }
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
	                        if (!canceled)
	                            supperMenu.triggerCurrent();
	                        supperMenuDisplay = false;
	                        supperMenu.hide();
	                    }, 10);
	            }
	        }, false);
	        let msgholderElement = iframeContext.iframeDocument.getElementById("msgholder");
	        msgholderElement?.addEventListener("contextmenu", e =>
	        {
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
	                canceled = false;
	            }
	        }, true);
	    }
	}

	/**
	 * @param {Array<{id?: string;item: any;execute: () => void;}>} menuList
	 * @param {ForgeSuperMenuColumn} column
	 * @param {string} columnName
	 */
	function createSortableList(menuList, column, columnName)
	{
	    menuList.sort((a, b) =>
	    {
	        /**
	         * @param {{ id?: string }} o
	         */
	        function mappingPriority(o)
	        {
	            if (o.id == undefined)
	                return 0;
	            let priorityValue = storageContext.local.superMenuPriority?.[columnName]?.[o.id];
	            if (priorityValue == undefined)
	                return (1 << 30);
	            else if (priorityValue > 0)
	                return (1 << 30) - priorityValue;
	            else if (priorityValue < 0)
	                return (1 << 31) - priorityValue;
	        }
	        return mappingPriority(a) - mappingPriority(b);
	    }).forEach((o, index) =>
	    {
	        column.addChild(
	            o.item,
	            o.execute,
	            () =>
	            {
	                if (!o.id)
	                    return;
	                showMenu([
	                    NList.getElement([
	                        "置底于无动作上方",
	                        new NEvent("click", () =>
	                        {
	                            let mapObj = storageContext.local.superMenuPriority[columnName];
	                            if (!mapObj)
	                            {
	                                mapObj = {};
	                                storageContext.local.superMenuPriority[columnName] = mapObj;
	                            }
	                            let minValue = 0;
	                            Object.keys(mapObj).forEach(key =>
	                            {
	                                if (key != o.id && mapObj[key] < 0)
	                                    minValue = Math.min(minValue, mapObj[key]);
	                            });
	                            mapObj[o.id] = minValue - 1;
	                            storageLocalSave();
	                        })
	                    ]),
	                    NList.getElement([
	                        "置顶于无动作下方",
	                        new NEvent("click", () =>
	                        {
	                            let mapObj = storageContext.local.superMenuPriority[columnName];
	                            if (!mapObj)
	                            {
	                                mapObj = {};
	                                storageContext.local.superMenuPriority[columnName] = mapObj;
	                            }
	                            let maxValue = 0;
	                            Object.keys(mapObj).forEach(key =>
	                            {
	                                if (key != o.id && mapObj[key] > 0)
	                                    maxValue = Math.max(maxValue, mapObj[key]);
	                            });
	                            mapObj[o.id] = maxValue + 1;
	                            storageLocalSave();
	                        })
	                    ]),
	                    NList.getElement([
	                        "取消自定义位置",
	                        new NEvent("click", () =>
	                        {
	                            if (storageContext.local.superMenuPriority[columnName])
	                            {
	                                delete storageContext.local.superMenuPriority[columnName][o.id];
	                                storageLocalSave();
	                            }
	                        })
	                    ])
	                ]);
	            }
	        );
	        if (!o.id)
	            column.currentRowIndex = index;
	    });
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
	 * 启用实验性功能
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
	        addMenuHook(
	            "ejectionButton",
	            "roomMenu",
	            () => ({ text: "弹射起步", icon: "ghost-outline" }),
	            async (e) => { ejectionEscape(e.roomId); }
	        );
	    }

	    if (storageContext.local.experimentalOption["roomQuery"])
	    {
	        addMenuHook(
	            "roomQueryButton",
	            "roomMenu",
	            () => ({ text: "房间查询", icon: "account-search" }),
	            async (e) =>
	            {
	                let roomId = e.roomId;
	                let result = [];
	                let userList = forgeApi.operation.getAllOnlineUserInfo();
	                result.push("--- online user ---");
	                let count = 0;
	                userList.forEach(o =>
	                {
	                    if (o.roomId == roomId)
	                    {
	                        result.push(`${count++} - ${o.uid} (${o.name})`);
	                    }
	                });
	                result.push(`${count} user in this room.`);
	                let resultStr = result.join("\n");
	                console.log("[iiroseForge] 房间查询\n", resultStr);
	                showCopyBox("房间查询", "查询结果", resultStr);
	            }
	        );
	    }


	    if (storageContext.local.experimentalOption["withdraw"])
	    {
	        takeoverWithdraw();
	    }

	    if (storageContext.local.experimentalOption["interceptState"])
	    {
	        takeoverState();
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

	let hadTakeoverState = false;
	function takeoverState()
	{
	    if (hadTakeoverState)
	        return;
	    hadTakeoverState = true;
	    toServerTrie.addPath("s", (_data, srcData) =>
	    {
	        if (srcData == "s")
	            setPackageData("");
	    });
	}

	let isRoomAdminOrMember = false;
	let isRoomAdmin = false;

	/**
	 * 启用房管操作
	 */
	function enableRoomAdminOperation()
	{
	    isRoomAdminOrMember = false;
	    isRoomAdmin = false;

	    let userName = forgeApi.operation.getUserName();
	    let nowRoomInfo = forgeApi.operation.getRoomInfoById(forgeApi.operation.getUserRoomId());
	    if (nowRoomInfo)
	    {
	        if (userName == nowRoomInfo.ownerName)
	        {
	            isRoomAdminOrMember = true;
	            isRoomAdmin = true;
	        }
	        else
	            nowRoomInfo.member.some(o =>
	            {
	                if (
	                    o.name == userName &&
	                    (
	                        o.auth == "admin" ||
	                        o.auth == "member"
	                    )
	                )
	                {
	                    isRoomAdminOrMember = true;
	                    if (o.auth == "admin")
	                        isRoomAdmin = true;
	                }
	            });
	    }

	    addMenuHook(
	        "roomAdminOperation",
	        "roomMessageMenu",
	        () => (isRoomAdminOrMember ? {
	            icon: "wrench",
	            text: "房管操作"
	        } : null),
	        e =>
	        {
	            showMenu([
	                ...(
	                    isRoomAdmin ?
	                        [
	                            NList.getElement([
	                                "白名单",
	                                new NEvent("click", async () =>
	                                {
	                                    let timeStr = await showInputBox("房管操作", `设置用户(${e.userName})\n的白名单时间\nd天 h时 m分 s秒 &永久`, true, "&");
	                                    if (timeStr == undefined)
	                                        return;
	                                    let remarkStr = await showInputBox("房管操作", `设置用户(${e.userName})\n的白名单备注`, true, "");
	                                    if (remarkStr == undefined)
	                                        return;
	                                    iframeContext.socketApi.send(`!hw${JSON.stringify(["4", e.userName.toLowerCase(), timeStr, remarkStr])}`);
	                                })
	                            ]),
	                            NList.getElement([
	                                "黑名单",
	                                new NEvent("click", async () =>
	                                {
	                                    let timeStr = await showInputBox("房管操作", `设置用户(${e.userName})\n的黑名单时间\nd天 h时 m分 s秒 &永久`, true, "30d");
	                                    if (timeStr == undefined)
	                                        return;
	                                    let remarkStr = await showInputBox("房管操作", `设置用户(${e.userName})\n的黑名单备注`, true, "");
	                                    if (remarkStr == undefined)
	                                        return;
	                                    iframeContext.socketApi.send(`!h4${JSON.stringify(["4", e.userName.toLowerCase(), timeStr, remarkStr])}`);
	                                })
	                            ]),
	                            NList.getElement([
	                                "永久黑名单",
	                                new NEvent("click", async () =>
	                                {
	                                    let remarkStr = await showInputBox("房管操作", `设置用户(${e.userName})\n的永久黑名单备注`, true, "");
	                                    if (remarkStr == undefined)
	                                        return;
	                                    iframeContext.socketApi.send(`!h4${JSON.stringify(["4", e.userName.toLowerCase(), "&", remarkStr])}`);
	                                })
	                            ])
	                        ] :
	                        []
	                ),
	                NList.getElement([
	                    "移出房间",
	                    new NEvent("click", async () =>
	                    {
	                        if (await showInfoBox("房管操作", `是否将用户(${e.userName})\n移出房间`))
	                        {
	                            iframeContext.socketApi.send(`!#${JSON.stringify([e.userName.toLowerCase()])}`);
	                        }
	                    })
	                ]),
	            ]);
	        }
	    );
	}

	let showedNotice = false;

	/**
	 * 启用音频接管
	 */
	function enableAudioTakeover()
	{
	    /**
	     * @type {NElement}
	     */
	    let buttonElement = null;
	    let buttonData = createHookObj({
	        text: ""
	    });
	    /**
	     * @type {{ type: "roomMedia" } | { type: "infoMedia", src: string }}
	     */
	    let targetMediaState = null;

	    /**
	     * @param {HTMLAudioElement | HTMLVideoElement} audioObj
	     */
	    function isAudioHearable(audioObj)
	    {
	        return audioObj && audioObj.src != "" && !audioObj.paused && audioObj.volume > 0;
	    }

	    let tryMuteRoomMedia = false;
	    let tryMuteInfoMedia = false;

	    /** @type {HTMLVideoElement} */
	    let old_shareMediaObj = iframeContext.iframeWindow?.["shareMediaObj"];
	    /** @type {HTMLAudioElement} */
	    let old_shareMediaObjAudio = iframeContext.iframeWindow?.["shareMediaObjAudio"];
	    /** @type {HTMLAudioElement} */
	    let old_radioPlayer = iframeContext.iframeWindow?.["radioPlayer"];
	    /**
	     * @type {(...arg: Array<any>) => void}
	     */
	    let old_playerSoundOff = iframeContext.iframeWindow?.["playerSoundOff"];

	    /**
	     * @type {HTMLAudioElement}
	     */
	    let old_infosound = iframeContext.iframeWindow?.["infosound"];

	    if (!(
	        old_shareMediaObj &&
	        old_shareMediaObjAudio &&
	        old_radioPlayer &&
	        old_playerSoundOff &&
	        old_infosound
	    ))
	        return;

	    old_infosound.removeAttribute("loop");
	    old_infosound.removeAttribute("autoplay");
	    iframeContext.iframeWindow["infosound"] = new Proxy(old_infosound, {
	        get: (_target, key) =>
	        {
	            // console.log("info media do get", key);
	            let srcValue = old_infosound[key];
	            switch (key)
	            {
	                case "play": {
	                    return () =>
	                    {
	                        old_infosound.play();
	                    };
	                }
	                case "pause": {
	                    return () =>
	                    {
	                        old_infosound.pause();
	                    };
	                }
	                case "": {
	                    return (targetMediaState?.type == "infoMedia" ? targetMediaState.src : "");
	                }
	                case "getAttribute": {
	                    return (/** @type {string} */ attrKey) =>
	                    {
	                        // console.log("get", attrKey);
	                        if (attrKey == "src")
	                        {
	                            return (targetMediaState?.type == "infoMedia" ? targetMediaState.src : "");
	                        }
	                        return old_infosound.getAttribute(attrKey);
	                    };
	                }
	                case "setAttribute": {
	                    return (/** @type {string} */ attrKey, /** @type {string} */ attrValue) =>
	                    {
	                        // console.log("set", attrKey, attrValue);
	                        if (attrKey == "src")
	                        {
	                            if (attrValue == "")
	                            {
	                                tryMuteInfoMedia = true;

	                                targetMediaState = { type: "roomMedia" };
	                                refreshButton();
	                            }
	                            else
	                            {
	                                targetMediaState = { type: "infoMedia", src: attrValue };
	                            }
	                        }
	                        else
	                            old_infosound.setAttribute(attrKey, attrValue);
	                    };
	                }
	            }
	            if (typeof (srcValue) == "function")
	                return srcValue.bind(old_infosound);
	            else
	                return srcValue;
	        },
	        set: (_target, key, value) =>
	        {
	            // console.log("info media do set", key, value);
	            switch (key)
	            {
	                case "src": {
	                    targetMediaState = { type: "infoMedia", src: value };
	                    if (old_infosound.src == value)
	                        ;
	                    else if (
	                        (
	                            tryMuteInfoMedia
	                        ) ||
	                        (
	                            tryMuteRoomMedia &&
	                            (
	                                isAudioHearable(old_shareMediaObjAudio)
	                            )
	                        )
	                    )
	                    {
	                        setTimeout(() => { refreshButton(); }, 10);
	                    }
	                    else
	                    {
	                        old_infosound.src = value;
	                        old_infosound.play();
	                        if (tryMuteRoomMedia)
	                        {
	                            old_playerSoundOff();
	                            tryMuteRoomMedia = false;
	                        }
	                        if (tryMuteInfoMedia)
	                        {
	                            old_infosound.play();
	                            tryMuteInfoMedia = false;
	                        }
	                    }
	                    break;
	                }
	                case "currentTime": {
	                    if (tryMuteInfoMedia)
	                        ;
	                    else
	                        old_infosound.currentTime = value;
	                    break;
	                }
	                default:
	                    old_infosound[key] = value;
	            }
	            return true;
	        },
	    });


	    iframeContext.iframeWindow["playerSoundOff"] = proxyFunction(old_playerSoundOff, (param) =>
	    {
	        setTimeout(() =>
	        {
	            refreshButton();
	        }, 10);

	        if (
	            param[0] == undefined &&
	            (
	                isAudioHearable(old_shareMediaObjAudio)
	            )
	        )
	        {
	            tryMuteRoomMedia = true;
	            return true;
	        }
	        else if (param[0] == 1)
	        {
	            targetMediaState = { type: "roomMedia" };

	            if (
	                isAudioHearable(old_infosound)
	            )
	            {
	                return true;
	            }
	        }
	        tryMuteRoomMedia = false;
	        return false;
	    });


	    /**
	     * 刷新按钮 按需显示
	     */
	    function refreshButton()
	    {
	        if (
	            targetMediaState?.type == "roomMedia" &&
	            isAudioHearable(old_infosound)
	        )
	        {
	            buttonData.text = "转回房间音频";
	            showFloatingButton();
	        }
	        else if (
	            targetMediaState?.type == "infoMedia" &&
	            (
	                targetMediaState.src != old_infosound.src ||
	                !isAudioHearable(old_infosound)
	            )
	        )
	        {
	            buttonData.text = "转到资料音频";
	            showFloatingButton();
	        }
	        else
	            hideFloatingButton();
	    }

	    /**
	     * 显示悬浮窗
	     */
	    function showFloatingButton()
	    {
	        if (buttonElement)
	        {
	            buttonElement.setDisplay("block");
	            return;
	        }

	        if (!showedNotice)
	        {
	            showNotice("接管音频", "您正在使用forge测试功能(接管音频)\n如果存在问题请在 附加功能 中关闭");
	            showedNotice = true;
	        }

	        let x = 0, y = 0;
	        let allowClick = false;

	        buttonElement = NList.getElement([
	            createNStyleList({
	                position: "fixed",
	                overflow: "hidden",
	                border: "1px white solid",
	                backgroundColor: "rgba(30, 30, 30, 0.55)",
	                backdropFilter: "blur(2px)",
	                color: "rgba(255, 255, 255)",
	                alignItems: "center",
	                justifyContent: "center",
	                flexFlow: "column",
	                lineHeight: "1.1em",
	                boxSizing: "border-box",
	                padding: "1px",
	                borderRadius: "2.5px",
	                zIndex: "90000001",
	                height: "50px",
	                minWidth: "50px"
	            }),

	            [
	                createNStyleList({
	                    display: "flex",
	                    height: "100%",
	                    paddingLeft: "1em",
	                    paddingRight: "1em",
	                    justifyContent: "center",
	                    alignItems: "center",
	                }),

	                bindValue(buttonData, "text"),

	                new NEvent("mousedown", e => e.preventDefault()),
	                new NEvent("mouseup", e => e.preventDefault()),
	                new NEvent("click", () =>
	                {
	                    if (!allowClick)
	                    {
	                        allowClick = false;
	                        return;
	                    }

	                    if (targetMediaState?.type == "roomMedia")
	                    {
	                        old_infosound.setAttribute("src", "");
	                        // if (tryUnmuteRoomMedia)
	                        {
	                            old_playerSoundOff(1);
	                        }
	                        if (tryMuteInfoMedia)
	                        {
	                            tryMuteInfoMedia = false;
	                        }
	                        hideFloatingButton();
	                    }
	                    else if (targetMediaState?.type == "infoMedia")
	                    {
	                        showFloatingButton();
	                        old_infosound.src = targetMediaState?.src;
	                        old_infosound.play();
	                        if (tryMuteRoomMedia)
	                        {
	                            old_playerSoundOff();
	                            tryMuteRoomMedia = false;
	                        }
	                        if (tryMuteInfoMedia)
	                        {
	                            old_infosound.play();
	                            tryMuteInfoMedia = false;
	                        }
	                        hideFloatingButton();
	                    }
	                })
	            ],

	            e =>
	            {
	                let ox = 0, oy = 0;

	                /**
	                 * 按下的时间
	                 */
	                let startPressTime = 0;
	                /**
	                 * 位置未移动
	                 */
	                let notMove = false;
	                let proc = (/** @type {{ sx: number, sy: number, x: number, y: number, pressing: boolean,hold: boolean }} */ e) =>
	                {
	                    let now = Date.now();
	                    if (e.pressing)
	                    {
	                        startPressTime = now;
	                        notMove = true;
	                        allowClick = false;
	                    }
	                    if (Math.abs(e.x - e.sx) > 10 || Math.abs(e.y - e.sy) > 10)
	                        notMove = false;
	                    if (!e.hold)
	                    {
	                        if (notMove && now - startPressTime < 150)
	                        {
	                            let startTargetElement = iframeContext.iframeDocument.elementFromPoint(e.sx, e.sy);
	                            let endTargetElement = iframeContext.iframeDocument.elementFromPoint(e.x, e.y);
	                            if (startTargetElement == endTargetElement)
	                            {
	                                allowClick = true;
	                                startTargetElement.dispatchEvent(new MouseEvent("click"));
	                            }
	                        }
	                    }

	                    if (e.pressing)
	                    {
	                        ox = x;
	                        oy = y;
	                        // pageManager.moveToTop(this);
	                    }
	                    x = ox + e.x - e.sx;
	                    y = oy + e.y - e.sy;
	                    if (x < 0)
	                        x = 0;
	                    else if (x >= body.element.clientWidth - buttonElement.element.offsetWidth)
	                        x = body.element.clientWidth - buttonElement.element.offsetWidth;
	                    if (y < 0)
	                        y = 0;
	                    else if (y >= body.element.clientHeight - buttonElement.element.offsetHeight)
	                        y = body.element.clientHeight - buttonElement.element.offsetHeight;
	                    buttonElement.setStyle("left", `${x}px`);
	                    buttonElement.setStyle("top", `${y}px`);
	                };

	                e.addEventListener("mousedown", e => e.preventDefault(), true);
	                e.addEventListener("mouseup", e => e.preventDefault(), true);
	                mouseBind(e, proc, 0, iframeContext.iframeWindow);
	                touchBind(e, proc);

	                e.addEventListener("mousedown", e => e.stopPropagation());
	                e.addEventListener("mouseup", e => e.stopPropagation());
	                e.addEventListener("touchstart", e => e.stopPropagation());
	                e.addEventListener("touchend", e => e.stopPropagation());
	                e.addEventListener("touchcancel", e => e.stopPropagation());
	            },
	        ]);

	        iframeContext.iframeBody.addChild(buttonElement);
	    }

	    /**
	     * 隐藏悬浮窗
	     */
	    function hideFloatingButton()
	    {
	        if (buttonElement)
	        {
	            buttonElement.setDisplay("none");
	        }
	    }
	}

	/**
	 * 启用会话置顶
	 */
	function enablePinSession()
	{
	    addMenuHook(
	        "pinSession",
	        "sessionMenu",
	        e => (storageContext.processed.pinSessionSet.has(e.uid) ? { icon: "pin-off", text: "取消置顶" } : { icon: "pin", text: "置顶会话" }),
	        e =>
	        {
	            if (storageContext.processed.pinSessionSet.has(e.uid))
	            {
	                storageContext.processed.pinSessionSet.delete(e.uid);
	                showNotice("置顶会话", "已取消置顶会话");
	            }
	            else
	            {
	                storageContext.processed.pinSessionSet.add(e.uid);
	                showNotice("置顶会话", "已置顶会话");
	            }
	            storageRoamingSave();
	            refresh();
	        }
	    );


	    let enabled = false;
	    /**
	     * @type {() => void}
	     */
	    let refreshList = null;

	    if (storageContext.processed.pinSessionSet.size > 0)
	        init();

	    function init()
	    {
	        if (enabled)
	            return;
	        enabled = true;

	        // 私聊选项卡列表
	        let sessionHolderPmTaskBox = iframeContext.iframeDocument.getElementsByClassName("sessionHolderPmTaskBox")[0];
	        let recentSessionLable = sessionHolderPmTaskBox.children[1];
	        let pinnedSessionLable = NList.getElement([
	            className("sessionHolderSpliter"),
	            "置顶会话"
	        ]).element;
	        sessionHolderPmTaskBox.children[0].after(pinnedSessionLable);
	        refreshList = () =>
	        {
	            Array.from(sessionHolderPmTaskBox.children).reverse().forEach(o =>
	            {
	                if (
	                    o.classList.length == 2 &&
	                    o.classList.contains("sessionHolderPmTaskBoxItem") &&
	                    o.classList.contains("whoisTouch2") &&
	                    o != sessionHolderPmTaskBox.children[0]
	                )
	                {
	                    let uid = o.getAttribute("ip");
	                    let pinned = storageContext.processed.pinSessionSet.has(uid);
	                    let positionBitmap = recentSessionLable.compareDocumentPosition(o);
	                    if ((positionBitmap & 2) && !pinned)
	                    {
	                        recentSessionLable.after(o);
	                    }
	                    else if ((positionBitmap & 4) && pinned)
	                    {
	                        pinnedSessionLable.after(o);
	                    }
	                }
	            });
	        };
	        refreshList();
	        (new MutationObserver(mutationsList =>
	        {
	            for (let mutation of mutationsList)
	            {
	                if (mutation.type == "childList")
	                {
	                    Array.from(mutation.addedNodes).forEach((/** @type {HTMLElement} */o) =>
	                    { // 处理新增的私聊选项卡
	                        if (o.classList != undefined && o.classList.contains("sessionHolderPmTaskBoxItem"))
	                        {
	                            if (
	                                o.classList.length == 2 &&
	                                o.classList.contains("sessionHolderPmTaskBoxItem") &&
	                                o.classList.contains("whoisTouch2")
	                            )
	                            {
	                                let uid = o.getAttribute("ip");
	                                let pinned = storageContext.processed.pinSessionSet.has(uid);
	                                if ((recentSessionLable.compareDocumentPosition(o) & 2) && !pinned)
	                                {
	                                    recentSessionLable.after(o);
	                                }
	                            }
	                        }
	                    });
	                }
	            }
	        })).observe(sessionHolderPmTaskBox, { attributes: false, childList: true, subtree: true, characterData: true, characterDataOldValue: true });
	    }

	    function refresh()
	    {
	        if (!enabled)
	            init();
	        refreshList();
	    }
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
	                func: enableMonitor
	            },
	            {
	                func: enableBeautify
	            },
	            {
	                func: enablePatch
	            },
	            {
	                func: enableUserRemark,
	                condition: "enableUserRemark"
	            },
	            {
	                func: enableRoomAdminOperation,
	                condition: "enableRoomAdminOperation"
	            },
	            {
	                func: enableAudioTakeover,
	                condition: "enableAudioTakeover"
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
	            },
	            {
	                func: enableBlacklist
	            },
	            {
	                func: enablePinSession,
	                condition: "enablePinSession"
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
	                        await writeForgeToCache(false);
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
	            let showedHelpNotice = false;
	            setInterval(() =>
	            {
	                if (mainIframe.contentWindow?.["socket"]?.readyState == 0)
	                {
	                    if (cannotLoad >= 2)
	                    {
	                        if (!showedHelpNotice)
	                        {
	                            showedHelpNotice = true;
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
	                                    showedHelpNotice = false;
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
	                    showedHelpNotice = false;
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
	            script.text = injectorScript;
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
