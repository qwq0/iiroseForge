(async () =>
{
    document.body.style.color = "white";
    document.body.style.whiteSpace = "pre-wrap";
    /**
     * @type {import("../../doc/plugContext").iiroseForgeApi}
     */
    /* @ts-ignore */
    let forgeApi = api.iiroseForge;
    await forgeApi.applyPermission([], [
        "roomMessage",
        "privateMessage"
    ]);
    forgeApi.addEventListener("roomMessage", e => { document.body.appendChild(document.createTextNode(`房间 ${e.senderName}: ${e.content}\n`)); });
    forgeApi.addEventListener("privateMessage", e => { document.body.appendChild(document.createTextNode(`私聊 ${e.senderName}: ${e.content}\n`)); });
})();