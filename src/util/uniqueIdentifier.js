/**
 * 生成唯一字符串
 * 基于毫秒级时间和随机数
 * 不保证安全性
 * @param {number} [randomSection] 随机节数量
 * @returns {string}
 */
export function uniqueIdentifierString(randomSection = 2)
{
    var ret = Math.floor(Date.now()).toString(36);
    for (let i = 0; i < randomSection; i++)
        ret += "-" + Math.floor(Math.random() * 2.82e12).toString(36);
    return ret;
}