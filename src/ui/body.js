import { getNElement } from "../../lib/qwqframe.js";

/**
 * document.body的NElement封装
 */
export let body = getNElement(document.body);
body.setStyle("cursor", "default");