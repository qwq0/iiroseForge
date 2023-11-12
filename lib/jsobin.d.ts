/**
 * JSOBin操作上下文
 */
declare class JSOBin {
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
     * @param {{
     *  referenceString?: boolean
     * }} [config]
     * @returns {Uint8Array}
     */
    encode(obj: object | number | string, config?: {
        referenceString?: boolean;
    } | undefined): Uint8Array;
    /**
     * 解码
     * @param {Uint8Array} bin
     * @returns {object | number | string}
     */
    decode(bin: Uint8Array): object | number | string;
    #private;
}

/**
 * 自定义序列化函数
 */
declare const serializationFunctionSymbol: unique symbol;
/**
 * 自定义反序列化函数
 */
declare const deserializationFunctionSymbol: unique symbol;

export { JSOBin, deserializationFunctionSymbol, serializationFunctionSymbol };
