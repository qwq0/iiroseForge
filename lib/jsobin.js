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

export { JSOBin, deserializationFunctionSymbol, serializationFunctionSymbol };
