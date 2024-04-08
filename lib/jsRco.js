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

    /**
     * 命名的symbol映射
     * 命名的symbol字符串标识 到 函数
     * @package
     * @type {Map<string, symbol>}
     */
    nameToNamedSymbol = new Map();

    /**
     * 命名的symbol映射
     * 函数 到 命名的symbol字符串标识
     * @package
     * @type {Map<symbol, string>}
     */
    namedSymbolToName = new Map();
}

/**
 * 自定义序列化函数
 */
const serializationFunctionSymbol = Symbol("serialization function");
/**
 * 自定义反序列化函数
 */
const deserializationFunctionSymbol = Symbol("deserialization function");

const textEncoder = new TextEncoder();

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
        let strBin = textEncoder.encode(str);
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
                if (Number.isInteger(now) && now >= -2147483648 && now <= 2147483647 && !Object.is(now, -0)) // 32位整数
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
                {
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
                if (this.#referenceIndMap.get(now) < this.#referenceIndCount) // 需要引用的symbol
                {
                    this.push(14);
                    this.pushVint(this.#referenceIndMap.get(now));
                }
                else if (this.#state.namedSymbolToName.has(now)) // 命名的symbol
                {
                    this.push(18);
                    this.pushStr(this.#state.namedSymbolToName.get(now));
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
            if (childCount < 0)
                throw "JSOBin Decode: Wrong format";
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
            let ret = decoder.getArr(length).buffer;
            decoder.referenceIndList.push(ret);
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
        typeId: 10,
        byteFactor: 1
    },
    {
        constructor: Uint8Array,
        typeId: 11,
        byteFactor: 1
    },
    {
        constructor: Int16Array,
        typeId: 12,
        byteFactor: 2
    },
    {
        constructor: Uint16Array,
        typeId: 13,
        byteFactor: 2
    },
    {
        constructor: Int32Array,
        typeId: 14,
        byteFactor: 4
    },
    {
        constructor: Uint32Array,
        typeId: 15,
        byteFactor: 4
    },
    {
        constructor: BigInt64Array,
        typeId: 16,
        byteFactor: 8
    },
    {
        constructor: BigUint64Array,
        typeId: 17,
        byteFactor: 8
    },
    {
        constructor: Float32Array,
        typeId: 18,
        byteFactor: 4
    },
    {
        constructor: Float64Array,
        typeId: 19,
        byteFactor: 8
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
        if (length < 0 || byteOffset < 0)
            throw "JSOBin Decode: Wrong format";
        let buffer = decode.traversal();
        if (!(buffer instanceof ArrayBuffer) || byteOffset + o.byteFactor * length > buffer.byteLength)
            throw "JSOBin Decode: Wrong format";

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
        if (this.index >= this.buffer.length)
            throw "JSOBin Decode: Wrong format";
        return this.buffer[this.index];
    }

    /**
     * 弹出当前位置的byte
     * 将移动索引位置
     * @returns {number}
     */
    popByte()
    {
        if (this.index >= this.buffer.length)
            throw "JSOBin Decode: Wrong format";
        return this.buffer[this.index++];
    }

    /**
     * 获取缓冲区中的一段
     * @param {number} len 
     * @returns {Uint8Array}
     */
    getArr(len)
    {
        if (len < 0 || this.index + len > this.buffer.length)
            throw "JSOBin Decode: Wrong format";
        let slice = this.buffer.slice(this.index, this.index + len);
        this.index += len;
        return slice;
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
        if (len < 0 || this.index + len > this.buffer.length)
            throw "JSOBin Decode: Wrong format";
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
                if (childCount < 0)
                    throw "JSOBin Decode: Wrong format";
                this.referenceIndList.push(ret);
                for (let i = 0; i < childCount; i++)
                {
                    let key = this.getStr();
                    let value = this.traversal();
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
                {
                    let dataObj = {};
                    let childCount = this.getVInt();
                    if (childCount < 0)
                        throw "JSOBin Decode: Wrong format";
                    let refInd = this.referenceIndList.length;
                    this.referenceIndList.push(dataObj);
                    for (let i = 0; i < childCount; i++)
                    {
                        let key = this.getStr();
                        let value = this.traversal();
                        Object.defineProperty(
                            dataObj,
                            key,
                            {
                                value: value,
                                writable: true,
                                configurable: true,
                                enumerable: true
                            }
                        );
                    }
                    let ret = classConstructor[deserializationFunctionSymbol](dataObj);
                    this.referenceIndList[refInd] = ret;
                    return ret;
                }
                else // 自定义类默认序列化方案
                {
                    let ret = Object.create(classConstructor.prototype);
                    let childCount = this.getVInt();
                    if (childCount < 0)
                        throw "JSOBin Decode: Wrong format";
                    this.referenceIndList.push(ret);
                    for (let i = 0; i < childCount; i++)
                    {
                        let key = this.getStr();
                        let value = this.traversal();
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
                if (referenceInd < 0 || referenceInd >= this.referenceIndList.length)
                    throw "JSOBin Decode: Wrong format";
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
                if (!func)
                    throw "JSOBin Decode: A non-existent security function was used";
                this.referenceIndList.push(func);
                return func;
            }

            case 18: { // 命名的symbol
                let symbol = this.#state.nameToNamedSymbol.get(this.getStr());
                if (!symbol)
                    throw "JSOBin Decode: A non-existent named symbol was used";
                this.referenceIndList.push(symbol);
                return symbol;
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
        if (len < 0)
            throw "JSOBin Decode: Wrong format";
        let ret = 0n;
        let endPtr = this.index + len - 1;
        if (this.index >= this.buffer.length)
            throw "JSOBin Decode: Wrong format";
        for (let ptr = endPtr; ptr >= this.index; ptr--)
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
     * 添加命名的symbol
     * 允许确保通过此symbol的标识符和symbol的相互映射
     * @param {string} identifier symbol的名称(标识符)
     * @param {symbol} namedSymbol
     */
    addNamedSymbol(identifier, namedSymbol)
    {
        this.#state.nameToNamedSymbol.set(identifier, namedSymbol);
        this.#state.namedSymbolToName.set(namedSymbol, identifier);
    }

    /**
     * 编码
     * @param {object | number | string} obj
     * @param {{
     *  referenceString?: boolean
     * }} [config]
     * @returns {Uint8Array}
     */
    encode(obj, config = {})
    {
        config = Object.assign({
            referenceString: false
        }, config);
        return (new Encoder(this.#state, config.referenceString)).encode(obj);
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
function uniqueIdentifierString(randomSection = 2)
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
class RcoContext
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
            let resolveId = uniqueIdentifierString();
            let rejectId = uniqueIdentifierString();
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
                        let resolveId = uniqueIdentifierString();
                        let rejectId = uniqueIdentifierString();
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
                let functionId = uniqueIdentifierString();
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

export { RcoContext };
