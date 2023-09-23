(async () =>
{
    /**
     * @type {import("../../doc/plugContext").iiroseForgeApi}
     */
    /* @ts-ignore */
    let forgeApi = api.iiroseForge;
    await forgeApi.applyPermission([], [
        "roomMessage",
        "privateMessage"
    ]);
    forgeApi.addEventListener("roomMessage", e => { console.log(`房间 ${e.senderId} ${e.senderName}: ${e.content}`); });
    forgeApi.addEventListener("privateMessage", e => { console.log(`私聊 ${e.senderId} ${e.senderName}: ${e.content}`); });
})();