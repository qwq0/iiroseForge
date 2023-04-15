/**
 * 自定义序列化函数
 */
export const serializationFunctionSymbol = Symbol("serialization function");
/**
 * 自定义反序列化函数
 */
export const deserializationFunctionSymbol = Symbol("deserialization function");

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
export class JSOBin
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
        }

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