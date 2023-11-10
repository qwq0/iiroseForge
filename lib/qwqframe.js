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
        animate.commitStyles();
        animate.cancel();
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
 * 绑定元素属性到对象作为getter/setter
 * @template {Object} T
 * @param {string} attrName
 * @param {T} obj
 * @param {(keyof T) | (string & {})} key
 * @param {boolean} [noInitialize] 不将对象中原来的值赋给元素属性
 * @returns {(element: NElement) => void} 流水线函数
 */
function bindAttribute(attrName, obj, key, noInitialize = false)
{
    return ((ele) =>
    {
        // @ts-ignore
        if (Object.hasOwn(obj, key))
        {
            if (!noInitialize)
                // @ts-ignore
                ele.element[attrName] = obj[key];
            // @ts-ignore
            delete obj[key];
        }
        Object.defineProperty(obj, key, {
            get: () =>
            {
                return ele.element[attrName];
            },
            set: (newValue) =>
            {
                ele.element[attrName] = newValue;
            },
            enumerable: true,
            configurable: true
        });
    });
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
 * 左右方向分割
 * @param {string} leftSize
 * @param {NElement | import("./expandElement").EDObj} a
 * @param {NElement | import("./expandElement").EDObj} b
 * @returns {NElement}
 */
function divideLayout_LR(leftSize, a, b)
{
    return divideLayout(expandElement({
        style: {
            flexFlow: "row"
        },
        child: [
            a,
            b
        ],
        assembly: [e =>
        {
            e.getChild(0).setStyles({
                width: leftSize,
                minWidth: leftSize
            });
        }]
    }));
}

/**
 * 上下方向分割
 * @param {string} upSize
 * @param {NElement | import("./expandElement").EDObj} a
 * @param {NElement | import("./expandElement").EDObj} b
 * @returns {NElement}
 */
function divideLayout_UD(upSize, a, b)
{
    return divideLayout(expandElement({
        style: {
            flexFlow: "column"
        },
        child: [
            a,
            b
        ],
        assembly: [e =>
        {
            e.getChild(0).setStyles({
                height: upSize,
                minHeight: upSize
            });
        }]
    }));
}

/**
 * 右左方向分割
 * @param {string} rightSize
 * @param {NElement | import("./expandElement").EDObj} a
 * @param {NElement | import("./expandElement").EDObj} b
 * @returns {NElement}
 */
function divideLayout_RL(rightSize, a, b)
{
    return divideLayout(expandElement({
        style: {
            flexFlow: "row-reverse"
        },
        child: [
            a,
            b
        ],
        assembly: [e =>
        {
            e.getChild(0).setStyles({
                width: rightSize,
                minWidth: rightSize
            });
        }]
    }));
}

/**
 * 下上方向分割
 * @param {string} downSize
 * @param {NElement | import("./expandElement").EDObj} a
 * @param {NElement | import("./expandElement").EDObj} b
 * @returns {NElement}
 */
function divideLayout_DU(downSize, a, b)
{
    return divideLayout(expandElement({
        style: {
            flexFlow: "column-reverse"
        },
        child: [
            a,
            b
        ],
        assembly: [e =>
        {
            e.getChild(0).setStyles({
                height: downSize,
                minHeight: downSize
            });
        }]
    }));
}

/**
 * 设置为分割视图
 * @param {NElement} p 父节点
 * @returns {NElement} 返回父节点
 */
function divideLayout(p)
{
    p.setDisplay("flex");
    p.setStyles({
        alignItems: "stretch",
        justifyContent: "space-between"
    });
    let childs = p.getChilds();
    childs[1].setStyle("flexGrow", 1);
    return p;
}

/**
 * 解析标签
 * @param {string} tagName
 * @param {TemplateStringsArray} strings
 * @typedef {NElement | NStyle | NEvent} parsingElementKeysType
 * @param {Array<parsingElementKeysType>} keys
 * @returns {NElement}
 */
function parsingElement(tagName, strings, ...keys)
{
    let ret = getNElement(document.createElement(tagName));
    for (let i = 0; i < strings.length; i++)
    {
        let text = strings[i].trim();
        if (text)
            ret.element.appendChild(document.createTextNode(text));
        if (keys[i])
        {
            let nowKey = keys[i];
            if (nowKey instanceof NElement)
                ret.addChild(nowKey);
            else if (nowKey instanceof NStyle || nowKey instanceof NEvent)
                nowKey.apply(ret);
            else if (nowKey)
                throw "parsingElement error: Unprocessed type";
        }
    }
    return ret;
}

/**
 * 解析标签
 * 默认为div标签
 * @param {TemplateStringsArray} strings
 * @param {Array<parsingElementKeysType>} keys
 * @returns {NElement}
 */
function tag(strings, ...keys)
{
    return parsingElement("div", strings, ...keys);
}

/**
 * 解析指定标签名的标签
 * @param {string} name
 * @returns {function(TemplateStringsArray, ...parsingElementKeysType): NElement}
 */
function tagName(name)
{
    return parsingElement.bind(null, name);
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
        window.removeEventListener("mousemove", mousemoveP, false);
        window.removeEventListener("mouseup", mouseupP, false);
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

    /**
     * @type {Array<{
     *  id: number,
     *  sx: number,
     *  sy: number,
     *  x: number,
     *  y: number
     * }>}
     */
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
        forEach(e.changedTouches, o =>
        {
            let t = {
                id: o.identifier,
                sx: o.clientX,
                sy: o.clientY,
                x: o.clientX,
                y: o.clientY
            };
            ogTouches.push(t);
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
            let ind = getTouchesInd(o.identifier);
            if (ind > -1)
            {
                let t = ogTouches[ind];
                let vx = o.clientX - t.x;
                let vy = o.clientY - t.y;
                t.x = o.clientX;
                t.y = o.clientY;
                callBack(new PointerData(
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
        e.changedTouches;
        forEach(e.changedTouches, o =>
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
                callBack(new PointerData(
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
 * 包装为仅能执行一次的函数
 * @template P
 * @template R
 * @template {function(...P) : R} T
 * @param {T} func
 * @returns {T}
 */
function runOnce(func)
{
    let runned = false;
    return /** @type {T} */ ((...para) =>
    {
        if (runned)
            return null;
        else
        {
            runned = true;
            return func(...para);
        }
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
 * 代理数组 到 钩子映射和目标对象 映射
 * 
 * @type {WeakMap<object, {
*  hookSet: Set<import("./ArrayHookBind").ArrayHookBind>,
*  srcArr: Array
* }>}
*/
const arrayProxyMap = new WeakMap();

/**
 * 目标对象 到 引用集合 映射
 *
 * 确保当目标对象存活时引用集合的引用存活
 * @type {WeakMap<object, Set<any>>}
 */
const targetRefMap = new WeakMap();

/**
 * 记录器

 * 在目标对象销毁时销毁钩子
 * @type {FinalizationRegistry<import("./ArrayHookBind").ArrayHookBind>}
 */
const register = new FinalizationRegistry(heldValue =>
{
    heldValue.destroy();
});

/**
 * 数组钩子绑定类
 */
class ArrayHookBind
{
    /**
     * 回调函数的弱引用
     * @type {WeakRef<typeof ArrayHookBind.prototype.callback>}
     */
    cbRef = null;

    /**
     * 回调函数
     * 当此钩子绑定自动释放时为null
     */
    callback = {
        /** @type {(index: number, value: any) => void} */
        set: null,
        /** @type {(index: number, value: any) => void} */
        add: null,
        /** @type {(index: number) => void} */
        del: null
    };

    /**
     * @param {typeof ArrayHookBind.prototype.callback} callback
     */
    constructor(callback)
    {
        this.cbRef = new WeakRef(callback);
        this.callback = Object.assign({}, callback);
    }

    /**
     * 触发此钩子 (设置)
     * @param {number} index
     * @param {any} value
     */
    emitSet(index, value)
    {
        let callback = this.cbRef.deref();
        if (callback)
        {
            try
            {
                callback.set(index, value);
            }
            catch (err)
            {
                console.error(err);
            }
        }
    }

    /**
     * 触发此钩子 (增加)
     * @param {number} index
     * @param {any} value
     */
    emitAdd(index, value)
    {
        let callback = this.cbRef.deref();
        if (callback)
        {
            try
            {
                callback.add(index, value);
            }
            catch (err)
            {
                console.error(err);
            }
        }
    }

    /**
     * 触发此钩子 (删除)
     * @param {number} index
     */
    emitDel(index)
    {
        let callback = this.cbRef.deref();
        if (callback)
        {
            try
            {
                callback.del(index);
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
        register.unregister(this);
    }

    /**
     * 绑定销毁
     * 当目标对象释放时销毁
     * @param {object} targetObj
     * @returns {ArrayHookBind} 返回自身
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
 * 创建数组的代理
 * @template {Array} T
 * @param {T} srcArray
 * @returns {T}
 */
function createHookArray(srcArray)
{
    let oldLength = srcArray.length;

    /**
     * @type {Set<ArrayHookBind>}
     */
    let hookSet = new Set();

    /**
     * @param {number} ind
     * @param {any} value
     */
    function emitSet(ind, value)
    {
        hookSet.forEach(o => { o.emitSet(ind, value); });
    }
    /**
     * @param {number} ind
     * @param {any} value
     */
    function emitAdd(ind, value)
    {
        hookSet.forEach(o => { o.emitAdd(ind, value); });
    }
    /**
     * @param {number} ind
     */
    function emitDel(ind)
    {
        hookSet.forEach(o => { o.emitDel(ind); });
    }

    const proxyArray = (new Proxy(srcArray, {
        get: (target, key) => // 取值
        {
            switch (key)
            {
                case "push":
                    return (/** @type {any[]} */ ...items) =>
                    {
                        items.forEach(o =>
                        {
                            oldLength++;
                            emitAdd(oldLength - 1, o);
                        });
                        return srcArray.push(...items);
                    };
                case "pop":
                    return () =>
                    {
                        oldLength--;
                        emitDel(oldLength);
                        return srcArray.pop();
                    };
                case "unshift":
                    return (/** @type {any[]} */ ...items) =>
                    {
                        items.forEach((o, ind) =>
                        {
                            oldLength++;
                            emitAdd(ind, o);
                        });
                        return srcArray.unshift(...items);
                    };
                case "shift":
                    return () =>
                    {
                        oldLength--;
                        emitDel(0);
                        return srcArray.shift();
                    };
                case "splice":
                    return (/** @type {number} */ start, deleteCount = Infinity, /** @type {Array} */ ...items) =>
                    {
                        let actualStartIndex = (
                            start >= 0 ?
                                (
                                    start >= oldLength ? oldLength : start
                                ) :
                                (
                                    start < -oldLength ? 0 : start + oldLength
                                )
                        );
                        let actualDeleteCount = (
                            deleteCount > 0 ?
                                Math.min(deleteCount, oldLength - actualStartIndex) :
                                0
                        );
                        for (let i = 0; i < actualDeleteCount; i++)
                        {
                            oldLength--;
                            emitDel(actualStartIndex);
                        }
                        items.forEach((o, ind) =>
                        {
                            oldLength++;
                            emitAdd(actualStartIndex + ind, o);
                        });
                        return srcArray.splice(start, deleteCount, ...items);
                    };
                case "forEach":
                case "map":
                case "every":
                case "some":
                case "join":
                case "find":
                case "findIndex":
                case "findLast":
                case "findLastIndex":
                case "flat":
                case "flatMap":
                case "includes":
                case "indexOf":
                case "slice":
                    return (/** @type {any} */ ...arg) =>
                    {
                        // @ts-ignore
                        return srcArray[key](...arg);
                    };
                default:
                    return Reflect.get(target, key);
            }
        },

        set: (target, key, newValue) => // 设置值
        {
            let ret = Reflect.set(target, key, newValue);
            if (ret)
            {
                if (key == "length")
                {
                    let oldLengthBefore = oldLength;
                    oldLength = newValue;
                    if (newValue < oldLengthBefore)
                    {
                        for (let i = oldLengthBefore - 1; i >= newValue; i--)
                            emitDel(i);
                    }
                    else if (newValue > oldLengthBefore)
                    {
                        for (let i = oldLengthBefore; i < newValue; i++)
                            emitAdd(i, undefined);
                    }
                }
                else if ((typeof (key) == "string" && (/^[1-9][0-9]*$/.test(key) || key == "0")) || typeof (key) == "number")
                {
                    let ind = Number(key);
                    if (ind >= oldLength)
                    {
                        let oldLengthBefore = oldLength;
                        oldLength = ind + 1;
                        if (ind >= oldLengthBefore + 1)
                        {
                            for (let i = oldLengthBefore; i < ind; i++)
                                emitAdd(i, undefined);
                        }
                        emitAdd(ind, newValue);
                    }
                    else
                    {
                        emitSet(ind, newValue);
                    }
                }
            }
            return ret;
        },
    }));
    arrayProxyMap.set(proxyArray, { hookSet: hookSet, srcArr: srcArray });
    return proxyArray;
}


/**
 * 绑定数组的代理
 * 回调函数中不应当进行可能触发钩子的操作
 * @template {Array} T
 * @param {T} proxyArray
 * @param {{
 *  set?: (index: number, value: any) => void;
 *  add: (index: number, value: any) => void;
 *  del: (index: number) => void;
 * }} callbacks
 * @param {{ noSet?: boolean, addExisting?: boolean }} [option]
 * @returns {ArrayHookBind}
 */
function bindArrayHook(proxyArray, callbacks, option = {})
{
    const proxyMata = arrayProxyMap.get(proxyArray);
    if (proxyMata == undefined)
        throw "bindArrayHook: Hook callbacks can only be bound from proxy array";

    option = Object.assign({
        noSet: false,
        addExisting: false
    }, option);

    let callbackObj = Object.assign({
        set: () => { },
        add: () => { },
        del: () => { },
    }, callbacks);

    if (option.noSet)
    {
        if (callbacks.set != undefined)
        {
            throw "bindArrayHook: cannot pass the set function when setting the noSet option";
        }
        callbackObj.set = (ind, value) =>
        {
            callbackObj.del(ind);
            callbackObj.add(ind, value);
        };
    }


    if (option.addExisting)
    {
        try
        {
            proxyMata.srcArr.forEach((e, ind) =>
            {
                callbackObj.add(ind, e);
            });
        }
        catch (err)
        {
            console.log(err);
        }
    }

    let ret = new ArrayHookBind(callbackObj);
    proxyMata.hookSet.add(ret);
    return ret;
}

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
}

export { EventHandler, NAsse, NAttr, NElement, NEvent, NList, NStyle, NTagName, bindArrayHook, bindAttribute, bindValue, createHookArray, createHookObj, createNStyle, createNStyleList, cssG, delayPromise, divideLayout_DU, divideLayout_LR, divideLayout_RL, divideLayout_UD, expandElement, getNElement, mouseBind, runOnce, tag, tagName, touchBind };
