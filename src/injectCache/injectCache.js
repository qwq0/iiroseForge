export let iiroseForgeLoaderUrl = "https://qwq0.github.io/iiroseForge/l.js";
let iiroseForgeLoaderElementHtml = `<script type="text/javascript" src="${iiroseForgeLoaderUrl}"></script>`;
let injectCacheStartTag = `<!-- iiroseForge Installed Start -->`;
let injectCacheEndTag = `<!-- iiroseForge Installed End -->`;

/**
 * 向缓存中注入iiroseForge
 * @returns {Promise<void>}
 */
export async function writeForgeToCache()
{
    let cache = await caches.open("v");
    let catchMatch = await caches.match("/");
    if (catchMatch)
    {
        let cacheMainPage = await catchMatch.text();
        if (cacheMainPage.indexOf(iiroseForgeLoaderElementHtml) > -1)
            return;
        let insertIndex = cacheMainPage.lastIndexOf("</body></html>");
        if (insertIndex == -1)
            return;
        let newCacheMainPage = cacheMainPage.slice(0, insertIndex) + iiroseForgeLoaderElementHtml + cacheMainPage.slice(insertIndex);
        await cache.put("/", new Response(new Blob([newCacheMainPage], { type: "text/html" }), { status: 200, statusText: "OK" }));
    }
    else
    {
        let newCacheMainPage = ([
            `<!DOCTYPE html>`,
            `<html>`,
            `<head>`,
            `</head>`,
            `<body>`,
            `<script>`,
            `(async() => {`,
            
            `let cache = await caches.open("v");`,
            `await cache.delete("/");`,

            `let cacheMainPage = await (await fetch("/",{cache:"no-cache"})).text();`,
            `let insertIndex = cacheMainPage.lastIndexOf("</body></html>");`,

            `let newCacheMainPage = (insertIndex == -1 ? cacheMainPage : (cacheMainPage.slice(0, insertIndex) + \`<script\` + `,
            `\` type="text/javascript" src="${iiroseForgeLoaderUrl}"><\` + \`/script>\` + cacheMainPage.slice(insertIndex)));`,
            
            `await cache.put("/", new Response(new Blob([newCacheMainPage], { type: "text/html" }), { status: 200, statusText: "OK" }));`,

            `location.reload();`,

            `})();`,
            `</script>`,
            `</body>`,
            `</html>`
        ]).join("");
        await cache.put("/", new Response(new Blob([newCacheMainPage], { type: "text/html" }), { status: 200, statusText: "OK" }));
    }
}

/**
 * 从缓存中清除iiroseForge的注入
 * @returns {Promise<void>}
 */
export async function removeForgeFromCache()
{
    let cache = await caches.open("v");
    let cacheMainPage = await (await caches.match("/")).text();
    let removeIndex = cacheMainPage.indexOf(iiroseForgeLoaderElementHtml);
    if (removeIndex == -1)
        return;
    let newCacheMainPage = cacheMainPage.slice(0, removeIndex) + cacheMainPage.slice(removeIndex + iiroseForgeLoaderElementHtml.length);
    await cache.put("/", new Response(new Blob([newCacheMainPage], { type: "text/html" }), { status: 200, statusText: "OK" }));
}

if (localStorage.getItem("installForge") == "true")
{ // 用户要求安装
    writeForgeToCache();
}
