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
	 * dom元素的封装
	 * @template {HTMLElement} ElementObjectType
	 */
	class NElement
	{
	    /**
	     * @type {ElementObjectType}
	     */
	    element = null;

	    /**
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
	     * @param {string | number} value
	     */
	    setStyle(styleName, value)
	    {
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
	     * @param {{ [x in import("../feature/NStyle").keyOfStyle]?: string | number | undefined }} obj
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
	     */
	    addText(text)
	    {
	        this.element.appendChild(document.createTextNode(text));
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
	}

	const symbolKey = Symbol("NElement");

	/**
	 * 根据HTMLElement对象获取NElement对象
	 * 如果没有则生成
	 * @template {HTMLElement} ElementObjectType
	 * @param {ElementObjectType} element
	 * @returns {NElement<ElementObjectType>}
	 */
	function getNElement(element)
	{
	    if (element[symbolKey])
	        return element[symbolKey];
	    else
	        return element[symbolKey] = new NElement(element);
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
	 * @typedef {(keyof CSSStyleDeclaration) | (string & {})} keyOfStyle
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
	     * @type {string}
	     */
	    value = null;

	    /**
	     * @param {T} key
	     * @param {string} value
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
	        e.setStyle(this.key, /** @type {string | number} */(this.value));
	    }
	}

	/**
	 * 创建NStyle 省略new
	 * @param {keyOfStyle} key
	 * @param {string} value
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
	 * @typedef {{
	 *      [x in (keyof HTMLElement)]: any
	 *  } | {
	 *      [x: string]: any
	 * }} keyObjectOfHtmlElementAttr
	 */
	/**
	 * 属性
	 * @template {keyof keyObjectOfHtmlElementAttr} T
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
	 * @typedef {Array<string | NTagName | NStyle | NAttr | NEvent | NAsse | NList | NList_list | NElement>} NList_list
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
	        let tagName = element.getTagName();
	        this.list.forEach(o =>
	        {
	            if (typeof (o) == "string") // 内部文本
	                element.addText(o);
	            else if (o instanceof NTagName) // 标签名
	            {
	                if (tagName != o.tagName)
	                    throw "(NList) The feature tagName does not match the element";
	            }
	            else if (
	                (o instanceof NStyle) || // 样式
	                (o instanceof NAttr) || // 元素属性
	                (o instanceof NEvent) || // 事件
	                (o instanceof NAsse) // 流水线
	            )
	                o.apply(element);
	            else if (o instanceof NElement) // 子元素
	                element.addChild(o);
	            else if (o instanceof NList) // 子列表
	            {
	                if (o.flatFlag) // 子特征(列表)
	                    o.apply(element);
	                else // 子元素(列表)
	                    element.addChild(o.getElement());
	            }
	            else if (Array.isArray(o)) // 子元素(列表)
	                element.addChild(NList.getElement(o));
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
	 * 主iframe的上下文
	 */
	let iframeCt = {
	    iframeWindow: null,
	    iframeDocument: null,
	    socket: null
	};


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

	            functionHolder.insChild(button, 1); // 添加菜单到左侧菜单栏第二个按钮前
	        })();

	        iframeCt.iframeDocument = iframeDocument;
	        iframeCt.iframeWindow = iframeWindow;

	        iframeCt.socket = iframeWindow["socket"];

	        (() => // 注入socket
	        {
	            iframeCt.socket._onmessage = proxyFunction(iframeCt.socket._onmessage.bind(iframeCt.socket), (data) =>
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
