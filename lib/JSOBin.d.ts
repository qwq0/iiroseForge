/**
 * 自定义序列化函数
 */
export const serializationFunctionSymbol: unique symbol;
/**
 * 自定义反序列化函数
 */
export const deserializationFunctionSymbol: unique symbol;
/**
 * JSOBin操作上下文
 */
export class JSOBin {
    /**
     * 序列化一个bigint
     * @param {bigint} num
     * @returns {Uint8Array}
     */
    static writeBigint(num: bigint): Uint8Array;
    /**
     * 反序列化一个Bigint
     * @param {Uint8Array} buf
     * @param {number} startInd
     * @param {number} len
     * @returns {bigint}
     */
    static readBigInt(buf: Uint8Array, startInd: number, len: number): bigint;
    /**
     * 类映射
     * 类名字符串标识 到 类(构造函数)
     * @private
     * @type {Map<string, object>}
     */
    private nameToClass;
    /**
     * 类映射
     * 类(构造函数) 到 类名字符串标识
     * @private
     * @type {Map<object, string>}
     */
    private classToName;
    /**
     * 安全函数映射
     * 安全函数字符串标识 到 函数
     * @private
     * @type {Map<string, function>}
     */
    private nameToSFunction;
    /**
     * 安全函数映射
     * 函数 到 安全函数字符串标识
     * @private
     * @type {Map<function, string>}
     */
    private sFunctionToName;
    /**
     * 添加类到上下文
     * 注册标识符和类(构造器)的相互映射
     * @param {string} identifier 类标识符
     * @param {function} classConstructor 类的构造器
     */
    addClass(identifier: string, classConstructor: Function): void;
    /**
     * 添加安全函数到上下文
     * 允许确保安全的函数注册标识符和函数的相互映射
     * @param {string} identifier 安全函数标识符
     * @param {function} safetyFunction 函数
     */
    addSafetyFunction(identifier: string, safetyFunction: Function): void;
    /**
     * 编码
     * @param {object | number | string} obj
     * @returns {Uint8Array}
     */
    encode(obj: object | number | string): Uint8Array;
    /**
     * 解码
     * @param {Uint8Array} bin
     * @returns {object | number | string}
     */
    decode(bin: Uint8Array): object | number | string;
}
