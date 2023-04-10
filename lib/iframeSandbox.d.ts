/**
 * 沙箱上下文
 */
declare class SandboxContext {
    /**
     * @param {HTMLElement} [iframeElementParent]
     */
    constructor(iframeElementParent?: HTMLElement | undefined);
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
    /**
     * 获取iframe元素
     * 注意 移动沙箱在dom树中的位置将导致沙箱失效
     */
    get iframe(): HTMLIFrameElement;
    /**
     * 销毁沙箱
     * 销毁后无法对此沙箱执行操作
     */
    destroy(): void;
    #private;
}

export { SandboxContext };
