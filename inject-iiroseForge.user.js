// ==UserScript==
// @name         inject iiroseForge
// @namespace    qwq0
// @version      0.4
// @description  Inject iiroseForge into iirose
// @author       qwq0
// @match        https://iirose.com/
// @icon         https://iirose.com/favicon.ico
// @grant        none
// ==/UserScript==

(function ()
{
    if (location.host != "iirose.com")
        return;
    let doc = null;
    let win = null;
    if (location.pathname == "/")
    {
        doc = document;
        win = window;
    }
    else if (location.pathname == "/messages.html")
    {
        doc = parent.document;
        win = parent.window;
    }
    else
        return;

    if (win["iiroseForgeInjected"])
        return;

    let loaded = false;
    let updatedCache = false;
    let candidateUrl = [
        "https://qwq0.github.io/iiroseForge/iiroseForge.js",
        "https://cdn.jsdelivr.net/gh/qwq0/iiroseForge@page/iiroseForge.js"
    ];

    /**
     * @param {string} url
     */
    async function tryUrl(url)
    {
        let response = await fetch(url, { cache: "no-cache" });
        if (response.ok)
        {
            let codeStr = await response.text();
            if (codeStr)
            {
                if (!loaded)
                {
                    loaded = true;
                    console.log(`[iiroseForgeInjector] load from ${url}`);
                    (new win.Function(codeStr))();
                }
                if (!updatedCache)
                {
                    updatedCache = true;
                    let cache = await window?.["caches"]?.open?.("v");
                    if (cache)
                    {
                        let cacheResponse = new Response(new Blob([codeStr], { type: "text/javascript" }), { status: 200, statusText: "OK" });
                        cache.put(candidateUrl[0], cacheResponse);
                        console.log(`[iiroseForgeInjector] cache updated`);
                    }
                }
            }
        }
    }

    /**
     * @param {number} index
     */
    function tryCandidate(index)
    {
        tryUrl(candidateUrl[index]);

        if (index < candidateUrl.length - 1)
            setTimeout(() =>
            {
                if (!loaded)
                    tryCandidate(index + 1);
            }, 2 * 1000);
    }

    tryCandidate(0);

    (async () =>
    {
        if (loaded)
            return;

        let cacheResponse = await (await window?.["caches"]?.open?.("v"))?.match(candidateUrl[0]);
        if (cacheResponse && cacheResponse.ok)
        {
            let codeStr = await cacheResponse.text();
            if (codeStr && !loaded)
            {
                loaded = true;
                console.log(`[iiroseForgeInjector] load from cache`);
                (new win.Function(codeStr))();
            }
        }
    })();
})();

