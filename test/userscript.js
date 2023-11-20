// ==UserScript==
// @name         inject iiroseForge
// @namespace    qwq0
// @version      0.3
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

    let scriptCode = "";
    let loaded = false;
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
            if (!loaded)
            {
                loaded = true;
                scriptCode = codeStr;
                (new win.Function(codeStr))();

                let cache = await window?.["caches"]?.open?.("v");
                if (cache)
                {
                    let cacheResponse = new Response(new Blob([scriptCode], { type: "text/javascript" }), { status: 200, statusText: "OK" });
                    cache.put(candidateUrl[0], cacheResponse);
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

    setTimeout(async () =>
    {
        if (loaded)
            return;

        let cacheResponse = await (await window?.["caches"]?.open?.("v"))?.match(candidateUrl[0]);
        if (cacheResponse)
        {
            let codeStr = await cacheResponse.text();
            if (codeStr && !loaded)
            {
                loaded = true;
                scriptCode = codeStr;
                (new win.Function(codeStr))();
            }
        }
    }, 5 * 1000);
})();
