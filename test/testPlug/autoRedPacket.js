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

    let officialBotIdSet = new Set([
        "5eb933687020e",
        "5eb9330b844ef",
        "5bba34bd423d8",
        "56c9c1bf05262",
        "5eb933ffa127d",
        "5eb933bc97240",
        "5eb934aca592e",
        "5eb9344c0cb93"
    ]);

    forgeApi.addEventListener("roomMessage", async (e) =>
    {
        if (e.senderId != await forgeApi.getUserUid())
        {
            if (
                officialBotIdSet.has(e.senderId) &&
                e.content.indexOf("创建了 红包 为") != -1 && e.content.indexOf("钞的游戏") != -1
            )
            {
                let content = e.content.trim();
                let gameId = content.slice(content.lastIndexOf("[.%") + 3, content.lastIndexOf(".]"));
                forgeApi.sendRoomMessage(`小艾加入%${gameId}`);
            }
        }
    });

})();