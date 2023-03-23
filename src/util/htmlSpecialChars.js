/**
 * html特殊符号转换
 * @param {string} e 
 * @returns {string}
 */
export function htmlSpecialChars(e)
{
    if (-1 < e.indexOf("&")) e = e.replace(/&/g, "&amp;");
    if (-1 < e.indexOf("<")) e = e.replace(/</g, "&lt;");
    if (-1 < e.indexOf(">")) e = e.replace(/>/g, "&gt;");
    if (-1 < e.indexOf('"')) e = e.replace(/"/g, "&quot;");
    if (-1 < e.indexOf("'")) e = e.replace(/'/g, "&#039;");
    if (-1 < e.indexOf("\\")) e = e.replace(/\\/g, "&#092;");
    return e;
};