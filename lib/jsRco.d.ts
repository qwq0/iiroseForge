/**
 * rco操作上下文
 */
declare class RcoContext {
    /**
     * 绑定输出流
     * 会覆盖之前绑定的输出流
     * @param {(data: string | Uint8Array | object) => void} onDataCallback
     * @param { "jsob" | "jsobin" | "base64" | "raw" } [type]
     */
    bindOutStream(onDataCallback: (data: string | Uint8Array | object) => void, type?: "raw" | "jsob" | "jsobin" | "base64" | undefined): void;
    /**
     * 添加全局命名函数
     * @param {Object<string, function>} functionMapObj
     */
    addGlobalNamedFunctions(functionMapObj: {
        [x: string]: Function;
    }): void;
    /**
     * 输入流收到数据应调用
     * @param {string | Uint8Array | object} data
     */
    onData(data: string | Uint8Array | object): void;
    /**
     * 调用命名函数
     *
     * @async
     *
     * @param {string} name
     * @param {Array<any>} param
     */
    callNamedFunction(name: string, ...param: Array<any>): Promise<any>;
    /**
     * 获取一个代理对象
     * 以函数名为key 返回的函数用于调用命名函数
     * @returns {Object<string, function>}
     */
    getGlobalNamedFunctionProxy(): {
        [x: string]: Function;
    };
    #private;
}

export { RcoContext };
