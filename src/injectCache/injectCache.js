export let iiroseForgeLoaderUrl = "https://qwq0.github.io/iiroseForge/l.js";
let iiroseForgeLoaderElementHtml = `<script type="text/javascript" src="${iiroseForgeLoaderUrl}"></script>`;

/**
 * 向缓存中注入iiroseForge
 * @returns {Promise<void>}
 */
export async function writeForgeToCache()
{
    let cache = await caches.open("v");
    let cacheMainPage = await (await caches.match("/")).text();
    if (cacheMainPage.indexOf(iiroseForgeLoaderElementHtml) > -1)
        return;
    let insertIndex = cacheMainPage.indexOf("</body></html>");
    if (insertIndex == -1)
        return;
    let newCacheMainPage = cacheMainPage.slice(0, insertIndex) + iiroseForgeLoaderElementHtml + cacheMainPage.slice(insertIndex);
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
    let removeIndex = cacheMainPage.indexOf(iiroseForgeLoaderElementHtml);
    if (removeIndex == -1)
        return;
    let newCacheMainPage = cacheMainPage.slice(0, removeIndex) + cacheMainPage.slice(removeIndex + iiroseForgeLoaderElementHtml.length);
    await cache.put("/", new Response(new Blob([newCacheMainPage], { type: "text/html" }), { status: 200, statusText: "OK" }));
}