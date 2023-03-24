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
            else if (nowKey instanceof NStyle)
                ret.setStyle(nowKey.key, nowKey.value);
            else if (nowKey instanceof NEvent)
                ret.addEventListener(nowKey.eventName, nowKey.callback);
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

export { NAsse, NAttr, NElement, NEvent, NList, NStyle, NTagName, createNStyle, cssG, divideLayout_DU, divideLayout_LR, divideLayout_RL, divideLayout_UD, expandElement, getNElement, mouseBind, runOnce, tag, tagName, touchBind };
