/**
 * 主iframe的上下文
 */
export let iframeContext = {
    iframeWindow: null,
    iframeDocument: null,
    socket: null,
    /**
     * @type {import("../../lib/qwqframe").NElement<HTMLBodyElement>}
     */
    iframeBody: null
};
