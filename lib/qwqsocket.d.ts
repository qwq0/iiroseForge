/**
 * 规则类型
 * 用于对值的类型进行检查
 *
 * 此类的值仅在创建时变化
 * 创建后的RuleType类无法发生变化
 */
declare class RuleType {
    /**
     * 创建任意类型的规则
     * @returns {RuleType}
     */
    static any(): RuleType;
    /**
     * 创建枚举型规则
     * @param {Iterable<any>} valueList
     * @returns {RuleType}
     */
    static enum(valueList: Iterable<any>): RuleType;
    /**
     * 创建 number 类型规则
     * 允许所有 number 类型
     * @returns {RuleType}
     */
    static number(): RuleType;
    /**
     * 创建 number 中的 整数 类型规则
     * @returns {RuleType}
     */
    static integer(): RuleType;
    /**
     * 创建 number 中的 非负整数 类型规则
     * @returns {RuleType}
     */
    static nonnegativeInteger(): RuleType;
    /**
     * 创建 number 中的 有限数 类型规则
     * @returns {RuleType}
     */
    static finite(): RuleType;
    /**
     * 创建 string 类型规则
     * @returns {RuleType}
     */
    static string(): RuleType;
    /**
     * 创建 boolean 类型规则
     * @returns {RuleType}
     */
    static boolean(): RuleType;
    /**
     * 创建 bigint 类型规则
     * @returns {RuleType}
     */
    static bigint(): RuleType;
    /**
     * 创建 null 类型规则
     * @returns {RuleType}
     */
    static null(): RuleType;
    /**
     * 创建 undefined 类型规则
     * @returns {RuleType}
     */
    static undefined(): RuleType;
    /**
     * 创建 对象 类型规则
     * @param {Object<string, RuleType>} necessary
     * @param {Object<string, RuleType>} [optional]
     * @param {RuleType} [defaultValueRule]
     */
    static object(necessary: {
        [x: string]: RuleType;
    }, optional?: {
        [x: string]: RuleType;
    } | undefined, defaultValueRule?: RuleType | undefined): RuleType;
    /**
     * 创建 数组 类型规则
     * @param {Array<RuleType>} ruleArray
     * @param {RuleType} [defaultValueRule]
     */
    static array(ruleArray: Array<RuleType>, defaultValueRule?: RuleType | undefined): RuleType;
    /**
     * 验证值是否符合此规则
     * @param {any} value
     */
    verify(value: any): boolean;
    /**
     * 合并两个规则
     * 这不是严格合并
     * @param {RuleType} target
     * @returns {RuleType}
     */
    merge(target: RuleType): RuleType;
    /**
     * 求交两个规则
     * 这不是严格求交
     * @param {RuleType} target
     * @returns {RuleType}
     */
    intersect(target: RuleType): RuleType;
    #private;
}

/**
 * 映射规则
 */
declare class MappingRules {
    /**
     * 通过简短名获取事件规则
     * @param {string} shortName
     * @returns {EventRule}
     */
    getRuleByShort(shortName: string): EventRule;
    /**
     * 通过事件名获取事件规则
     * @param {string} eventName
     * @returns {EventRule}
     */
    getRuleByName(eventName: string): EventRule;
    /**
     * 服务端添加一个事件规则
     * 自动创建简短名
     * @param {string} eventName
     * @param {EventRule} eventRule
     */
    serverAddEventRule(eventName: string, eventRule: EventRule): void;
    /**
     * 客户端添加一个事件规则
     * 不自动创建简短名
     * @param {string} eventName
     * @param {EventRule} eventRule
     */
    clientAddEventRule(eventName: string, eventRule: EventRule): void;
    /**
     * 设置简短名
     * 不可重复设置简短名
     * @param {string} shortName
     * @param {EventRule} eventRule
     */
    setShortName(shortName: string, eventRule: EventRule): void;
    #private;
}

/**
 * 表示一个事件的规则
 */
declare class EventRule {
    /**
     * 创建事件规则
     * @param {Array<{
     *  key: string,
     *  rule: RuleType
     * }>} metaObjRuleList
     */
    static create(metaObjRuleList: Array<{
        key: string;
        rule: RuleType;
    }>): EventRule;
    /**
     * 创建事件规则
     * 不检查类型
     * @param {Array<{
     *  key: string
     * }>} metaObjKeyList
     */
    static createWithoutType(metaObjKeyList: Array<{
        key: string;
    }>): EventRule;
    /**
     * 事件名
     * @type {string}
     */
    eventName: string;
    /**
     * 简短名
     * @type {string}
     */
    shortName: string;
    /**
     * 事件规则 所在的 映射规则
     * @type {import("./MappingRules.js").MappingRules}
     */
    mappingRules: MappingRules;
    /**
     * 事件元对象的key列表
     * @type {Array<string>}
     */
    metaObjKeyList: Array<string>;
    /**
     * 获取此事件规则的副本
     * @returns {EventRule}
     */
    getCopy(): EventRule;
    /**
     * 获取此事件规则无类型检查的副本
     * @returns {EventRule}
     */
    getCopyWithoutType(): EventRule;
    /**
     * 是否拥有指定的key
     * @param {string} key
     * @returns {boolean}
     */
    hasKey(key: string): boolean;
    /**
     * 重设key列表
     * 新的列表和原列表应当仅顺序不同 元素内容相同
     * @param {Array<string>} newKeyList
     */
    resetKeyList(newKeyList: Array<string>): void;
    /**
     * 从数组验证并获取事件元数据对象
     * @param {Array<any>} srcArray
     * @returns {object}
     */
    verifyGetArray(srcArray: Array<any>): object;
    /**
     * 从元数据对象验证并获取事件元数据对象
     * @param {object} srcObj
     * @returns {object}
     */
    verifyGetObject(srcObj: object): object;
    /**
     * 转换元数据对象到数组
     * @param {object} srcObj
     * @returns {Array<any>}
     */
    metaObjToArray(srcObj: object): Array<any>;
    /**
     * 在事件规则元对象结尾追加参数
     * @param {string} key
     * @param {RuleType} [rule]
     * @returns {EventRule} 返回当前规则元对象本身
     */
    addParamToEnd(key: string, rule?: RuleType | undefined): EventRule;
    /**
     * 在事件规则元对象开头追加参数
     * @param {string} key
     * @param {RuleType} [rule]
     * @returns {EventRule} 返回当前规则元对象本身
     */
    addParamToFront(key: string, rule?: RuleType | undefined): EventRule;
    #private;
}

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
 * 连接到 qwq-socket 服务器的客户端实例
 * 绑定到一个服务器上下文
 */
declare class QwQSocketServerClient {
    /**
     * 创建客户端实例
     * @param {import("./QwQSocketServer").QwQSocketServer} server
     */
    static create(server: QwQSocketServer): QwQSocketServerClient;
    /**
     * 实例想要发送一个包
     * @type {EventHandler<{ prefix: string, body: Object }>}
     */
    sendData: EventHandler<{
        prefix: string;
        body: any;
    }>;
    /**
     * 客户端的自定义数据
     * @type {object}
     */
    data: object;
    /**
     * 事件监听器
     * @type {Object<string, (eventMetaObj: object, client: QwQSocketServerClient) => void>}
     */
    eventListener: {
        [x: string]: (eventMetaObj: object, client: QwQSocketServerClient) => void;
    };
    /**
     * 收到客户端的数据
     * @param {string} prefix
     * @param {Object} body
     */
    receiveData(prefix: string, body: any): void;
    /**
     * 触发对端事件
     * @param {string} eventName
     * @param {object} eventMetaObj
     */
    sendTrigger(eventName: string, eventMetaObj: object): void;
    #private;
}

/**
 * qwq-socket 服务器
 * 表示一个可接受客户端连接的服务器上下文
 */
declare class QwQSocketServer {
    /**
     * 服务器的映射规则
     * 表示服务端触发的事件相关规则
     * @type {MappingRules}
     */
    serverMappingRules: MappingRules;
    /**
     * 客户端的映射规则
     * 表示客户端触发的事件相关规则
     * @type {MappingRules}
     */
    clientMappingRules: MappingRules;
    /**
     * 创建连接到此服务端的客户端
     * @returns {QwQSocketServerClient}
     */
    createClient(): QwQSocketServerClient;
}

/**
 * qwq-socket 客户端
 * 表示 服务器侧 或 用户侧 的客户端实例
 */
declare class QwQSocketClient {
    /**
     * 实例想要发送一个包
     * @type {EventHandler<{ prefix: string, body: Object }>}
     */
    sendData: EventHandler<{
        prefix: string;
        body: any;
    }>;
    /**
     * 客户端的自定义数据
     * @type {object}
     */
    data: object;
    /**
     * 事件监听器
     * @type {Object<string, (eventMetaObj: object, client: QwQSocketClient) => void>}
     */
    eventListener: {
        [x: string]: (eventMetaObj: object, client: QwQSocketClient) => void;
    };
    /**
     * 添加事件规则
     * @param {string} eventName
     * @param {EventRule} eventRule
     */
    addEventRule(eventName: string, eventRule: EventRule): void;
    /**
     * 收到客户端的数据
     * @param {string} prefix
     * @param {Object} body
     */
    receiveData(prefix: string, body: any): void;
    /**
     * 触发对端事件
     * @param {string} eventName
     * @param {object} [eventMetaObj]
     */
    sendTrigger(eventName: string, eventMetaObj?: object): void;
    #private;
}

/**
 * 绑定器操作器
 * 用于操作socket发送事件或查询
 * @template {QwQSocketClient | QwQSocketServerClient} T
 */
declare class BinderOperator<T extends QwQSocketServerClient | QwQSocketClient> {
    /**
     * @param {T} target
     */
    constructor(target: T);
    /**
     * 触发事件映射对象
     * 调用函数触发对端事件
     * @type {Object<string, (metaObj: Object) => void>}
     */
    trigger: {
        [x: string]: (metaObj: any) => void;
    };
    /**
     * 查询映射对象
     * 调用函数触发对端事件
     * @type {Object<string, (metaObj: Object, timeout?: number, timeoutBehavior?: "reject" | "resolve" | "discard") => Promise<Object>>}
     */
    query: {
        [x: string]: (metaObj: any, timeout?: number, timeoutBehavior?: "reject" | "resolve" | "discard") => Promise<any>;
    };
    /**
     * 添加触发器
     * @param {string} eventName
     */
    addTrigger(eventName: string): void;
    /**
     * 添加查询
     * @param {string} queryName
     */
    addQuery(queryName: string): void;
    #private;
}

/**
 * 查询时错误
 */
declare class QueryError {
    /**
     * 请求错误
     * 在请求处理函数中抛出将返回错误
     * @param {string} cause
     */
    constructor(cause: string);
    /**
     * 错误原因
     * @type {string}
     */
    cause: string;
    toString(): string;
}

/**
 * 查询超时错误
 * 当发起查询超时时抛出
 */
declare class QueryTimeoutError extends QueryError {
    constructor();
}

/**
 * 事件规则绑定器
 * 创建一个事件列表 然后附加到服务端或者客户端
 */
declare class RuleBinder {
    /**
     * 检测合法的用户事件名
     * 允许 数字 大写或小写字母 下划线(_)
     * @param {string} name
     * @returns {boolean}
     */
    static "__#8@#isValidEventName"(name: string): boolean;
    /**
     * 创建服务端事件规则集
     * @returns {RuleBinder}
     */
    static createServerBound(): RuleBinder;
    /**
     * 创建客户端事件规则集
     * @returns {RuleBinder}
     */
    static createClientBound(): RuleBinder;
    /**
     * 添加事件规则
     * @param {string} eventName
     * @param {EventRule} eventRule
     */
    addEventRule(eventName: string, eventRule: EventRule): void;
    /**
     * 添加多个事件规则
     * @param {Object<string, EventRule>} eventRules
     */
    addEventRules(eventRules: {
        [x: string]: EventRule;
    }): void;
    /**
     * 设置事件监听器
     * @param {string} eventName
     * @param {(eventMetaObj: object, target: QwQSocketServerClient | QwQSocketClient) => void} listener
     */
    setEventListener(eventName: string, listener: (eventMetaObj: object, target: QwQSocketServerClient | QwQSocketClient) => void): void;
    /**
     * 设置多个事件监听器
     * @param {Object<string, (eventMetaObj: object, target: QwQSocketServerClient | QwQSocketClient) => void>} eventListeners
     */
    setEventListeners(eventListeners: {
        [x: string]: (eventMetaObj: object, target: QwQSocketServerClient | QwQSocketClient) => void;
    }): void;
    /**
     * 添加查询规则
     * @param {string} queryName
     * @param {EventRule} requestRule
     * @param {EventRule} responseRule
     */
    addQueryRule(queryName: string, requestRule: EventRule, responseRule: EventRule): void;
    /**
     * 添加多个查询规则
     * @param {Object<string, { request: EventRule, response: EventRule }>} queryRules
     */
    addQueryRules(queryRules: {
        [x: string]: {
            request: EventRule;
            response: EventRule;
        };
    }): void;
    /**
     * 设置查询处理函数
     * @param {string} queryName
     * @param {(eventMetaObj: object, target: QwQSocketServerClient | QwQSocketClient) => (Promise<any> | any)} processor
     */
    setQueryProcessor(queryName: string, processor: (eventMetaObj: object, target: QwQSocketServerClient | QwQSocketClient) => (Promise<any> | any)): void;
    /**
     * 设置多个查询处理函数
     * @param {Object<string, (eventMetaObj: object, target: QwQSocketServerClient | QwQSocketClient) => any>} queryProcessors
     */
    setQueryProcessors(queryProcessors: {
        [x: string]: (eventMetaObj: object, target: QwQSocketServerClient | QwQSocketClient) => any;
    }): void;
    /**
     * 应用到实例
     * @param {QwQSocketServer | QwQSocketServerClient | QwQSocketClient} target
     */
    applyToInstance(target: QwQSocketServer | QwQSocketServerClient | QwQSocketClient): void;
    /**
     * 创建操作器
     * @template {QwQSocketServerClient | QwQSocketClient} K
     * @param {K} target
     * @returns {BinderOperator<K>}
     */
    createOperator<K extends QwQSocketServerClient | QwQSocketClient>(target: K): BinderOperator<K>;
    /**
     * 绑定对端
     * 服务端规则和客户端规则之间的绑定
     * @param {RuleBinder} target
     */
    bindOpposite(target: RuleBinder): void;
    #private;
}

export { BinderOperator, EventRule, QueryError, QueryTimeoutError, QwQSocketClient, QwQSocketServer, QwQSocketServerClient, RuleBinder, RuleType };
