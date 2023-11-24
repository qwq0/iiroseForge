import { injectorScript } from "../../generate/injectScript.js";
import { showNotice } from "../ui/notice.js";

const injectCacheStartTag = `<!-- iiroseForge Installed Start -->`;
const injectCacheEndTag = `<!-- iiroseForge Installed End -->`;

/**
 * 在缓存字符串中加入forge注入器
 * @param {string} originalCacheStr
 * @param {boolean} requireUpdate
 * @returns {string}
 */
export function insertForgeInjectorToString(originalCacheStr, requireUpdate)
{
    let cacheStr = originalCacheStr;
    if (cacheStr.indexOf(injectCacheStartTag) != -1)
    {
        if (!requireUpdate)
            return originalCacheStr;
        else
            cacheStr = removeForgeInjectorFromString(cacheStr);
    }
    let insertIndex = cacheStr.lastIndexOf("</body></html>");
    if (insertIndex == -1)
    {
        showNotice("安装forge", "无法安装forge (缓存错误)");
        return originalCacheStr;
    }
    return ([
        cacheStr.slice(0, insertIndex),

        injectCacheStartTag,
        "<script>",
        injectorScript,
        "</script>",
        injectCacheEndTag,

        cacheStr.slice(insertIndex)
    ]).join("");
}

/**
 * 从缓存字符串中移除forge注入器
 * @param {string} originalCacheStr
 * @returns {string}
 */
export function removeForgeInjectorFromString(originalCacheStr)
{
    const oldForgeLoaderElementHtml = `<script type="text/javascript" src="https://qwq0.github.io/iiroseForge/l.js"></script>`;

    let cacheStr = originalCacheStr;

    let oldRemoveIndex = cacheStr.indexOf(oldForgeLoaderElementHtml);
    if (oldRemoveIndex != -1)
        cacheStr = cacheStr.slice(0, oldRemoveIndex) + cacheStr.slice(oldRemoveIndex + oldForgeLoaderElementHtml.length);

    let removeStartIndex = cacheStr.indexOf(injectCacheStartTag);
    let removeEndIndex = cacheStr.lastIndexOf(injectCacheEndTag);
    if (removeStartIndex != -1 && removeEndIndex != -1)
        cacheStr = cacheStr.slice(0, removeStartIndex) + cacheStr.slice(removeEndIndex + injectCacheEndTag.length);

    return cacheStr;
}

/**
 * 向缓存中注入iiroseForge
 * @param {boolean} requireUpdate
 * @returns {Promise<void>}
 */
export async function writeForgeToCache(requireUpdate)
{
    let cache = await caches.open("v");
    let catchMatch = await caches.match("/");
    if (catchMatch)
    {
        let mainPageCacheStr = await catchMatch.text();
        let newCacheMainPage = insertForgeInjectorToString(mainPageCacheStr, requireUpdate);
        await cache.put("/", new Response(new Blob([newCacheMainPage], { type: "text/html" }), { status: 200, statusText: "OK" }));
    }
    else
    {
        let newMainPageCacheStr = ([
            `<!DOCTYPE html>`,
            `<html>`,
            `<head>`,
            `</head>`,
            `<body>`,
            `<script>`,
            `(async () => {`,

            `let cache = await caches.open("v");`,
            `await cache.delete("/");`,

            `let mainPageCacheStr = await (await fetch("/", { cache: "no-cache" })).text();`,
            `let insertIndex = mainPageCacheStr.lastIndexOf("</body></html>");`,

            `if(insertIndex != -1)`,
            `mainPageCacheStr = cacheStr.slice(0, insertIndex) + `,
            ` "${injectCacheStartTag}" + "<scr" + "ipt>" + ${JSON.stringify(injectorScript)} + "<\\/sc" + "ript>" + "${injectCacheEndTag}" `,
            ` + cacheStr.slice(insertIndex);`,

            `await cache.put("/", new Response(new Blob([mainPageCacheStr], { type: "text/html" }), { status: 200, statusText: "OK" }));`,

            `location.reload();`,

            `})();`,
            `</script>`,
            `</body>`,
            `</html>`
        ]).join("");
        await cache.put("/", new Response(new Blob([newMainPageCacheStr], { type: "text/html" }), { status: 200, statusText: "OK" }));
    }
}

/**
 * 从缓存中清除iiroseForge的注入
 * @returns {Promise<void>}
 */
export async function removeForgeFromCache()
{
    let cache = await caches.open("v");
    let catchMatch = await caches.match("/");
    if (catchMatch)
    {
        let mainPageCacheStr = await catchMatch.text();
        let newCacheMainPage = removeForgeInjectorFromString(mainPageCacheStr);
        await cache.put("/", new Response(new Blob([newCacheMainPage], { type: "text/html" }), { status: 200, statusText: "OK" }));
    }
}

if (localStorage.getItem("installForge") == "true")
{ // 用户要求安装
    writeForgeToCache(false);
}
