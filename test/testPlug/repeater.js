(async () =>
{
    /**
     * @type {import("../../doc/plugContext").iiroseForgeApi}
     */
    /* @ts-ignore */
    let forgeApi = api.iiroseForge;
    await forgeApi.applyPermission([
        "getUserUid",
        "sendRoomMessage"
    ], [
        "roomMessage"
    ]);
    forgeApi.addEventListener("roomMessage", async (e) =>
    {
        if (e.senderId != await forgeApi.getUserUid())
        {
            forgeApi.sendRoomMessage(e.content);
        }
    });
})();