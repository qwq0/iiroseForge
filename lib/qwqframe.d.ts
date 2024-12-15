/**
 * 按键数据
 * 当发生键盘事件时传递
 * 包含按键和按下状态等数据
 */
declare class KeyboardData$1 {
    /**
     * @param {string} key
     * @param {boolean} hold
     * @param {boolean} pressing
     */
    constructor(key: string, hold: boolean, pressing: boolean);
    /**
     * 操作的键名
     * @type {string}
     */
    key: string;
    /**
     * 当前键目前是否被按下
     * @type {boolean}
     */
    hold: boolean;
    /**
     * 当前键是否刚按下
     * (键按下时第一次为true)
     * @type {boolean}
     */
    pressing: boolean;
}

/**
 * 指针数据
 * 当发生鼠标或触摸事件时传递
 * 包含指针坐标和按下状态等数据
 */
declare class PointerData$1 {
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
    constructor(x: number, y: number, vx: number, vy: number, sx: number, sy: number, hold: boolean, pressing: boolean);
    /**
     * 当前指针位置x
     * @type {number}
    */
    x: number;
    /**
     * 当前指针位置y
     * @type {number}
    */
    y: number;
    /**
     * 指针位置和上次位置的变化x
     * @type {number}
    */
    vx: number;
    /**
     * 指针位置和上次位置的变化y
     * @type {number}
    */
    vy: number;
    /**
     * 此指针的起始位置x
     * @type {number}
    */
    sx: number;
    /**
     * 此指针的起始位置y
     * @type {number}
    */
    sy: number;
    /**
     * 当前此指针是否处于按下状态
     * @type {boolean}
    */
    hold: boolean;
    /**
     * 当前指针是否正在按下(按下事件)
     * @type {boolean}
    */
    pressing: boolean;
}

/**
 * 钩子绑定到值类
 */
declare class HookBindValue {
    /**
     * @param {import("./HookBindInfo").HookBindInfo} info
     * @param {object} targetObj
     * @param {string | symbol} targetKey
     */
    constructor(info: HookBindInfo, targetObj: object, targetKey: string | symbol);
    /**
     * 触发此钩子
     * 销毁后仍可通过此方法手动触发
     */
    emit(): void;
    /**
     * 销毁此钩子
     * 销毁后钩子将不再自动触发
     */
    destroy(): void;
    #private;
}

/**
 * 钩子绑定到回调类
 */
declare class HookBindCallback {
    /**
     * @param {import("./HookBindInfo").HookBindInfo} info
     * @param {function(any): void} callback
     */
    constructor(info: HookBindInfo, callback: (arg0: any) => void);
    /**
     * 触发此钩子
     */
    emit(): void;
    /**
     * 销毁此钩子
     * 销毁后钩子将不再自动触发
     */
    destroy(): void;
    /**
     * 绑定销毁
     * 当目标对象释放时销毁
     * @param {object} targetObj
     * @returns {HookBindCallback} 返回自身
     */
    bindDestroy(targetObj: object): HookBindCallback;
    #private;
}

/**
 * 钩子绑定信息
 */
declare class HookBindInfo {
    /**
     * @param {object} proxyObj
     * @param {object} srcObj
     * @param {Array<string | symbol>} keys
     * @param {Map<string | symbol, Set<HookBindValue | HookBindCallback>>} hookMap
     * @param {function(...any): any} ctFunc
     */
    constructor(proxyObj: object, srcObj: object, keys: Array<string | symbol>, hookMap: Map<string | symbol, Set<HookBindValue | HookBindCallback>>, ctFunc: (...args: any[]) => any);
    proxyObj: any;
    /**
     * 获取此钩子绑定的值
     */
    getValue(): any;
    /**
     * 添加钩子
     * @package
     * @param {HookBindValue | HookBindCallback} hookObj
     */
    addHook(hookObj: HookBindValue | HookBindCallback): void;
    /**
     * 移除钩子
     * @package
     * @param {HookBindValue | HookBindCallback} hookObj
     */
    removeHook(hookObj: HookBindValue | HookBindCallback): void;
    /**
     * 绑定到值
     * @template {Object} T
     * @param {T} targetObj
     * @param {(keyof T) | (string & {}) | symbol} targetKey
     * @returns {HookBindValue}
     */
    bindToValue<T extends unknown>(targetObj: T, targetKey: (keyof T) | (string & {}) | symbol): HookBindValue;
    /**
     * 绑定到回调函数
     * @param {function(any): void} callback
     * @returns {HookBindCallback}
     */
    bindToCallback(callback: (arg0: any) => void): HookBindCallback;
    #private;
}

/**
 * 创建NStyle 省略new
 * @param {keyOfStyle} key
 * @param {string | HookBindInfo} value
 */
declare function createNStyle(key: keyOfStyle, value: string | HookBindInfo): NStyle<keyOfStyle>;
/**
 * 创建一组NStyle的flat NList
 * @param {{ [x in keyOfStyle]?: string | HookBindInfo }} obj
 */
declare function createNStyleList(obj: { [x in keyOfStyle]?: string | HookBindInfo; }): NList;
/**
 * @typedef {(keyof CSSStyleDeclaration & string) | (string & {})} keyOfStyle
 */
/**
 * 样式
 * @template {keyOfStyle} T
 */
declare class NStyle<T extends keyOfStyle> {
    /**
     * @param {T} key
     * @param {string | HookBindInfo} value
     */
    constructor(key: T, value: string | HookBindInfo);
    /**
     * @type {T}
     */
    key: T;
    /**
     * @type {string | HookBindInfo}
     */
    value: string | HookBindInfo;
    /**
     * 将此特征应用于元素
     * @param {import("../node/NElement.js").NElement} e
     */
    apply(e: NElement<any>): void;
}
type keyOfStyle = (keyof CSSStyleDeclaration & string) | (string & {});

/**
 * Text节点的封装
 * 用于进行节点定位
 * @typedef {import("./NLocate").NLocate} NLocate
 */
declare class NText$1 {
    /**
     * @param {string | Text} text
     */
    constructor(text: string | Text);
    /**
     * Text节点
     * @type {Text}
     */
    node: Text;
    /**
     * 获取父元素
     * @returns {NElement}
     */
    getParent(): NElement<any>;
    /**
     * 设置此文本节点的文本
     * @param {string} text
     */
    setText(text: string): void;
    /**
     * 在此节点之前插入节点
     * @param {NElement | NLocate | NText} target
     */
    insBefore(target: NElement<any> | NLocate$1 | NText$1): void;
    /**
     * 在此节点之后插入节点
     * @param {NElement | NLocate | NText} target
     */
    insAfter(target: NElement<any> | NLocate$1 | NText$1): void;
    /**
     * 使用指定节点替换此节点
     * @param {Array<NElement | NText | NLocate>} elements
     */
    replaceWith(...elements: Array<NElement<any> | NText$1 | NLocate$1>): void;
}
/**
 * Text节点的封装
 * 用于进行节点定位
 */
type NLocate$1 = NLocate;

/**
 * Comment节点的封装
 * 用于进行节点定位
 * @typedef {import("./NText").NText} NText
 */
declare class NLocate {
    /**
     * @param {Comment} [node]
     */
    constructor(node?: Comment | undefined);
    /**
     * Comment节点
     * @type {Comment}
     */
    node: Comment;
    /**
     * 获取父元素
     * @returns {NElement}
     */
    getParent(): NElement<any>;
    /**
     * 在此节点之前插入节点
     * @param {NElement | NLocate | NText} target
     */
    insBefore(target: NElement<any> | NLocate | NText): void;
    /**
     * 在此节点之后插入节点
     * @param {NElement | NLocate | NText} target
     */
    insAfter(target: NElement<any> | NLocate | NText): void;
    /**
     * 使用指定节点替换此节点
     * @param {Array<NElement | NText | NLocate>} elements
     */
    replaceWith(...elements: Array<NElement<any> | NText | NLocate>): void;
}
/**
 * Comment节点的封装
 * 用于进行节点定位
 */
type NText = NText$1;

/**
 * 根据HTMLElement对象获取NElement对象
 * @template {HTMLElement} ElementObjectType
 * @param {ElementObjectType} element
 * @returns {NElement<ElementObjectType>}
 */
declare function getNElement<ElementObjectType extends HTMLElement>(element: ElementObjectType): NElement<ElementObjectType>;
/**
 * dom元素的封装
 * @template {HTMLElement} ElementObjectType
 */
declare class NElement<ElementObjectType extends HTMLElement> {
    /**
     * 根据HTMLElement对象获取NElement对象
     * @template {HTMLElement} ElementObjectType
     * @param {ElementObjectType} element
     * @returns {NElement<ElementObjectType>}
     */
    static byElement<ElementObjectType_1 extends HTMLElement>(element: ElementObjectType_1): NElement<ElementObjectType_1>;
    /**
     * @private
     * @param {ElementObjectType} elementObj
     */
    private constructor();
    /**
     * 元素对象
     * @readonly
     * @type {ElementObjectType}
     */
    readonly node: ElementObjectType;
    /**
     * 样式名 到 钩子绑定 映射
     * @private
     * @type {Map<string, HookBindValue | HookBindCallback>}
     */
    private styleHooks;
    /**
     * @returns {ElementObjectType}
     */
    get element(): ElementObjectType;
    /**
     * 获取父元素
     * @returns {NElement}
     */
    getParent(): NElement<any>;
    /**
     * 添加单个子节点
     * @param {NElement | NLocate | NText | Node | string | HookBindInfo} chi
     */
    addChild(chi: NElement<any> | NLocate | NText$1 | Node | string | HookBindInfo): void;
    /**
     * 添加多个子节点
     * @param {Array<Parameters<NElement["addChild"]>[0] | Array<Parameters<NElement["addChild"]>[0]>>} chi
     */
    addChilds(...chi: Array<Parameters<(chi: NElement<any> | NLocate | NText$1 | Node | string | HookBindInfo) => void>[0] | Array<Parameters<(chi: NElement<any> | NLocate | NText$1 | Node | string | HookBindInfo) => void>[0]>>): void;
    /**
     * 插入单个子节点(在中间)
     * 如果此节点之前在树中则先移除后加入
     * @param {NElement | NLocate | NText} chi
     * @param {number | NElement | NLocate | NText} pos 添加到的位置 负数从后到前 超过范围添加到最后
     */
    insChild(chi: NElement<any> | NLocate | NText$1, pos: number | NElement<any> | NLocate | NText$1): void;
    /**
     * 查找子节点在当前节点中的位置
     * 从0开始
     * 不是子节点则返回-1
     * @param {NElement} chi
     * @returns {number}
     */
    childInd(chi: NElement<any>): number;
    /**
     * 在此节点之前插入节点
     * @param {NElement | NLocate | NText} target
     */
    insBefore(target: NElement<any> | NLocate | NText$1): void;
    /**
     * 在此节点之后插入节点
     * @param {NElement | NLocate | NText} target
     */
    insAfter(target: NElement<any> | NLocate | NText$1): void;
    /**
     * 移除此节点
     */
    remove(): void;
    /**
     * 移除此节点的子节点
     * @param {number} [begin] 开始删除的子节点下标 缺省则为从0开始
     * @param {number} [end] 结束删除的子节点下标 不包含end 缺省则为到结尾
     */
    removeChilds(begin?: number | undefined, end?: number | undefined): void;
    /**
     * 获取子节点列表
     * 返回的列表不会随dom树变化
     * @returns {Array<NElement>}
     */
    getChilds(): Array<NElement<any>>;
    /**
     * 获取第ind个子节点
     * @param {number} ind
     * @returns {NElement}
     */
    getChild(ind: number): NElement<any>;
    /**
     * 使用指定节点替换此节点
     * @param {Array<NElement | NText | NLocate>} elements
     */
    replaceWith(...elements: Array<NElement<any> | NText$1 | NLocate>): void;
    /**
     * 修改样式
     * @param {import("../feature/NStyle.js").keyOfStyle} styleName
     * @param {string | number | HookBindInfo} value
     */
    setStyle(styleName: keyOfStyle, value: string | number | HookBindInfo): void;
    /**
     * 获取样式
     * @param {import("../feature/NStyle.js").keyOfStyle} styleName
     * @returns {string | number}
     */
    getStyle(styleName: keyOfStyle): string | number;
    /**
     * 修改多个样式
     * @param {{ [x in (import("../feature/NStyle.js").keyOfStyle)]?: string | number | HookBindInfo }} obj
     */
    setStyles(obj: { [x in (keyOfStyle)]?: string | number | HookBindInfo; }): void;
    /**
     * 修改文本
     * @param {string} text
     */
    setText(text: string): void;
    /**
     * 添加文本
     * @param {string} text
     * @returns {Text}
     */
    addText(text: string): Text;
    /**
     * 设置HTMLElement属性
     * @param {string} key
     * @param {string} value
     */
    setAttr(key: string, value: string): void;
    /**
     * 设置多个HTMLElement属性
     * @param {Object<string, string>} obj
     */
    setAttrs(obj: {
        [x: string]: string;
    }): void;
    /**
     * 设置元素可见性
     * @param {"block" | "inline" | "flex" | "none" | "inline-block" | string} s
     */
    setDisplay(s: "block" | "inline" | "flex" | "none" | "inline-block" | string): void;
    /**
     * 添加事件监听器
     * @template {keyof HTMLElementEventMap} K
     * @param {K} eventName
     * @param {function(HTMLElementEventMap[K]): any} callback
     * @param {boolean | AddEventListenerOptions} [options]
     */
    addEventListener<K extends keyof HTMLElementEventMap>(eventName: K, callback: (arg0: HTMLElementEventMap[K]) => any, options?: boolean | AddEventListenerOptions | undefined): void;
    /**
     * 移除事件监听器
     * @param {string} eventName
     * @param {function(Event) : void} callback
     * @param {boolean | EventListenerOptions} [options]
     */
    removeEventListener(eventName: string, callback: (arg0: Event) => void, options?: boolean | EventListenerOptions | undefined): void;
    /**
     * 执行动画
     * @param {Array<Keyframe> | PropertyIndexedKeyframes} keyframes
     * @param {number | KeyframeAnimationOptions} options
     * @returns {Animation}
     */
    animate(keyframes: Array<Keyframe> | PropertyIndexedKeyframes, options: number | KeyframeAnimationOptions): Animation;
    /**
     * 执行动画并提交
     * 在执行完成动画后将最后的效果提交到style
     * @param {Array<Keyframe> | PropertyIndexedKeyframes} keyframes
     * @param {number | KeyframeAnimationOptions} options
     * @returns {Promise<void>} 动画执行完后返回
     */
    animateCommit(keyframes: Array<Keyframe> | PropertyIndexedKeyframes, options: number | KeyframeAnimationOptions): Promise<void>;
    /**
     * 流水线
     * @param {function(NElement): void} asseFunc 流水线函数(无视返回值)
     * @returns {NElement} 返回本身
     */
    asse(asseFunc: (arg0: NElement<any>) => void): NElement<any>;
    /**
     * 获取标签名
     * 标签名使用小写字母
     * @returns {keyof HTMLElementTagNameMap}
     */
    getTagName(): keyof HTMLElementTagNameMap;
    /**
     * 应用NList到元素
     * @param {NList | ConstructorParameters<typeof NList>[0]} list
     * @returns {NElement} 返回被操作的NElement
     */
    applyNList(list: NList | ConstructorParameters<typeof NList>[0]): NElement<any>;
}

/**
 * 标签名
 * 标签名使用小写字母
 * 不包含此类的特征列表默认为div
 * 一层特征列表只能有唯一tagName (或等价的)
 * @template {keyof HTMLElementTagNameMap} T
 */
declare class NTagName<T extends keyof HTMLElementTagNameMap> {
    /**
     * @param {T} tagName
     */
    constructor(tagName: T);
    /**
     * @type {T}
     */
    tagName: T;
}
/**
 * 快速创建 NTagName 实例
 * @type {{
 *  [x in keyof HTMLElementTagNameMap]?: NTagName<x>
 * }}
 */
declare let nTagName: { [x in keyof HTMLElementTagNameMap]?: NTagName<x>; };

/**
 * @typedef {(keyof HTMLElement & string) | (string & {})} keyObjectOfHtmlElementAttr
 */
/**
 * 属性
 * @template {keyObjectOfHtmlElementAttr} T
 */
declare class NAttr<T extends keyObjectOfHtmlElementAttr> {
    /**
     * @param {T} key
     * @param {string | number | boolean | Function} value
     */
    constructor(key: T, value: string | number | boolean | Function);
    /**
     * @type {T}
     */
    key: T;
    /**
     * 若为函数则应用时调用
     * 若有返回值则赋值到属性
     * @type {string | number | boolean | Function}
     */
    value: string | number | boolean | Function;
    /**
     * 将此特征应用于元素
     * @param {import("../node/NElement").NElement} e
     */
    apply(e: NElement<any>): void;
}
type keyObjectOfHtmlElementAttr = (keyof HTMLElement & string) | (string & {});

/**
 * 事件
 * @template {keyof HTMLElementEventMap} T
 */
declare class NEvent<T extends keyof HTMLElementEventMap> {
    /**
     * @param {T} key
     * @param {(event: HTMLElementEventMap[T], currentElement: import("../node/NElement").NElement) => void} callback
     */
    constructor(key: T, callback: (event: HTMLElementEventMap[T], currentElement: NElement<any>) => void);
    /**
     * @type {T}
     */
    eventName: T;
    /**
     * @type {(event: HTMLElementEventMap[T], currentElement: import("../node/NElement").NElement) => void}
     */
    callback: (event: HTMLElementEventMap[T], currentElement: NElement<any>) => void;
    /**
     * 将此特征应用于元素
     * @param {import("../node/NElement").NElement} element
     */
    apply(element: NElement<any>): void;
}
/**
 * 快速创建 NEvent 实例
 * @type {{
 *  [x in keyof HTMLElementEventMap]?: (callback: (event: HTMLElementEventMap[x], currentElement: import("../node/NElement").NElement) => void) => NEvent<x>
 * }}
 */
declare let eventName: { [x in keyof HTMLElementEventMap]?: (callback: (event: HTMLElementEventMap[x], currentElement: NElement<any>) => void) => NEvent<x>; };

/**
 * 流水线
 */
declare class NAsse {
    /**
     * @param {function(import("../node/NElement").NElement): void} callback
     */
    constructor(callback: (arg0: NElement<any>) => void);
    /**
     * @type {function(import("../node/NElement").NElement): void}
     */
    callback: (arg0: NElement<any>) => void;
    /**
     * 将此特征应用于元素
     * @param {import("../node/NElement").NElement} e
     */
    apply(e: NElement<any>): void;
}

/**
 * 特征列表
 * @typedef {Array<string | HookBindInfo | NTagName | NStyle | NAttr | NEvent | NAsse | NList | NList_list | NElement | NText | NLocate | ((e: NElement) => void)>} NList_list
 * @typedef {NList_list[number]} NList_item
 */
declare class NList {
    /**
     * 生成拉平列表
     * @param {NList_list} list
     */
    static flat(list: NList_list$1): NList;
    /**
     * 获取(生成)元素
     * @param {NList_list | NList} list
     */
    static getElement(list: NList_list$1 | NList): NElement<any>;
    /**
     * @param {NList_list} list
     */
    constructor(list: NList_list$1);
    /**
     * @type {NList_list}
     */
    list: NList_list$1;
    /**
     * 拉平特征
     * (默认)标记为false将作为子元素节点
     * 标记为true将作为上层节点的特征列表
     * @type {boolean}
     */
    flatFlag: boolean;
    /**
     * 为元素应用特征列表
     * @param {NElement<HTMLElement>} element
     */
    apply(element: NElement<HTMLElement>): void;
    /**
     * 获取列表的标签名
     * @returns {string}
     */
    getTagName(): string;
    /**
     * 获取(生成)元素
     * @returns {NElement}
     */
    getElement(): NElement<any>;
}
/**
 * 特征列表
 */
type NList_list$1 = Array<string | HookBindInfo | NTagName<any> | NStyle<any> | NAttr<any> | NEvent<any> | NAsse | NList | NList_list$1 | NElement<any> | NText$1 | NLocate | ((e: NElement<any>) => void)>;
/**
 * 特征列表
 */
type NList_item$1 = NList_list$1[number];

declare namespace cssG {
    function diFull(value: string): string;
    function rgb(r: number | string, g: number | string, b: number | string, a?: string | number | undefined): string;
}

/**
 * 绑定元素属性到对象作为getter/setter
 * @template {Object} T
 * @param {string} attrName
 * @param {T} obj
 * @param {(keyof T) | (string & {})} key
 * @param {boolean} [noInitialize] 不将对象中原来的值赋给元素属性
 * @returns {(element: NElement) => void} 流水线函数
 */
declare function bindAttribute<T extends unknown>(attrName: string, obj: T, key: (keyof T) | (string & {}), noInitialize?: boolean | undefined): (element: NElement<any>) => void;

/**
 * 生成添加类名的流水线
 * @param {string | Array<string>} classNames 多个用空格分隔的类名
 */
declare function classNames(classNames: string | Array<string>): NAsse;

/**
 * 创建列表
 * @template {any} T
 * @param {Array<T>} dataArray
 * @param {(data: T) => NElement} builder
 * @param {NList | import("../../feature/NList").NList_list} [listNList]
 * @returns {NElement}
 */
declare function buildList<T extends unknown>(dataArray: Array<T>, builder: (data: T) => NElement<any>, listNList?: NList | NList_list$1 | undefined): NElement<any>;

/**
 * 展开元素
 * 将内容js对象转换为封装的HTML树
 * 请不要转换不受信任的json
 * @param {EDObj} obj EleData格式的对象
 * @returns {NElement}
*/
declare function expandElement(obj: EDObj): NElement<any>;
/**
 * 遍历展开元素
 */
type EDObj = {
    id?: string;
    left?: string;
    top?: string;
    right?: string;
    bottom?: string;
    width?: string;
    height?: string;
    position?: "static" | "absolute" | "relative" | "fixed" | string;
    display?: "block" | "inline" | "none" | "inline-block" | string;
    overflow?: "visible" | "hidden" | "scroll" | "auto" | string;
    tagName?: string;
    classList?: Array<string>;
    text?: string;
    style?: { [x in (keyof CSSStyleDeclaration)]?: string | number; } | {
        [x: string]: string | number;
    };
    attr?: {
        [x: string]: string;
    };
    event?: { [x in (keyof HTMLElementEventMap)]?: ((arg0: Event) => void); } | {
        [x: string]: ((arg0: Event) => void);
    };
    child?: Array<EDObj | NElement<any>>;
    assembly?: Array<(arg0: NElement<any>) => void | NElement<any>>;
    [x: string]: any;
};

/**
 * 鼠标(拖拽)事件处理
 * @param {NElement} element 绑定到元素
 * @param {function(PointerData):void} callback 回调
 * @param {number} [button] 绑定的按键
 * @param {HTMLElement | Window} [extensionRegion] 延伸区域 (实际捕获鼠标移动和按钮抬起的区域)
 */
declare function mouseBind(element: NElement<any>, callback: (arg0: PointerData$1) => void, button?: number | undefined, extensionRegion?: HTMLElement | Window | undefined): void;

/**
 * 触摸(拖拽) 事件处理
 * @param {NElement} element
 * @param {function(PointerData):void} callback
 * @param {boolean} [preventDefault]
 */
declare function touchBind(element: NElement<any>, callback: (arg0: PointerData$1) => void, preventDefault?: boolean | undefined): void;

/**
 * 键盘 事件处理
 * @param {HTMLElement} element
 * @param {function(KeyboardData) : void} callback
 */
declare function keyboardBind(element: HTMLElement, callback: (arg0: KeyboardData$1) => void): void;

/**
 * 包装为仅能执行一次的函数
 * @template P
 * @template R
 * @template {function(...P) : R} T
 * @param {T} func
 * @returns {T}
 */
declare function runOnce<P, R, T extends (...args: P[]) => R>(func: T): T;

/**
 * 事件处理器
 * 可以定多个事件响应函数
 * @template {*} T
 */
declare class EventHandler<T extends unknown> {
    /**
     * 回调列表
     * @type {Array<function(T): void>}
     */
    cbList: Array<(arg0: T) => void>;
    /**
     * 单次回调列表
     * @type {Array<function(T): void>}
     */
    onceCbList: Array<(arg0: T) => void>;
    /**
     * 添加响应函数
     * @param {function(T): void} cb
     */
    add(cb: (arg0: T) => void): void;
    /**
     * 添加单次响应函数
     * 触发一次事件后将不再响应
     * @param {function(T): void} cb
     */
    addOnce(cb: (arg0: T) => void): void;
    /**
     * 返回一个Primise
     * 下次响应时此primise将解决
     * @returns {Promise<T>}
     */
    oncePromise(): Promise<T>;
    /**
     * 移除响应函数
     * @param {function(T): void} cb
     */
    remove(cb: (arg0: T) => void): void;
    /**
     * 移除所有响应函数
     */
    removeAll(): void;
    /**
     * 触发事件
     * @param {T} e
     */
    trigger(e: T): void;
    /**
     * 存在监听器
     * @returns {boolean}
     */
    existListener(): boolean;
    #private;
}

/**
 * 判断第一个参数是否属于之后所有的参数
 * 第一个参数与任何一个之后的参数相等 返回true
 * 与任何一个都不相等 返回false
 * @param {any} k
 * @param  {Array<any>} s
 * @returns {boolean}
 */
declare function isAmong(k: any, ...s: Array<any>): boolean;

/**
 * 生成唯一字符串(qwq-uid)
 * 基于毫秒级时间和随机数
 *
 * qwq-uid格式
 * 仅由 小写字母 数字 连字符 组成
 * 不以连字符开头或结尾
 * 不存在两个相邻的连字符
 * 即由零或几个连字符分隔的多个字母和数字子串
 * 第一个子串为36进制的毫秒级时间戳
 * 其后的子串为36进制的随机数
 *
 * 优先安全随机
 * 当安全随机不可用时回退到普通随机(不保证安全性)
 *
 * @param {number} [randomSection] 随机节数量
 * @returns {string}
 */
declare function uniqueIdentifierString(randomSection?: number | undefined): string;

/**
 * 左右方向分割
 * @param {string} leftSize
 * @param {NElement | import("../old/expandElement.js").EDObj} a
 * @param {NElement | import("../old/expandElement.js").EDObj} b
 * @returns {NElement}
 */
declare function divideLayout_LR(leftSize: string, a: NElement<any> | EDObj, b: NElement<any> | EDObj): NElement<any>;
/**
 * 上下方向分割
 * @param {string} upSize
 * @param {NElement | import("../old/expandElement.js").EDObj} a
 * @param {NElement | import("../old/expandElement.js").EDObj} b
 * @returns {NElement}
 */
declare function divideLayout_UD(upSize: string, a: NElement<any> | EDObj, b: NElement<any> | EDObj): NElement<any>;
/**
 * 右左方向分割
 * @param {string} rightSize
 * @param {NElement | import("../old/expandElement.js").EDObj} a
 * @param {NElement | import("../old/expandElement.js").EDObj} b
 * @returns {NElement}
 */
declare function divideLayout_RL(rightSize: string, a: NElement<any> | EDObj, b: NElement<any> | EDObj): NElement<any>;
/**
 * 下上方向分割
 * @param {string} downSize
 * @param {NElement | import("../old/expandElement.js").EDObj} a
 * @param {NElement | import("../old/expandElement.js").EDObj} b
 * @returns {NElement}
 */
declare function divideLayout_DU(downSize: string, a: NElement<any> | EDObj, b: NElement<any> | EDObj): NElement<any>;

/**
 * 解析标签
 * 默认为div标签
 * @deprecated
 * @param {TemplateStringsArray} strings
 * @param {Array<parsingElementKeysType>} keys
 * @returns {NElement}
 */
declare function tag(strings: TemplateStringsArray, ...keys: Array<parsingElementKeysType>): NElement<any>;
/**
 * 解析指定标签名的标签
 * @deprecated
 * @param {string} name
 * @returns {function(TemplateStringsArray, ...parsingElementKeysType): NElement}
 */
declare function tagName(name: string): (arg0: TemplateStringsArray, ...args: parsingElementKeysType[]) => NElement<any>;
/**
 * 解析标签
 */
type parsingElementKeysType = NElement<any> | NStyle<any> | NEvent<any>;

/**
 * 创建对象的代理
 * @template {object} T
 * @param {T} srcObj
 * @returns {T}
 */
declare function createHookObj<T extends unknown>(srcObj: T): T;
/**
 * 获取代理对象中指定值的绑定信息
 * @template {Object} T
 * @param {T} proxyObj
 * @param {[(keyof T) | (string & {}) | symbol] | [((keyof T) | (string & {}) | symbol), ...Array<(keyof T) | (string & {}) | symbol>, function(...any): any]} keys
 * @returns {HookBindInfo}
 */
declare function bindValue<T extends unknown>(proxyObj: T, ...keys: [(keyof T) | (string & {}) | symbol] | [((keyof T) | (string & {}) | symbol), ...Array<(keyof T) | (string & {}) | symbol>, (...args: any[]) => any]): HookBindInfo;

/**
 * 数组钩子绑定类
 *
 * @typedef {{
 *  set: (index: number, value: any) => void,
 *  add: (index: number, value: any) => void,
 *  del: (index: number) => void
 * }} callbackType
 */
declare class ArrayHookBind {
    /**
     * @param {Array} proxyArr
     * @param {Set<ArrayHookBind>} hookSet
     * @param {callbackType} callback
     */
    constructor(proxyArr: any[], hookSet: Set<ArrayHookBind>, callback: callbackType$2);
    /**
     * 触发此钩子 (设置)
     * @param {number} index
     * @param {any} value
     */
    emitSet(index: number, value: any): void;
    /**
     * 触发此钩子 (增加)
     * @param {number} index
     * @param {any} value
     */
    emitAdd(index: number, value: any): void;
    /**
     * 触发此钩子 (删除)
     * @param {number} index
     */
    emitDel(index: number): void;
    /**
     * 销毁此钩子
     * 销毁后钩子将不再自动触发
     */
    destroy(): void;
    /**
     * 绑定销毁
     * 当目标对象释放时销毁
     * @param {object} targetObj
     * @returns {ArrayHookBind} 返回自身
     */
    bindDestroy(targetObj: object): ArrayHookBind;
    #private;
}
/**
 * 数组钩子绑定类
 */
type callbackType$2 = {
    set: (index: number, value: any) => void;
    add: (index: number, value: any) => void;
    del: (index: number) => void;
};

/**
 * 创建数组的代理
 * @template {Array} T
 * @param {T} srcArray
 * @returns {T}
 */
declare function createHookArray<T extends any[]>(srcArray: T): T;
/**
 * 绑定数组的代理
 * 回调函数中不应当进行可能触发钩子的操作
 * @template {any} K
 * @param {Array<K>} proxyArray
 * @param {{
 *  set?: (index: number, value: K) => void;
 *  add: (index: number, value: K) => void;
 *  del: (index: number) => void;
 * }} callbacks
 * @param {{ noSet?: boolean, addExisting?: boolean }} [option]
 * @returns {ArrayHookBind}
 */
declare function bindArrayHook<K extends unknown>(proxyArray: Array<K>, callbacks: {
    set?: (index: number, value: K) => void;
    add: (index: number, value: K) => void;
    del: (index: number) => void;
}, option?: {
    noSet?: boolean;
    addExisting?: boolean;
} | undefined): ArrayHookBind;

/**
 * Map钩子绑定类
 *
 * @typedef {{
 *  add: (key: any, value: any) => void | (() => void),
 *  set: (key: any, value: any) => void | (() => void),
 *  del: (key: any) => void
 * }} callbackType
 */
declare class MapHookBind {
    /**
     * @param {Map} proxyMap
     * @param {Set<MapHookBind>} hookSet
     * @param {callbackType} callback
     */
    constructor(proxyMap: Map<any, any>, hookSet: Set<MapHookBind>, callback: callbackType$1);
    /**
     * 触发此钩子 (增加)
     * @param {any} key
     * @param {any} value
     */
    emitAdd(key: any, value: any): void;
    /**
     * 触发此钩子 (设置)
     * @param {any} key
     * @param {any} value
     */
    emitSet(key: any, value: any): void;
    /**
     * 触发此钩子 (删除)
     * @param {any} key
     */
    emitDel(key: any): void;
    /**
     * 销毁此钩子
     * 销毁后钩子将不再自动触发
     */
    destroy(): void;
    /**
     * 绑定销毁
     * 当目标对象释放时销毁
     * @param {object} targetObj
     * @returns {MapHookBind} 返回自身
     */
    bindDestroy(targetObj: object): MapHookBind;
    #private;
}
/**
 * Map钩子绑定类
 */
type callbackType$1 = {
    add: (key: any, value: any) => void | (() => void);
    set: (key: any, value: any) => void | (() => void);
    del: (key: any) => void;
};

/**
 * 创建Map的代理
 * @template {Map} T
 * @param {T} srcMap
 * @returns {T}
 */
declare function createHookMap<T extends Map<any, any>>(srcMap: T): T;
/**
 * 绑定Map的代理
 * 回调函数中不应当进行可能触发钩子的操作
 * @template {any} K
 * @template {any} V
 * @param {Map<K, V>} proxyMap
 * @param {{
 *  add?: (key: K, value: V) => void | (() => void),
 *  set?: (key: K, value: V) => void | (() => void),
 *  del?: (key: K) => void
 * }} callbacks
 * @param {{ noSet?: boolean, addExisting?: boolean }} [option]
 * @returns {MapHookBind}
 */
declare function bindMapHook<K extends unknown, V extends unknown>(proxyMap: Map<K, V>, callbacks: {
    add?: (key: K, value: V) => void | (() => void);
    set?: (key: K, value: V) => void | (() => void);
    del?: (key: K) => void;
}, option?: {
    noSet?: boolean;
    addExisting?: boolean;
} | undefined): MapHookBind;

/**
 * Set钩子绑定类
 *
 * @typedef {{
 *  add: (value: any) => void | (() => void),
 *  del: (value: any) => void
 * }} callbackType
 */
declare class SetHookBind {
    /**
     * @param {Set} proxyMap
     * @param {Set<SetHookBind>} hookSet
     * @param {callbackType} callback
     */
    constructor(proxyMap: Set<any>, hookSet: Set<SetHookBind>, callback: callbackType);
    /**
     * 触发此钩子 (增加)
     * @param {any} value
     */
    emitAdd(value: any): void;
    /**
     * 触发此钩子 (删除)
     * @param {any} value
     */
    emitDel(value: any): void;
    /**
     * 销毁此钩子
     * 销毁后钩子将不再自动触发
     */
    destroy(): void;
    /**
     * 绑定销毁
     * 当目标对象释放时销毁
     * @param {object} targetObj
     * @returns {SetHookBind} 返回自身
     */
    bindDestroy(targetObj: object): SetHookBind;
    #private;
}
/**
 * Set钩子绑定类
 */
type callbackType = {
    add: (value: any) => void | (() => void);
    del: (value: any) => void;
};

/**
 * 创建Set的代理
 * @template {Set} T
 * @param {T} srcSet
 * @returns {T}
 */
declare function createHookSet<T extends Set<any>>(srcSet: T): T;
/**
 * 绑定Set的代理
 * 回调函数中不应当进行可能触发钩子的操作
 * @template {any} K
 * @param {Set<K>} proxySet
 * @param {{
 *  add?: (value: K) => void | (() => void),
 *  del?: (value: K) => void
 * }} callbacks
 * @param {{ addExisting?: boolean }} [option]
 * @returns {SetHookBind}
 */
declare function bindSetHook<K extends unknown>(proxySet: Set<K>, callbacks: {
    add?: (value: K) => void | (() => void);
    del?: (value: K) => void;
}, option?: {
    addExisting?: boolean;
} | undefined): SetHookBind;

/**
 * 异步延迟
 * 将创建一个Promise并在指定延迟时间后解决
 * @param {number} time 单位:毫秒
 * @returns {Promise<void>}
 */
declare function delayPromise(time: number): Promise<void>;
/**
 * 异步延迟带值
 * 将创建一个Promise并在指定延迟时间后解决
 * @template {any} T
 * @param {number} time 单位:毫秒
 * @param {T} resolveValue
 * @returns {Promise<T>}
 */
declare function delayPromiseWithResolve<T extends unknown>(time: number, resolveValue: T): Promise<T>;
/**
 * 异步延迟拒绝
 * 将创建一个Promise并在指定延迟时间后拒绝
 * @param {number} time 单位:毫秒
 * @param {any} rejectReason
 * @returns {Promise<void>}
 */
declare function delayPromiseWithReject(time: number, rejectReason: any): Promise<void>;

type NList_list = NList_list$1;
type NList_item = NList_item$1;
type PointerData = PointerData$1;
type KeyboardData = KeyboardData$1;

export { EventHandler, type KeyboardData, NAsse, NAttr, NElement, NEvent, NList, type NList_item, type NList_list, NLocate, NStyle, NTagName, NText$1 as NText, type PointerData, bindArrayHook, bindAttribute, bindMapHook, bindSetHook, bindValue, buildList, classNames, createHookArray, createHookMap, createHookObj, createHookSet, createNStyle, createNStyleList, cssG, delayPromise, delayPromiseWithReject, delayPromiseWithResolve, divideLayout_DU, divideLayout_LR, divideLayout_RL, divideLayout_UD, eventName, expandElement, getNElement, isAmong, keyboardBind, mouseBind, nTagName, runOnce, createNStyleList as styles, tag, tagName, touchBind, uniqueIdentifierString };
