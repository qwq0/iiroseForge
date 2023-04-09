/**
 * 沙箱上下文
 */
declare class SandboxContext {
    /**
     * 传递给沙箱的接口
     * @type {Object}
     */
    apiObj: any;
    /**
     * 等待沙箱可用
     * @returns {Promise<void>}
     */
    waitAvailable(): Promise<void>;
    /**
     * 执行js代码
     * @param {string} jsCodeStr
     * @returns {Promise<void>}
     */
    execJs(jsCodeStr: string): Promise<void>;
    get iframe(): HTMLIFrameElement;
    #private;
}

export { SandboxContext };
