(async () =>
{
    /**
     * @type {import("../../doc/plugContext").iiroseForgeApi}
     */
    /* @ts-ignore */
    let forgeApi = api.iiroseForge;

    function uniqueIdentifierString(randomSection = 2)
    {
        var ret = Math.floor(Date.now()).toString(36);
        for (let i = 0; i < randomSection; i++)
            ret += "-" + Math.floor(Math.random() * 2.82e12).toString(36);
        return ret;
    }

    /**
     * @type {import("../../lib/qwqframe")}
     */
    /* @ts-ignore */
    const qf = await import("https://cdn.jsdelivr.net/gh/qwq0/qwqFrame/dist/qwqframe.min.js");
    let body = qf.getNElement(document.body);
    body.setStyles({
        margin: "0",
        color: "white"
    });

    /**
     * @type {Array<Array<{ ele: import("../../lib/qwqframe").NElement, state: number }>>}
     */
    let chessboard = [];
    let dataObj = qf.createHookObj({
        text: "点击授权"
    });
    /**
     * 当前状态
     *  + 0 未授权
     *  + 1 不在游戏中
     *  + 2 当前可走棋
     *  + 3 当前对方走棋
     *  + 4 胜利
     *  + 5 对方胜利
     *  + 6 观战模式
     */
    let nowState = 0;
    let opponentName = "";
    let opponentId = "";
    let ownName = "";
    let ownId = "";
    let gameId = "";
    let ownGameId = "";

    /**
     * 清空棋盘
     */
    function clearChessBoard()
    {
        opponentName = "";
        opponentId = "";
        ownName = "";
        ownId = "";
        gameId = "";
        ownGameId = "";
        nowState = 1;
        dataObj.text = "点击邀请房间中的玩家加入";
        chessboard.forEach(eachRow =>
        {
            eachRow.forEach(o =>
            {
                o.ele.removeChilds();
                o.state = 0;
            });
        });
    }
    /**
     * @param {number} colInd
     * @param {1 | 2} state
     * @returns {boolean}
     */
    function playAPiece(colInd, state)
    {
        if (Number.isInteger(colInd) && colInd >= 0 && colInd < 8 && (state == 1 || state == 2))
        {
            for (let rowInd = 0; rowInd < 8; rowInd++)
            {
                let currentCell = chessboard[rowInd][colInd];
                if (currentCell.state == 0)
                {
                    currentCell.state = state;
                    currentCell.ele.addChild(qf.NList.getElement([
                        qf.createNStyleList({
                            width: "80%",
                            height: "80%",
                            margin: "10.5%",
                            borderRadius: "100%",
                            border: "0.3px black solid",
                            backgroundColor: (state == 1 ? "red" : "yellow")
                        })
                    ]));

                    ([
                        [1, 0],
                        [0, 1],
                        [1, 1],
                        [1, -1],
                    ]).forEach(([rowOffset, colOffset]) =>
                    {
                        let line = 1;
                        for (let i = 1; i <= 3; i++)
                        {
                            if (chessboard?.[rowInd + rowOffset * i]?.[colInd + colOffset * i]?.state == state)
                                line++;
                            else
                                break;
                        }
                        for (let i = -1; i >= -3; i--)
                        {
                            if (chessboard?.[rowInd + rowOffset * i]?.[colInd + colOffset * i]?.state == state)
                                line++;
                            else
                                break;
                        }

                        if (line >= 4)
                        {
                            if (nowState == 2 || nowState == 3)
                            {
                                nowState = (state == 1 ? 4 : 5);
                                dataObj.text = `对局结束 ${state == 1 ? "你胜利啦" : "对方胜利"}`;
                            }
                            else if (nowState == 6)
                            {
                                dataObj.text = `对局结束 胜利者是 ${state == 1 ? ownName : opponentName}`;
                            }
                        }
                    });
                    return true;
                }
            }
        }
        return false;
    }


    body.addChild(qf.NList.getElement([
        [ // 提示文本
            qf.bindValue(dataObj, "text"),
            qf.createNStyleList({
                width: "100%",
                textAlign: "center"
            }),
            new qf.NEvent("click", async () => // 点击提示文本
            {
                switch (nowState)
                {
                    case 0:
                        if (await forgeApi.applyPermission(["showForgeNotice", "getUserUid", "sendRoomForgePacket"], ["roomForgePacket"]))
                        {
                            dataObj.text = "点击邀请房间中的玩家加入";
                            nowState = 1;
                            forgeApi.addEventListener("roomForgePacket", async (e) => // 收到房间中的包
                            {
                                let myUid = await forgeApi.getUserUid();
                                let data = e.content;
                                if (data?.["plug"] == "connectFour") // 收到此插件的包
                                {
                                    if (!data?.["gameId"])
                                        return;
                                    switch (data?.["state"])
                                    {
                                        case 1: // 游戏邀请
                                            await forgeApi.showForgeNotice(`Connect Four\n房间中的 ${e.senderName} 正在开始一局游戏\n点击加入`, function ()
                                            {
                                                if (myUid != e.senderId)
                                                {
                                                    forgeApi.sendRoomForgePacket({
                                                        plug: "connectFour",
                                                        gameId: data?.["gameId"],
                                                        state: 2
                                                    });
                                                    opponentId = e.senderId;
                                                    opponentName = e.senderName;
                                                    gameId = data?.["gameId"];
                                                }
                                                else
                                                    forgeApi.showForgeNotice("你不能加入自己的游戏");
                                            });
                                            break;
                                        case 2: // 加入游戏
                                            if (data?.["gameId"] == gameId && nowState == 1 && data?.["gameId"] == ownGameId)
                                                await forgeApi.showForgeNotice(`Connect Four\n房间中的 ${e.senderName} 想要加入你的游戏\n点击开始对局`, function ()
                                                {
                                                    forgeApi.sendRoomForgePacket({
                                                        plug: "connectFour",
                                                        gameId: gameId,
                                                        uid: e.senderId,
                                                        name: e.senderName,
                                                        state: 3
                                                    });
                                                    opponentId = e.senderId;
                                                    opponentName = e.senderName;
                                                    forgeApi.showForgeNotice(`与 ${e.senderName} 的对局开始啦`);
                                                    nowState = 2;
                                                    dataObj.text = "请走棋";
                                                });
                                            break;
                                        case 3: // 确认加入
                                            if (data?.["gameId"] == gameId && data?.["uid"] == myUid && e.senderId == opponentId)
                                            {
                                                forgeApi.showForgeNotice(`与 ${e.senderName} 的对局开始啦`);
                                                nowState = 3;
                                                dataObj.text = "请等待对方走棋";
                                            }
                                            else if (nowState == 1)
                                            {
                                                forgeApi.showForgeNotice(`房间中 ${e.senderName} 与 ${data?.["name"]} 的对局开始啦\n点击观战`, () =>
                                                {
                                                    gameId = data?.["gameId"];
                                                    ownId = e.senderId;
                                                    ownName = e.senderName;
                                                    opponentId = data?.["uid"];
                                                    opponentName = data?.["name"];
                                                    nowState = 6;
                                                    dataObj.text = `${ownName} - ${opponentName} 点击退出观战`;
                                                });
                                            }
                                            break;
                                        case 4: // 走棋
                                            if (data?.["gameId"] == gameId)
                                            {
                                                if (nowState == 3 && data?.["uid"] == myUid && e.senderId == opponentId)
                                                {
                                                    playAPiece(data?.["col"], 2);
                                                    if (nowState == 3)
                                                    {
                                                        nowState = 2;
                                                        dataObj.text = "请走棋";
                                                    }
                                                }
                                                else if (nowState == 6 && (e.senderId == opponentId || e.senderId == ownId))
                                                {
                                                    playAPiece(data?.["col"], (e.senderId == ownId ? 1 : 2));
                                                }
                                            }
                                            break;
                                    }
                                }
                            });
                        }
                        break;
                    case 1:
                        ownGameId = gameId = uniqueIdentifierString();
                        forgeApi.sendRoomForgePacket({
                            plug: "connectFour",
                            gameId: gameId,
                            state: 1
                        });
                        break;
                    case 4:
                    case 5:
                    case 6:
                        clearChessBoard();
                        break;
                }
            })
        ],
        [ // 棋盘
            qf.createNStyleList({
                aspectRatio: "1",
                width: "100%",
                backgroundColor: qf.cssG.rgb(255, 255, 255, 0.7)
            }),

            ...([7, 6, 5, 4, 3, 2, 1, 0]).map((rowInd) => [ // 一行
                qf.createNStyleList({
                    width: "100%",
                    height: "12.5%"
                }),

                ...([0, 1, 2, 3, 4, 5, 6, 7]).map((colInd) => [ // 一格(每行中的一列)
                    qf.createNStyleList({
                        aspectRatio: "1",
                        display: "inline-block",
                        height: "100%",
                        border: "0.5px solid black",
                        boxSizing: "border-box"
                    }),

                    new qf.NAsse(e =>
                    {
                        if (chessboard[rowInd] == undefined)
                            chessboard[rowInd] = [];
                        chessboard[rowInd][colInd] = { ele: e, state: 0 };
                    }),

                    new qf.NEvent("click", () =>
                    {
                        if (nowState == 2)
                        {
                            if (playAPiece(colInd, 1))
                            {
                                forgeApi.sendRoomForgePacket({
                                    plug: "connectFour",
                                    state: 4,
                                    gameId: gameId,
                                    uid: opponentId,
                                    col: colInd
                                });
                                if (nowState == 2)
                                {
                                    nowState = 3;
                                    dataObj.text = "请等待对方走棋";
                                }
                            }
                        }
                    })
                ])
            ])
        ]
    ]));
})();