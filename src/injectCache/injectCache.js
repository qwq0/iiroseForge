let iiroseForgeScriptUrl = "https://qwq0.github.io/iiroseForge/l.js";
let iiroseForgeScriptElementHtml = `<script type="text/javascript" src="${iiroseForgeScriptUrl}"></script>`;

/**
 * 向缓存中注入iiroseForge
 * @returns {Promise<void>}
 */
export async function writeForgeToCache()
{
    let cache = await caches.open("v");
    let cacheMainPage = await (await caches.match("/")).text();
    if (cacheMainPage.indexOf(iiroseForgeScriptElementHtml) > -1)
        return;
    let insertIndex = cacheMainPage.indexOf("</body></html>");
    if (insertIndex == -1)
        return;
    let newCacheMainPage = cacheMainPage.slice(0, insertIndex) + iiroseForgeScriptElementHtml + cacheMainPage.slice(insertIndex);
    await cache.put("/", new Response(new Blob([newCacheMainPage], { type: "text/html" }), { status: 200, statusText: "OK" }));
}
/**
 * 从缓存中清除iiroseForge的注入
 * @returns {Promise<void>}
 */
export async function removeForgeFromCache()
{
    let cache = await caches.open("v");
    let cacheMainPage = await (await caches.match("/")).text();
    let removeIndex = cacheMainPage.indexOf(iiroseForgeScriptElementHtml);
    if (removeIndex == -1)
        return;
    let newCacheMainPage = cacheMainPage.slice(0, removeIndex) + cacheMainPage.slice(removeIndex + iiroseForgeScriptElementHtml.length);
    await cache.put("/", new Response(new Blob([newCacheMainPage], { type: "text/html" }), { status: 200, statusText: "OK" }));
}