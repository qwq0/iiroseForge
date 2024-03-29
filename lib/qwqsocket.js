/**
 * 规则类型
 * 用于对值的类型进行检查
 * 
 * 此类的值仅在创建时变化
 * 创建后的RuleType类无法发生变化
 */
class RuleType
{
    /**
     * 允许 number 类型
     * @type {boolean}
     */
    #number = false;
    /**
     * 对于number 允许整数
     * 仅包括安全整数
     * 不包括负0
     * @type {boolean}
     */
    #allowInteger = false;
    /**
     * 对于number 允许除整数外的有限数
     * @type {boolean}
     */
    #allowFinite = false;
    /**
     * 对于number 允许正无限
     * @type {boolean}
     */
    #allowPositiveInfinity = false;
    /**
     * 对于number 允许负无限
     * @type {boolean}
     */
    #allowNegativeInfinity = false;
    /**
     * 对于number 允许NaN
     * @type {boolean}
     */
    #allowNaN = false;
    /**
     * 对于number 允许的最大的值
     * @type {number | null}
     */
    #numberMax = null;
    /**
     * 对于number 允许的最小的值
     * @type {number | null}
     */
    #numberMin = null;


    /**
     * 允许 boolean 类型
     * @type {boolean}
     */
    #boolean = false;


    /**
     * 允许 string 类型
     * @type {boolean}
     */
    #string = false;
    /**
     * 对于string 允许的最大长度
     * @type {number | null}
     */
    #stringMaxLength = null;


    /**
     * 允许 bigint 类型
     * @type {boolean}
     */
    #biging = false;


    /**
     * 允许 数组
     * @type {boolean}
     */
    #array = false;
    /**
     * 对于数组 对应数组中对应的位置的值的类型
     * @type {Array<RuleType>}
     */
    #arrayRule = null;
    /**
     * 对于数组 剩余的值的规则
     * @type {RuleType}
     */
    #arrayDefaultRule = null;


    /**
     * 允许 对象 (不包括 数组)
     * @type {boolean}
     */
    #object = false;
    /**
     * 对于对象 必要的key
     * @type {Set<string>}
     */
    #necessaryKey = null;
    /**
     * 对于对象 必要或可选的key 对应的规则
     * @type {Map<string, RuleType>}
     */
    #keyRuleMap = null;
    /**
     * 对于对象 其他的值的规则
     * 若为 null 则不允许其他值存在
     * @type {RuleType}
     */
    #defaultValueRule = null;


    /**
     * 允许 null
     * @type {boolean}
     */
    #enableNull = false;
    /**
     * 允许 undefined
     * @type {boolean}
     */
    #enableUndefined = false;


    /**
     * 枚举类型的值
     * 表示仅允许此集合的值
     * 此属性的优先级最高
     * @type {Set<any>}
     */
    #enumSet = null;

    /**
     * 任意类型
     * 跳过一切类型判定通过所有类型
     * @type {boolean}
     */
    #any = false;

    /**
     * 验证值是否符合此规则
     * @param {any} value
     */
    verify(value)
    {
        if (this.#any)
            return true;
        if (this.#enumSet && this.#enumSet.has(value))
            return true;
        switch (typeof (value))
        {
            case "number": {
                if (!this.#number)
                    return false;

                if (Number.isSafeInteger(value) && !Object.is(value, -0))
                {
                    if (!this.#allowInteger)
                        return false;
                }
                else if (Number.isFinite(value))
                {
                    if (!this.#allowFinite)
                        return false;
                }
                else if (value == Infinity)
                {
                    return this.#allowPositiveInfinity;
                }
                else if (value == -Infinity)
                {
                    return this.#allowNegativeInfinity;
                }
                else
                {
                    return this.#allowNaN;
                }

                if (this.#numberMax != null && this.#numberMax < value)
                    return false;
                if (this.#numberMin != null && this.#numberMin > value)
                    return false;

                return true;
            }
            case "boolean": {
                return this.#boolean;
            }
            case "string": {
                if (!this.#string)
                    return false;
                if (this.#stringMaxLength != null && value.length > this.#stringMaxLength)
                    return false;
                return true;
            }
            case "object": {
                if (value == null)
                {
                    return this.#enableNull;
                }
                else if (Array.isArray(value))
                {
                    if (!this.#array)
                        return false;

                    for (let index = 0, length = Math.max(value.length, this.#arrayRule.length); index < length; index++)
                    {
                        let subValue = value[index];
                        let rule = this.#arrayRule?.[index];
                        if (rule)
                        {
                            if (!rule.verify(subValue))
                                return false;
                        }
                        else if (this.#arrayDefaultRule)
                        {
                            if (!this.#arrayDefaultRule.verify(subValue))
                                return false;
                        }
                        else
                            return false;
                    }

                    return true;
                }
                else
                {
                    if (!this.#object)
                        return false;

                    let entriesList = Object.entries(value);
                    let keySet = new Set(entriesList.map(o => o[0]));

                    if (this.#necessaryKey)
                        for (let key of this.#necessaryKey)
                        {
                            if (!keySet.has(key))
                                return false;
                        }

                    for (let [key, subValue] of entriesList)
                    {
                        let rule = this.#keyRuleMap.get(key);
                        if (rule)
                        {
                            if (!rule.verify(subValue))
                                return false;
                        }
                        else if (this.#defaultValueRule)
                        {
                            if (!this.#defaultValueRule.verify(subValue))
                                return false;
                        }
                        else
                            return false;
                    }
                    return true;
                }
            }
            case "bigint": {
                if (!this.#biging)
                    return false;
                return true;
            }
            case "undefined": {
                return this.#enableUndefined;
            }
        }
        return false;
    }

    /**
     * 合并两个规则
     * 这不是严格合并
     * @param {RuleType} target
     * @returns {RuleType}
     */
    merge(target)
    {
        let ret = new RuleType();

        if (this.#any || target.#any)
            return RuleType.any();

        ret.#number = this.#number || target.#number;
        ret.#allowInteger = this.#allowInteger || target.#allowInteger;
        ret.#allowFinite = this.#allowFinite || target.#allowFinite;
        ret.#allowPositiveInfinity = this.#allowPositiveInfinity || target.#allowPositiveInfinity;
        ret.#allowNegativeInfinity = this.#allowNegativeInfinity || target.#allowNegativeInfinity;
        ret.#allowNaN = this.#allowNaN || target.#allowNaN;
        ret.#numberMax = mergeSame(this.#numberMax, target.#numberMax);
        ret.#numberMin = mergeSame(this.#numberMin, target.#numberMin);

        ret.#boolean = this.#boolean || target.#boolean;

        ret.#string = this.#string || target.#string;

        ret.#biging = this.#biging || target.#biging;

        ret.#array = this.#array || target.#array;
        ret.#arrayRule = mergeSame(this.#arrayRule, target.#arrayRule);
        ret.#arrayDefaultRule = mergeSame(this.#arrayDefaultRule, target.#arrayDefaultRule);

        ret.#object = this.#object || target.#object;
        ret.#necessaryKey = mergeSame(this.#necessaryKey, target.#necessaryKey);
        ret.#keyRuleMap = mergeSame(this.#keyRuleMap, target.#keyRuleMap);
        ret.#defaultValueRule = mergeSame(this.#defaultValueRule, target.#defaultValueRule);

        ret.#enableNull = this.#enableNull || target.#enableNull;

        ret.#enableUndefined = this.#enableUndefined || target.#enableUndefined;

        if (this.#enumSet || target.#enumSet)
        {
            let enumSet = new Set();
            if (this.#enumSet)
            {
                this.#enumSet.forEach(o =>
                {
                    enumSet.add(o);
                });
            }
            if (target.#enumSet)
            {
                target.#enumSet.forEach(o =>
                {
                    enumSet.add(o);
                });
            }
            if (enumSet.size > 0)
                ret.#enumSet = enumSet;
        }

        return ret;
    }

    /**
     * 求交两个规则
     * 这不是严格求交
     * @param {RuleType} target
     * @returns {RuleType}
     */
    intersect(target)
    {
        let ret = new RuleType();

        if (this.#any)
            return target;
        else if (target.#any)
            return this;

        ret.#number = this.#number && target.#number;
        ret.#allowInteger = this.#allowInteger && target.#allowInteger;
        ret.#allowFinite = this.#allowFinite && target.#allowFinite;
        ret.#allowPositiveInfinity = this.#allowPositiveInfinity && target.#allowPositiveInfinity;
        ret.#allowNegativeInfinity = this.#allowNegativeInfinity && target.#allowNegativeInfinity;
        ret.#allowNaN = this.#allowNaN && target.#allowNaN;
        ret.#numberMax = intersectNonNull(this.#numberMax, target.#numberMax);
        ret.#numberMin = intersectNonNull(this.#numberMin, target.#numberMin);

        ret.#boolean = this.#boolean && target.#boolean;

        ret.#string = this.#string && target.#string;

        ret.#biging = this.#biging && target.#biging;

        ret.#array = this.#array && target.#array;
        ret.#arrayRule = intersectNonNull(this.#arrayRule, target.#arrayRule);
        ret.#arrayDefaultRule = intersectNonNull(this.#arrayDefaultRule, target.#arrayDefaultRule);

        ret.#object = this.#object && target.#object;
        ret.#necessaryKey = intersectNonNull(this.#necessaryKey, target.#necessaryKey);
        ret.#keyRuleMap = intersectNonNull(this.#keyRuleMap, target.#keyRuleMap);
        ret.#defaultValueRule = intersectNonNull(this.#defaultValueRule, target.#defaultValueRule);

        ret.#enableNull = this.#enableNull && target.#enableNull;

        ret.#enableUndefined = this.#enableUndefined && target.#enableUndefined;

        if (this.#enumSet || target.#enumSet)
        {
            let enumSet = new Set();
            if (this.#enumSet)
            {
                this.#enumSet.forEach(o =>
                {
                    if (target.verify(o))
                        enumSet.add(o);
                });
            }
            if (target.#enumSet)
            {
                target.#enumSet.forEach(o =>
                {
                    if (this.verify(o))
                        enumSet.add(o);
                });
            }
            if (enumSet.size > 0)
                ret.#enumSet = enumSet;
        }

        return ret;
    }

    /**
     * 创建任意类型的规则
     * @returns {RuleType}
     */
    static any()
    {
        let ret = new RuleType();
        ret.#any = true;
        return ret;
    }

    /**
     * 创建枚举型规则
     * @param {Iterable<any>} valueList
     * @returns {RuleType}
     */
    static enum(valueList)
    {
        let ret = new RuleType();
        ret.#enumSet = new Set(valueList);
        return ret;
    }

    /**
     * 创建 number 类型规则
     * 允许所有 number 类型
     * @returns {RuleType}
     */
    static number()
    {
        let ret = new RuleType();
        ret.#number = true;
        ret.#allowInteger = true;
        ret.#allowFinite = true;
        ret.#allowPositiveInfinity = true;
        ret.#allowNegativeInfinity = true;
        ret.#allowNaN = true;
        return ret;
    }

    /**
     * 创建 number 中的 整数 类型规则
     * @returns {RuleType}
     */
    static integer()
    {
        let ret = new RuleType();
        ret.#number = true;
        ret.#allowInteger = true;
        return ret;
    }

    /**
     * 创建 number 中的 非负整数 类型规则
     * @returns {RuleType}
     */
    static nonnegativeInteger()
    {
        let ret = new RuleType();
        ret.#number = true;
        ret.#allowInteger = true;
        ret.#numberMin = 0;
        return ret;
    }

    /**
     * 创建 number 中的 有限数 类型规则
     * @returns {RuleType}
     */
    static finite()
    {
        let ret = new RuleType();
        ret.#number = true;
        ret.#allowInteger = true;
        ret.#allowFinite = true;
        return ret;
    }

    /**
     * 创建 string 类型规则
     * @returns {RuleType}
     */
    static string()
    {
        let ret = new RuleType();
        ret.#string = true;
        return ret;
    }

    /**
     * 创建 boolean 类型规则
     * @returns {RuleType}
     */
    static boolean()
    {
        let ret = new RuleType();
        ret.#boolean = true;
        return ret;
    }

    /**
     * 创建 bigint 类型规则
     * @returns {RuleType}
     */
    static bigint()
    {
        let ret = new RuleType();
        ret.#biging = true;
        return ret;
    }

    /**
     * 创建 null 类型规则
     * @returns {RuleType}
     */
    static null()
    {
        let ret = new RuleType();
        ret.#enableNull = true;
        return ret;
    }

    /**
     * 创建 undefined 类型规则
     * @returns {RuleType}
     */
    static undefined()
    {
        let ret = new RuleType();
        ret.#enableUndefined = true;
        return ret;
    }

    /**
     * 创建 对象 类型规则
     * @param {Object<string, RuleType>} necessary
     * @param {Object<string, RuleType>} [optional]
     * @param {RuleType} [defaultValueRule]
     */
    static object(necessary, optional = {}, defaultValueRule = null)
    {
        let ret = new RuleType();

        ret.#object = true;
        let necessaryEntries = Object.entries(necessary);
        let optionalEntries = Object.entries(optional);
        ret.#necessaryKey = new Set(necessaryEntries.map(o => o[0]));
        ret.#keyRuleMap = new Map([
            ...optionalEntries,
            ...necessaryEntries
        ]);
        if (defaultValueRule)
            ret.#defaultValueRule = defaultValueRule;

        return ret;
    }

    /**
     * 创建 数组 类型规则
     * @param {Array<RuleType>} ruleArray
     * @param {RuleType} [defaultValueRule]
     */
    static array(ruleArray, defaultValueRule = null)
    {
        let ret = new RuleType();

        ret.#array = true;
        ret.#arrayRule = ruleArray;
        if (defaultValueRule)
            ret.#arrayDefaultRule = defaultValueRule;

        return ret;
    }
}

/**
 * 合并值 取其中的非空内容
 * 其中一个为null返回另一个值
 * 当两个都非空且不相等时抛错
 * @param {any} a
 * @param {any} b
 */
function intersectNonNull(a, b)
{
    if (a == b)
        return a;
    if (a != null && b != null)
        throw "Unable to intersect RuleType";
    return (a != null ? a : b);
}

/**
 * 合并值 取相同值
 * 其中一个为null时为null
 * 都不为null时两个值不相同时报错
 * @param {any} a
 * @param {any} b
 */
function mergeSame(a, b)
{
    if (a == null || b == null)
        return null;
    if (a != b)
        throw "Unable to merge RuleType";
    return a;
}

/**
 * 表示一个事件的规则
 */
class EventRule
{
    /**
     * 事件名
     * @type {string}
     */
    eventName = "";
    /**
     * 简短名
     * @type {string}
     */
    shortName = "";

    /**
     * 事件规则 所在的 映射规则
     * @type {import("./MappingRules.js").MappingRules}
     */
    mappingRules = null;

    /**
     * 事件元对象的key列表
     * @type {Array<string>}
     */
    metaObjKeyList = [];

    /**
     * 事件元对象的key集合
     * @type {Set<string>}
     */
    #metaObjKeySet = new Set();

    /**
     * 元对象的key 到 元对象的值的规则 映射
     * 若为null表示不进行类型检查
     * @type {Map<string, RuleType>}
     */
    #metaObjRuleMap = null;

    /**
     * 获取此事件规则的副本
     * @returns {EventRule}
     */
    getCopy()
    {
        let ret = new EventRule();

        ret.metaObjKeyList = this.metaObjKeyList.slice();
        ret.#metaObjKeySet = new Set(this.#metaObjKeySet);
        if (this.#metaObjRuleMap)
            ret.#metaObjRuleMap = new Map(this.#metaObjRuleMap);

        return ret;
    }

    /**
     * 获取此事件规则无类型检查的副本
     * @returns {EventRule}
     */
    getCopyWithoutType()
    {
        let ret = new EventRule();

        ret.metaObjKeyList = this.metaObjKeyList.slice();
        ret.#metaObjKeySet = new Set(this.#metaObjKeySet);

        return ret;
    }

    /**
     * 是否拥有指定的key
     * @param {string} key
     * @returns {boolean}
     */
    hasKey(key)
    {
        return this.#metaObjKeySet.has(key);
    }

    /**
     * 重设key列表
     * 新的列表和原列表应当仅顺序不同 元素内容相同
     * @param {Array<string>} newKeyList
     */
    resetKeyList(newKeyList)
    {
        if (!Array.isArray(newKeyList))
            throw "type error";
        if (newKeyList.length != this.metaObjKeyList.length)
            throw "The reset keylist has a different length";
        /**
         * @type {Set<string>}
         */
        let keySet = new Set();
        for (let key of newKeyList)
        {
            if (keySet.has(key))
                throw "Duplicate key in the reset keylist";
            if (!this.#metaObjKeySet.has(key))
                throw "The reset keylist has key that didnot exist before";
            keySet.add(key);
        }
        this.metaObjKeyList = newKeyList;
    }

    /**
     * 从数组验证并获取事件元数据对象
     * @param {Array<any>} srcArray
     * @returns {object}
     */
    verifyGetArray(srcArray)
    {
        if (!this.#metaObjRuleMap)
            throw "Unable to check type";

        if (srcArray == undefined)
            srcArray = [];
        else if (!Array.isArray(srcArray))
            throw "type error";

        if (srcArray.length > this.metaObjKeyList.length)
            throw "type error";

        let ret = {};

        for (let i = 0, length = this.metaObjKeyList.length; i < length; i++)
        {
            let key = this.metaObjKeyList[i];
            let rule = this.#metaObjRuleMap.get(key);
            let value = srcArray[i];
            if (rule.verify(value))
            {
                Object.defineProperty(
                    ret,
                    key,
                    {
                        value: value,
                        writable: true,
                        configurable: true,
                        enumerable: true
                    }
                );
            }
            else
            {
                throw "type error";
            }
        }
        return ret;
    }

    /**
     * 从元数据对象验证并获取事件元数据对象
     * @param {object} srcObj
     * @returns {object}
     */
    verifyGetObject(srcObj)
    {
        if (!this.#metaObjRuleMap)
            throw "Unable to check type";

        if (srcObj == undefined)
            srcObj = {};

        let ret = {};
        let keyList = Object.keys(srcObj);
        for (let key of keyList)
        {
            if (!this.#metaObjKeySet.has(key))
                throw "type error";
        }
        for (let [key, rule] of this.#metaObjRuleMap)
        {
            let value = srcObj[key];
            if (rule.verify(value))
            {
                Object.defineProperty(
                    ret,
                    key,
                    {
                        value: value,
                        writable: true,
                        configurable: true,
                        enumerable: true
                    }
                );
            }
            else
            {
                throw "type error";
            }
        }
        return ret;
    }

    /**
     * 转换元数据对象到数组
     * @param {object} srcObj
     * @returns {Array<any>}
     */
    metaObjToArray(srcObj)
    {
        let ret = [];
        this.metaObjKeyList.forEach((key, index) =>
        {
            if (Object.hasOwn(srcObj, key))
            {
                ret[index] = srcObj[key];
            }
        });
        if (ret.length > 0)
            return ret;
        else
            return undefined;
    }

    /**
     * 在事件规则元对象结尾追加参数
     * @param {string} key
     * @param {RuleType} [rule]
     * @returns {EventRule} 返回当前规则元对象本身
     */
    addParamToEnd(key, rule)
    {
        if (this.#metaObjKeySet.has(key))
            throw "Duplicate key in meta object";
        this.#metaObjKeySet.add(key);
        this.metaObjKeyList.push(key);
        if (this.#metaObjRuleMap)
        {
            if (!rule)
                throw "Missing rule type in meta object";
            this.#metaObjRuleMap.set(key, rule);
        }
        return this;
    }

    /**
     * 在事件规则元对象开头追加参数
     * @param {string} key
     * @param {RuleType} [rule]
     * @returns {EventRule} 返回当前规则元对象本身
     */
    addParamToFront(key, rule)
    {
        if (this.#metaObjKeySet.has(key))
            throw "Duplicate key in meta object";
        this.#metaObjKeySet.add(key);
        this.metaObjKeyList.unshift(key);
        if (this.#metaObjRuleMap)
        {
            if (!rule)
                throw "Missing rule type in meta object";
            this.#metaObjRuleMap.set(key, rule);
        }
        return this;
    }

    /**
     * 创建事件规则
     * @param {Array<{
     *  key: string,
     *  rule: RuleType
     * }>} metaObjRuleList
     */
    static create(metaObjRuleList)
    {
        let ret = new EventRule();
        ret.#metaObjRuleMap = new Map();
        ret.metaObjKeyList = metaObjRuleList.map(o => o.key);
        metaObjRuleList.forEach(o =>
        {
            if (ret.#metaObjKeySet.has(o.key))
                throw "Duplicate key in meta object";
            ret.#metaObjKeySet.add(o.key);
            if (!o.rule)
                throw "Missing rule type in meta object";
            ret.#metaObjRuleMap.set(o.key, o.rule);
        });
        return ret;
    }

    /**
     * 创建事件规则
     * 不检查类型
     * @param {Array<{
     *  key: string
     * }>} metaObjKeyList
     */
    static createWithoutType(metaObjKeyList)
    {
        let ret = new EventRule();
        ret.metaObjKeyList = metaObjKeyList.map(o => o.key);
        metaObjKeyList.forEach(o =>
        {
            if (ret.#metaObjKeySet.has(o.key))
                throw "Duplicate key in meta object";
            ret.#metaObjKeySet.add(o.key);
        });
        return ret;
    }
}

/**
 * 映射规则
 */
class MappingRules
{
    /**
     * 事件名 到 事件规则 映射
     * @type {Map<string, EventRule>}
     */
    #eventNameMap = new Map();

    /**
     * 简短名 到 事件规则 映射
     * @type {Map<string, EventRule>}
     */
    #shortNameMap = new Map();

    /**
     * 简短名计数器
     * 简短名取36进制数字
     * @type {number}
     */
    #shortCount = 0;

    /**
     * 通过简短名获取事件规则
     * @param {string} shortName
     * @returns {EventRule}
     */
    getRuleByShort(shortName)
    {
        return this.#shortNameMap.get(shortName);
    }

    /**
     * 通过事件名获取事件规则
     * @param {string} eventName
     * @returns {EventRule}
     */
    getRuleByName(eventName)
    {
        return this.#eventNameMap.get(eventName);
    }

    /**
     * 添加一个事件规则
     * 并设置简短名
     * @param {string} eventName
     * @param {string} shortName
     * @param {EventRule} eventRule
     */
    #addEventRuleWithShortName(eventName, shortName, eventRule)
    {
        if (eventRule.mappingRules != null)
            throw "The EventRule cannot be added repeatedly";
        if (this.#eventNameMap.has(eventName))
            throw "Cannot add an EventRule using an existing event name";
        if (this.#shortNameMap.has(shortName))
            throw "Cannot use this short name because the short name is already used";
        eventRule.mappingRules = this;
        eventRule.eventName = eventName;
        eventRule.shortName = shortName;
        this.#eventNameMap.set(eventName, eventRule);
        this.#shortNameMap.set(shortName, eventRule);
    }

    /**
     * 添加一个事件规则
     * @param {string} eventName
     * @param {EventRule} eventRule
     */
    #addEventRule(eventName, eventRule)
    {
        if (eventRule.mappingRules != null)
            throw "The EventRule cannot be added repeatedly";
        if (this.#eventNameMap.has(eventName))
            throw "Cannot add an EventRule using an existing event name";
        eventRule.mappingRules = this;
        eventRule.eventName = eventName;
        this.#eventNameMap.set(eventName, eventRule);
    }

    /**
     * 服务端添加一个事件规则
     * 自动创建简短名
     * @param {string} eventName
     * @param {EventRule} eventRule
     */
    serverAddEventRule(eventName, eventRule)
    {
        let shortName = "";
        do
        {
            shortName = this.#shortCount.toString(36);
            this.#shortCount++;
        }
        while (this.#shortNameMap.has(shortName));

        this.#addEventRuleWithShortName(eventName, shortName, eventRule);
    }

    /**
     * 客户端添加一个事件规则
     * 不自动创建简短名
     * @param {string} eventName
     * @param {EventRule} eventRule
     */
    clientAddEventRule(eventName, eventRule)
    {
        this.#addEventRule(eventName, eventRule);
    }

    /**
     * 设置简短名
     * 不可重复设置简短名
     * @param {string} shortName
     * @param {EventRule} eventRule
     */
    setShortName(shortName, eventRule)
    {
        if (eventRule.mappingRules != this)
            throw "The EventRule is not appended to this MappingRules";
        if (eventRule.shortName)
            throw "Cannot set a short name because the EventRule already has a short name";
        if (this.#shortNameMap.has(shortName) && this.#shortNameMap.get(shortName) != eventRule)
            throw "Cannot use this short name because the short name is already used";
        eventRule.shortName = shortName;
        this.#shortNameMap.set(shortName, eventRule);
    }
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

/**
 * 连接到 qwq-socket 服务器的客户端实例
 * 绑定到一个服务器上下文
 */
class QwQSocketServerClient
{
    /**
     * @type {import("./QwQSocketServer").QwQSocketServer}
     */
    #server = null;

    /**
     * 此服务器实例的映射规则
     * 表示服务端触发的事件相关规则
     * @type {MappingRules}
     */
    #serverMappingRules = null;

    /**
     * 客户端的映射规则
     * 表示客户端触发的事件相关规则
     * @type {MappingRules}
     */
    #clientMappingRules = null;

    /**
     * 实例想要发送一个包
     * @type {EventHandler<{ prefix: string, body: Object }>}
     */
    sendData = new EventHandler();

    /**
     * 客户端的自定义数据
     * @type {object}
     */
    data = {};

    /**
     * 事件监听器
     * @type {Object<string, (eventMetaObj: object, client: QwQSocketServerClient) => void>}
     */
    eventListener = {};

    /**
     * 传递给客户端指定服务端事件的简短名的时间
     * 服务端事件名 到 传递时间 映射
     * @type {Map<string, number>}
     */
    #submitServerShortNameTimeMap = new Map();
    /**
     * 已经传递给客户端指定客户端事件简短名的事件集合
     * 客户端事件名 集合
     * @type {Set<string>}
     */
    #submitClientShortNameSet = new Set();

    /**
     * @private
     */
    constructor()
    { }

    /**
     * 创建客户端实例
     * @param {import("./QwQSocketServer").QwQSocketServer} server
     */
    static create(server)
    {
        let ret = new QwQSocketServerClient();
        ret.#server = server;
        ret.#serverMappingRules = server.serverMappingRules;
        ret.#clientMappingRules = server.clientMappingRules;
        return ret;
    }

    /**
     * 触发事件
     * @param {string} eventName
     * @param {object} eventMetaObj
     */
    #triggerLocalEvent(eventName, eventMetaObj)
    {
        let eventListenerFunc = this.eventListener[eventName];
        if (eventListenerFunc)
        {
            try
            {
                eventListenerFunc(eventMetaObj, this);
            }
            catch (err)
            {
                console.error(err);
            }
        }
    }


    /**
     * 收到客户端的数据
     * @param {string} prefix
     * @param {Object} body 
     */
    receiveData(prefix, body)
    {
        if (prefix.length == 0)
            return;
        let prefixFirstCharCode = prefix.charCodeAt(0);
        if (
            (48 <= prefixFirstCharCode && prefixFirstCharCode <= 57) || // 0 - 9
            (97 <= prefixFirstCharCode && prefixFirstCharCode <= 122) // a - z
        )
        { // 以简短名触发事件
            let shortName = prefix;
            let eventRule = this.#serverMappingRules.getRuleByShort(shortName);
            if (!eventRule)
                throw "The short name provided by the client does not exist";
            let eventMetaObj = eventRule.verifyGetArray(body);
            this.#triggerLocalEvent(eventRule.eventName, eventMetaObj);
        }
        else if (prefix[0] == "*")
        { // 以事件名触发事件
            let eventName = prefix.slice(1);
            let eventRule = this.#serverMappingRules.getRuleByName(eventName);
            if (!eventRule)
                throw "The event name provided by the client does not exist";

            if (eventRule.shortName)
            { // 告知对端简短名
                let submitShortNameTime = this.#submitServerShortNameTimeMap.get(eventName);
                let now = Date.now();
                if (submitShortNameTime == undefined)
                {
                    this.sendData.trigger({
                        prefix: "=" + eventName,
                        body: {
                            key: eventRule.metaObjKeyList,
                            short: eventRule.shortName
                        }
                    });
                    this.#submitServerShortNameTimeMap.set(eventName, now);
                }
                else if (submitShortNameTime < now - 60 * 1000)
                    throw "The client knows the short name but does not execute it";
            }

            let eventMetaObj = eventRule.verifyGetObject(body);
            this.#triggerLocalEvent(eventRule.eventName, eventMetaObj);
        }
        else
        {
            throw "protocol error";
        }
    }

    /**
     * 触发对端事件
     * @param {string} eventName
     * @param {object} eventMetaObj
     */
    sendTrigger(eventName, eventMetaObj)
    {
        let eventRule = this.#clientMappingRules.getRuleByName(eventName);
        if (eventRule?.shortName)
        { // 存在简短名
            if (this.#submitClientShortNameSet.has(eventName))
            { // 已经传递简短名
                this.sendData.trigger({
                    prefix: eventRule.shortName,
                    body: eventRule.metaObjToArray(eventMetaObj)
                });
            }
            else
            { // 还未传递简短名
                this.sendData.trigger({
                    prefix: "+" + eventName,
                    body: {
                        short: eventRule.shortName,
                        key: eventRule.metaObjKeyList,
                        value: eventRule.metaObjToArray(eventMetaObj)
                    }
                });
                this.#submitClientShortNameSet.add(eventName);
            }
        }
        else
        { // 不存在简短名
            this.sendData.trigger({
                prefix: "*" + eventName,
                body: eventMetaObj
            });
        }
    }
}

/**
 * qwq-socket 服务器
 * 表示一个可接受客户端连接的服务器上下文
 */
class QwQSocketServer
{
    /**
     * 服务器的映射规则
     * 表示服务端触发的事件相关规则
     * @type {MappingRules}
     */
    serverMappingRules = new MappingRules();
    /**
     * 客户端的映射规则
     * 表示客户端触发的事件相关规则
     * @type {MappingRules}
     */
    clientMappingRules = new MappingRules();

    /**
     * 创建连接到此服务端的客户端
     * @returns {QwQSocketServerClient}
     */
    createClient()
    {
        let ret = QwQSocketServerClient.create(this);
        return ret;
    }
}

/**
 * 传递服务端事件的短名称 包类型规则
 */
let submitServerShortNameObjRule = RuleType.object({
    key: RuleType.array([], RuleType.string()),
    short: RuleType.string()
});
/**
 * 传递客户端事件的短名称并触发 包类型规则
 */
let submitClientShortNameAndTriggerObjRule = RuleType.object({
    key: RuleType.array([], RuleType.string()),
    short: RuleType.string()
}, {
    value: RuleType.array([], RuleType.any())
});

// TODO 增加 查询操作 的解决方案

/**
 * qwq-socket 客户端
 * 表示 服务器侧 或 用户侧 的客户端实例
 */
class QwQSocketClient
{
    /**
     * 表示连接到的服务器的事件规则
     * @type {MappingRules}
     */
    #serverMappingRules = new MappingRules();

    /**
     * 表示此客户端触发的事件相关规则
     * @type {MappingRules}
     */
    #clientMappingRules = new MappingRules();

    /**
     * 实例想要发送一个包
     * @type {EventHandler<{ prefix: string, body: Object }>}
     */
    sendData = new EventHandler();

    /**
     * 客户端的自定义数据
     * @type {object}
     */
    data = {};

    /**
     * 事件监听器
     * @type {Object<string, (eventMetaObj: object, client: QwQSocketClient) => void>}
     */
    eventListener = {};

    constructor()
    { }

    /**
     * 添加事件规则
     * @param {string} eventName
     * @param {EventRule} eventRule
     */
    addEventRule(eventName, eventRule)
    {
        this.#clientMappingRules.clientAddEventRule(eventName, eventRule);
    }

    /**
     * 触发事件
     * @param {string} eventName
     * @param {object} eventMetaObj
     */
    #triggerLocalEvent(eventName, eventMetaObj)
    {
        let eventListenerFunc = this.eventListener[eventName];
        if (eventListenerFunc)
        {
            try
            {
                eventListenerFunc(eventMetaObj, this);
            }
            catch (err)
            {
                console.error(err);
            }
        }
    }

    /**
     * 收到客户端的数据
     * @param {string} prefix
     * @param {Object} body 
     */
    receiveData(prefix, body)
    {
        if (prefix.length == 0)
            return;
        switch (prefix[0])
        {
            case "*": {
                // 以事件名触发事件
                let eventName = prefix.slice(1);
                let eventRule = this.#clientMappingRules.getRuleByName(eventName);
                if (!eventRule)
                    throw "The event name provided by the server does not exist";

                let eventMetaObj = eventRule.verifyGetObject(body);
                this.#triggerLocalEvent(eventRule.eventName, eventMetaObj);

                break;
            }
            case "+": {
                if (!submitClientShortNameAndTriggerObjRule.verify(body))
                    throw "The body of the submit client short name packet sent by server has an type error";

                let eventName = prefix.slice(1);
                /**
                 * @type {{
                 *  key: Array<string>,
                 *  short: string,
                 *  value?: Array<any>
                 * }}
                 */
                let infoObj = body;
                let eventRule = this.#clientMappingRules.getRuleByName(eventName);
                if (!eventRule)
                    throw "The event name provided by the server does not exist";
                if (infoObj.short)
                    this.#clientMappingRules.setShortName(infoObj.short, eventRule);
                eventRule.resetKeyList(infoObj.key);
                if (infoObj.value)
                {
                    let eventMetaObj = eventRule.verifyGetArray(infoObj.value);
                    this.#triggerLocalEvent(eventRule.eventName, eventMetaObj);
                }

                break;
            }
            case "=": {
                if (!submitServerShortNameObjRule.verify(body))
                    throw "The body of the submit server short name packet sent by server has an type error";

                let eventName = prefix.slice(1);
                /**
                 * @type {{
                 *  key: Array<string>,
                 *  short: string
                 * }}
                 */
                let infoObj = body;
                let eventRule = this.#serverMappingRules.getRuleByName(eventName);
                if (!eventRule)
                {
                    eventRule = EventRule.createWithoutType(infoObj.key.map(o => ({ key: o })));
                    this.#serverMappingRules.clientAddEventRule(eventName, eventRule);
                    if (infoObj.short)
                        this.#serverMappingRules.setShortName(infoObj.short, eventRule);
                }
                else
                {
                    if (infoObj.short)
                        this.#serverMappingRules.setShortName(infoObj.short, eventRule);
                    if (infoObj.key)
                        eventRule.resetKeyList(infoObj.key);
                }

                break;
            }
            default: {
                let prefixFirstCharCode = prefix.charCodeAt(0);
                if (
                    (48 <= prefixFirstCharCode && prefixFirstCharCode <= 57) || // 0 - 9
                    (97 <= prefixFirstCharCode && prefixFirstCharCode <= 122) // a - z
                )
                { // 以简短名触发事件
                    let shortName = prefix;
                    let eventRule = this.#clientMappingRules.getRuleByShort(shortName);
                    if (!eventRule)
                        throw "The short name provided by the server does not exist";
                    let eventMetaObj = eventRule.verifyGetArray(body);
                    this.#triggerLocalEvent(eventRule.eventName, eventMetaObj);
                }
                else
                {
                    throw "protocol error";
                }
            }
        }
    }

    /**
     * 触发对端事件
     * @param {string} eventName
     * @param {object} [eventMetaObj]
     */
    sendTrigger(eventName, eventMetaObj = {})
    {
        let eventRule = this.#serverMappingRules.getRuleByName(eventName);
        if (eventRule?.shortName)
        { // 已知服务端事件简短名
            this.sendData.trigger({
                prefix: eventRule.shortName,
                body: eventRule.metaObjToArray(eventMetaObj)
            });
        }
        else
        { // 未知服务端事件简短名
            this.sendData.trigger({
                prefix: "*" + eventName,
                body: eventMetaObj
            });
        }
    }
}

/**
 * 36的8次方
 */
const num_36_pow_8 = 2821109907456;

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
function uniqueIdentifierString(randomSection = 2)
{
    var ret = Math.floor(Date.now()).toString(36);
    if (globalThis?.crypto?.getRandomValues)
    {
        let randomBuffer = crypto.getRandomValues(new Uint8Array(randomSection * 6));
        for (let i = 0; i < randomSection; i++)
        {
            let value = 0;
            for (let j = 0; j < 6; j++)
                value = (value + randomBuffer[(i * 6) + j]) / 256;
            ret += "-" + Math.floor(Math.random() * num_36_pow_8).toString(36);
        }
    }
    else
    {
        for (let i = 0; i < randomSection; i++)
            ret += "-" + Math.floor(Math.random() * num_36_pow_8).toString(36);
    }
    return ret;
}

/**
 * 查询时错误
 */
class QueryError
{
    /**
     * 错误原因
     * @type {string}
     */
    cause = "";

    /**
     * 请求错误
     * 在请求处理函数中抛出将返回错误
     * @param {string} cause
     */
    constructor(cause)
    {
        this.cause = cause;
    }

    toString()
    {
        return `QueryError: ${this.cause}`;
    }
}

/**
 * 查询超时错误
 * 当发起查询超时时抛出
 */
class QueryTimeoutError extends QueryError
{
    constructor()
    {
        super("Timeout");
    }

    toString()
    {
        return `QueryError: Timeout`;
    }
}

const metaObjQueryIdKey$1 = "-query-id";
const metaObjCauseKey$1 = "-cause";

/**
 * 绑定器操作器
 * 用于操作socket发送事件或查询
 * @template {QwQSocketClient | QwQSocketServerClient} T
 */
class BinderOperator
{
    /**
     * 操作器的操作目标
     * @type {T}
     */
    #target = null;

    /**
     * 触发事件映射对象
     * 调用函数触发对端事件
     * @type {Object<string, (metaObj: Object) => void>}
     */
    trigger = {};

    /**
     * 查询映射对象
     * 调用函数触发对端事件
     * @type {Object<string, (metaObj: Object, timeout?: number, timeoutBehavior?: "reject" | "resolve" | "discard") => Promise<Object>>}
     */
    query = {};

    /**
     * @param {T} target
     */
    constructor(target)
    {
        this.#target = target;
    }

    /**
     * 添加触发器
     * @param {string} eventName
     */
    addTrigger(eventName)
    {
        if (this.trigger[eventName])
            throw `Trigger "${eventName}" already exists`;
        this.trigger[eventName] = (metaObj) =>
        {
            this.#target.sendTrigger(eventName, metaObj);
        };
    }

    /**
     * 添加查询
     * @param {string} queryName
     */
    addQuery(queryName)
    {
        if (this.query[queryName])
            throw `Query "${queryName}" already exists`;

        let requestEventName = queryName + "-req";
        let respondEventName = queryName + "-rsp";
        let errorRespondEventName = queryName + "-ersp";

        if (this.#target.eventListener[respondEventName])
            throw `Unable to bind query "${queryName}" because response event listener is occupied`;
        if (this.#target.eventListener[errorRespondEventName])
            throw `Unable to bind query "${queryName}" because error response event listener is occupied`;

        /**
         * 查询中的映射
         * 查询id 到 查询响应操作对象 映射
         * @type {Map<string, {
         *  resolve: (value: any) => void,
         *  reject: (err: any) => void,
         *  startTime: number,
         *  timeoutId?: number | NodeJS.Timeout
         * }>}
         */
        let inQueryMap = new Map();

        this.#target.eventListener[respondEventName] = (/** @type {any} */ metaObj) =>
        {
            let queryId = metaObj[metaObjQueryIdKey$1];
            let inQueryObj = inQueryMap.get(queryId);
            if (inQueryObj)
            {
                inQueryMap.delete(queryId);
                delete metaObj[metaObjQueryIdKey$1];

                inQueryObj.resolve(metaObj);
            }
        };
        this.#target.eventListener[errorRespondEventName] = (/** @type {any} */ metaObj) =>
        {
            let queryId = metaObj[metaObjQueryIdKey$1];
            let inQueryObj = inQueryMap.get(queryId);
            if (inQueryObj)
            {
                inQueryMap.delete(queryId);

                inQueryObj.reject(new QueryError(metaObj[metaObjCauseKey$1]));
            }
        };

        this.query[queryName] = (queryMetaObj, timeout, timeoutBehavior) =>
        {
            if (queryMetaObj[metaObjQueryIdKey$1] != undefined)
                throw `Cannot use internally occupied name "${metaObjQueryIdKey$1}"`;

            return new Promise((resolve, reject) =>
            {
                let queryId = uniqueIdentifierString();
                let metaObj = Object.assign({}, queryMetaObj);
                metaObj[metaObjQueryIdKey$1] = queryId;

                inQueryMap.set(queryId, {
                    resolve,
                    reject,
                    startTime: Date.now(),
                    timeoutId: (
                        timeout != undefined ?
                            setTimeout(() =>
                            {
                                let inQueryObj = inQueryMap.get(queryId);
                                inQueryMap.delete(queryId);

                                if (timeoutBehavior == "resolve")
                                    inQueryObj.resolve(null);
                                else if (timeoutBehavior != "discard")
                                    inQueryObj.reject(new QueryTimeoutError());
                            }, timeout) :
                            undefined
                    )
                });

                this.#target.sendTrigger(requestEventName, metaObj);
            });
        };
    }
}

const metaObjQueryIdKey = "-query-id";
const metaObjCauseKey = "-cause";

/**
 * 事件规则绑定器
 * 创建一个事件列表 然后附加到服务端或者客户端
 */
class RuleBinder
{
    /**
     * 事件名列表
     * @type {Array<string>}
     */
    #eventNameList = [];

    /**
     * 事件名集合
     * @type {Set<string>}
     */
    #eventNameSet = new Set();

    /**
     * 事件名 到 事件规则 映射
     * @type {Map<string, EventRule>}
     */
    #eventRuleMap = new Map();

    /**
     * 事件名 到 事件监听器 映射
     * @type {Map<string, (eventMetaObj: object, target: QwQSocketServerClient | QwQSocketClient) => void>}
     */
    #eventListenerMap = new Map();

    /**
     * 查询名集合
     * @type {Set<string>}
     */
    #queryNameSet = new Set();

    /**
     * 绑定到指定端的事件
     * @type {"server" | "client" | "peer" | ""}
     */
    #bound = "";

    /**
     * 对端事件规则绑定器
     * @type {RuleBinder}
     */
    #opposite = null;

    /**
     * @private
     */
    constructor()
    { }

    /**
     * 检测合法的用户事件名
     * 允许 数字 大写或小写字母 下划线(_)
     * @param {string} name
     * @returns {boolean} 
     */
    static #isValidEventName(name)
    {
        return (/^[a-zA-Z0-9_]+$/).test(name);
    }

    /**
     * 添加事件名
     * @param {string} eventName
     */
    #addEventName(eventName)
    {
        if (this.#eventNameSet.has(eventName))
            return;
        this.#eventNameSet.add(eventName);
        this.#eventNameList.push(eventName);
    }

    /**
     * 添加事件规则
     * @param {string} eventName
     * @param {EventRule} eventRule
     */
    addEventRule(eventName, eventRule)
    {
        if (!RuleBinder.#isValidEventName(eventName))
            throw `"${eventName}" is not a valid event name`;
        this.#addEventName(eventName);
        if (this.#eventRuleMap.has(eventName))
            throw `The "${eventName}" event rule is defined repeatedly`;
        this.#eventRuleMap.set(eventName, eventRule.getCopy());
    }

    /**
     * 添加多个事件规则
     * @param {Object<string, EventRule>} eventRules
     */
    addEventRules(eventRules)
    {
        Object.entries(eventRules).forEach(([eventName, eventRule]) =>
        {
            this.addEventRule(eventName, eventRule);
        });
    }


    /**
     * 设置事件监听器
     * @param {string} eventName
     * @param {(eventMetaObj: object, target: QwQSocketServerClient | QwQSocketClient) => void} listener
     */
    setEventListener(eventName, listener)
    {
        if (!RuleBinder.#isValidEventName(eventName))
            throw `"${eventName}" is not a valid event name`;
        this.#addEventName(eventName);
        if (this.#eventListenerMap.has(eventName))
            throw `The "${eventName}" event listener is defined repeatedly`;
        this.#eventListenerMap.set(eventName, listener);
    }

    /**
     * 设置多个事件监听器
     * @param {Object<string, (eventMetaObj: object, target: QwQSocketServerClient | QwQSocketClient) => void>} eventListeners
     */
    setEventListeners(eventListeners)
    {
        Object.entries(eventListeners).forEach(([eventName, listener]) =>
        {
            this.setEventListener(eventName, listener);
        });
    }

    /**
     * 添加查询规则
     * @param {string} queryName
     * @param {EventRule} requestRule
     * @param {EventRule} responseRule
     */
    addQueryRule(queryName, requestRule, responseRule)
    {
        if (!RuleBinder.#isValidEventName(queryName))
            throw `"${queryName}" is not a valid query name`;

        this.#queryNameSet.add(queryName);

        let requestEventName = queryName + "-req";
        let respondEventName = queryName + "-rsp";
        let errorRespondEventName = queryName + "-ersp";

        if (requestRule.hasKey(metaObjQueryIdKey) || responseRule.hasKey(metaObjQueryIdKey))
            throw `Cannot use internally occupied name "${metaObjQueryIdKey}"`;

        let opposite = this.#opposite;
        if (opposite == null)
            throw "Cannot bind event response because the opposite does not exist";

        // 绑定请求事件
        this.#addEventName(requestEventName);
        if (this.#eventRuleMap.has(requestEventName))
            throw `The "${queryName}" query request rule is defined repeatedly`;
        this.#eventRuleMap.set(
            requestEventName,
            requestRule.getCopy().addParamToFront(metaObjQueryIdKey, RuleType.string())
        );

        // 绑定响应事件
        opposite.#addEventName(respondEventName);
        if (opposite.#eventRuleMap.has(respondEventName))
            throw `The "${queryName}" query response rule is defined repeatedly`;
        opposite.#eventRuleMap.set(
            respondEventName,
            responseRule.getCopy().addParamToFront(metaObjQueryIdKey, RuleType.string())
        );

        // 绑定错误响应事件
        opposite.#addEventName(errorRespondEventName);
        if (opposite.#eventRuleMap.has(errorRespondEventName))
            throw `The "${queryName}" query error-response rule is defined repeatedly`;
        opposite.#eventRuleMap.set(
            errorRespondEventName,
            EventRule.create([
                {
                    key: metaObjQueryIdKey,
                    rule: RuleType.string()
                },
                {
                    key: metaObjCauseKey,
                    rule: RuleType.string().merge(RuleType.undefined())
                }
            ])
        );
    }

    /**
     * 添加多个查询规则
     * @param {Object<string, { request: EventRule, response: EventRule }>} queryRules
     */
    addQueryRules(queryRules)
    {
        Object.entries(queryRules).forEach(([queryName, queryRulePair]) =>
        {
            this.addQueryRule(queryName, queryRulePair.request, queryRulePair.response);
        });
    }

    /**
     * 设置查询处理函数
     * @param {string} queryName
     * @param {(eventMetaObj: object, target: QwQSocketServerClient | QwQSocketClient) => (Promise<any> | any)} processor
     */
    setQueryProcessor(queryName, processor)
    {
        if (!RuleBinder.#isValidEventName(queryName))
            throw `"${queryName}" is not a valid query name`;

        this.#queryNameSet.add(queryName);

        let requestEventName = queryName + "-req";
        let respondEventName = queryName + "-rsp";
        let errorRespondEventName = queryName + "-ersp";

        this.#addEventName(requestEventName);
        if (this.#eventListenerMap.has(requestEventName))
            throw `The "${queryName}" query processor is defined repeatedly`;
        this.#eventListenerMap.set(
            requestEventName,
            async (eventMetaObj, target) => // 请求事件的监听器
            {
                let queryId = eventMetaObj[metaObjQueryIdKey];
                try
                {
                    let result = await processor(eventMetaObj, target);

                    if (result == null)
                    {
                        result = {};
                    }
                    else
                    {
                        if (typeof (result) != "object")
                            throw "query processor muse return a object";
                        result = Object.assign({}, result);
                    }

                    result[metaObjQueryIdKey] = queryId;

                    // 完成请求 触发响应事件
                    target.sendTrigger(respondEventName, result);
                }
                catch (err)
                { // 请求失败 触发错误响应事件
                    if (err instanceof QueryError)
                    {
                        target.sendTrigger(errorRespondEventName, {
                            [metaObjQueryIdKey]: queryId,
                            [metaObjCauseKey]: err.cause
                        });
                    }
                    else
                    {
                        console.error(err);
                        target.sendTrigger(errorRespondEventName, {
                            [metaObjQueryIdKey]: queryId
                        });
                    }
                }
            }
        );
    }

    /**
     * 设置多个查询处理函数
     * @param {Object<string, (eventMetaObj: object, target: QwQSocketServerClient | QwQSocketClient) => any>} queryProcessors
     */
    setQueryProcessors(queryProcessors)
    {
        Object.entries(queryProcessors).forEach(([queryName, processor]) =>
        {
            this.setQueryProcessor(queryName, processor);
        });
    }

    /**
     * 应用到实例
     * @param {QwQSocketServer | QwQSocketServerClient | QwQSocketClient} target
     */
    applyToInstance(target)
    {
        if (this.#bound == "server") // 应用到服务端
        {
            if (target instanceof QwQSocketServer) // 应用到 服务端 实例
            {
                // 向 服务端 实例 添加服务端事件的规则
                this.#eventNameList.forEach(eventName =>
                {
                    let eventRule = this.#eventRuleMap.get(eventName);
                    if (!eventRule)
                        throw `Cannot attach to target because rule "${eventName}" is missing`;
                    target.serverMappingRules.serverAddEventRule(eventName, eventRule.getCopy());
                });

                // 向 服务端 实例 添加客户端事件的规则
                if (this.#opposite)
                {
                    let opposite = this.#opposite;
                    opposite.#eventNameList.forEach(eventName =>
                    {
                        let eventRule = opposite.#eventRuleMap.get(eventName);
                        if (!eventRule)
                            throw `Cannot attach to target because rule "${eventName}" is missing`;
                        target.clientMappingRules.serverAddEventRule(eventName, eventRule.getCopyWithoutType());
                    });
                }
            }
            else if (target instanceof QwQSocketServerClient) // 应用到 服务端的单个客户端 实例
            {
                // 向 服务端的单个客户端 实例 添加事件监听器
                this.#eventNameList.forEach(eventName =>
                {
                    let eventListener = this.#eventListenerMap.get(eventName);
                    if (eventListener)
                    {
                        if (target.eventListener[eventName])
                            throw `Cannot attach to target because a listener "${eventName}" is already bound on the target`;
                        // @ts-ignore
                        target.eventListener[eventName] = eventListener;
                    }
                });
            }
            else
                throw "The binding type does not match the target (should bind to server)";

        }
        else if (this.#bound == "client") // 应用到客户端
        {
            if (!(target instanceof QwQSocketClient))
                throw "The binding type does not match the target";
            this.#eventNameList.forEach(eventName =>
            {
                let eventRule = this.#eventRuleMap.get(eventName);
                if (!eventRule)
                    throw `Cannot attach to target because rule "${eventName}" is missing`;
                target.addEventRule(eventName, eventRule.getCopy());

                let eventListener = this.#eventListenerMap.get(eventName);
                if (eventListener)
                {
                    if (target.eventListener[eventName])
                        throw `Cannot attach to target because a listener "${eventName}" is already bound on the target`;
                    // @ts-ignore
                    target.eventListener[eventName] = eventListener;
                }
            });
        }
        else
            throw "Unsupported binding type (should bind to client)";
    }

    /**
     * 创建操作器
     * @template {QwQSocketServerClient | QwQSocketClient} K
     * @param {K} target 
     * @returns {BinderOperator<K>}
     */
    createOperator(target)
    {
        let opposite = this.#opposite;
        if (opposite == null)
            throw "Cannot create operator because the opposite RuleBinder does not exist";
        let ret = new BinderOperator(target);
        opposite.#eventNameList.forEach(eventName =>
        {
            ret.addTrigger(eventName);
        });
        opposite.#queryNameSet.forEach(queryName =>
        {
            ret.addQuery(queryName);
        });
        return ret;
    }

    /**
     * 绑定对端
     * 服务端规则和客户端规则之间的绑定
     * @param {RuleBinder} target
     */
    bindOpposite(target)
    {
        if (
            (this.#opposite && this.#opposite != target) ||
            (target.#opposite && target.#opposite != this)
        )
            throw "Target cannot be bound because it is already bound to another target";
        this.#opposite = target;
        target.#opposite = this;
    }

    /**
     * 创建服务端事件规则集
     * @returns {RuleBinder}
     */
    static createServerBound()
    {
        let ret = new RuleBinder();
        ret.#bound = "server";
        return ret;
    }

    /**
     * 创建客户端事件规则集
     * @returns {RuleBinder}
     */
    static createClientBound()
    {
        let ret = new RuleBinder();
        ret.#bound = "client";
        return ret;
    }
}

export { BinderOperator, EventRule, QueryError, QueryTimeoutError, QwQSocketClient, QwQSocketServer, QwQSocketServerClient, RuleBinder, RuleType };
