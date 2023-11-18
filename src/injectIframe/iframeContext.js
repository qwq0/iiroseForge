/**
 * 主iframe的上下文
 */
export let iframeContext = {
    /**
     * @type {Window}
     */
    iframeWindow: null,
    /**
     * @type {Document}
     */
    iframeDocument: null,
    /**
     * @type {WebSocket | Object}
     */
    socket: null,
    /**
     * @type {import("../../lib/qwqframe").NElement<HTMLBodyElement>}
     */
    iframeBody: null,

    socketApi: {
        /**
         * @type {(data: string) => void}
         */
        send: () => { }
    }
};
