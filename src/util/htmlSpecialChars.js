/**
 * html特殊符号转义
 * @param {string} e 
 * @returns {string}
 */
export function htmlSpecialCharsEscape(e)
{
    e = e.replaceAll(`&`, "&amp;");

    e = e.replaceAll(`<`, "&lt;");
    e = e.replaceAll(`>`, "&gt;");
    e = e.replaceAll(`"`, "&quot;");
    e = e.replaceAll(`'`, "&#039;");
    e = e.replaceAll(`\\`, "&#092;");
    
    return e;
};

/**
 * html特殊符号反转义
 * @param {string} e 
 * @returns {string}
 */
export function htmlSpecialCharsDecode(e)
{
    e = e.replaceAll("&lt;", `<`);
    e = e.replaceAll("&gt;", `>`);
    e = e.replaceAll("&quot;", `"`);
    e = e.replaceAll("&#039;", `'`);
    e = e.replaceAll("&#092;", `\\`);

    e = e.replaceAll("&amp;", `&`);

    return e;
};