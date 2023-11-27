import { NEvent } from "../../lib/qwqframe";
import { NList } from "../../lib/qwqframe";
import { forgeApi } from "../forgeApi/forgeApi";
import { iframeContext } from "../injectIframe/iframeContext";
import { showInfoBox, showInputBox } from "../ui/infobox";
import { showMenu } from "../ui/menu";
import { showNotice } from "../ui/notice";
import { addMenuHook } from "./uiHook";

let isRoomAdminOrMember = false;
let isRoomAdmin = false;

/**
 * 启用房管操作
 */
export function enableRoomAdminOperation()
{
    isRoomAdminOrMember = false;
    isRoomAdmin = false;

    let userName = forgeApi.operation.getUserName();
    let nowRoomInfo = forgeApi.operation.getRoomInfoById(forgeApi.operation.getUserRoomId());
    if (nowRoomInfo)
    {
        if (userName == nowRoomInfo.ownerName)
        {
            isRoomAdminOrMember = true;
            isRoomAdmin = true;
        }
        else
            nowRoomInfo.member.some(o =>
            {
                if (
                    o.name == userName &&
                    (
                        o.auth == "admin" ||
                        o.auth == "member"
                    )
                )
                {
                    isRoomAdminOrMember = true;
                    if (o.auth == "admin")
                        isRoomAdmin = true;
                }
            });
    }

    addMenuHook(
        "roomAdminOperation",
        "roomMessageMenu",
        () => (isRoomAdminOrMember ? {
            icon: "wrench",
            text: "房管操作"
        } : null),
        e =>
        {
            showMenu([
                ...(
                    isRoomAdmin ?
                        [
                            NList.getElement([
                                "白名单",
                                new NEvent("click", async () =>
                                {
                                    let timeStr = await showInputBox("房管操作", `设置用户(${e.userName})\n的白名单时间\nd天 h时 m分 s秒 &永久`, true, "&");
                                    if (timeStr == undefined)
                                        return;
                                    let remarkStr = await showInputBox("房管操作", `设置用户(${e.userName})\n的白名单备注`, true, "");
                                    if (remarkStr == undefined)
                                        return;
                                    iframeContext.socketApi.send(`!hw${JSON.stringify(["4", e.userName.toLowerCase(), timeStr, remarkStr])}`);
                                })
                            ]),
                            NList.getElement([
                                "黑名单",
                                new NEvent("click", async () =>
                                {
                                    let timeStr = await showInputBox("房管操作", `设置用户(${e.userName})\n的黑名单时间\nd天 h时 m分 s秒 &永久`, true, "30d");
                                    if (timeStr == undefined)
                                        return;
                                    let remarkStr = await showInputBox("房管操作", `设置用户(${e.userName})\n的黑名单备注`, true, "");
                                    if (remarkStr == undefined)
                                        return;
                                    iframeContext.socketApi.send(`!h4${JSON.stringify(["4", e.userName.toLowerCase(), timeStr, remarkStr])}`);
                                })
                            ]),
                            NList.getElement([
                                "永久黑名单",
                                new NEvent("click", async () =>
                                {
                                    let remarkStr = await showInputBox("房管操作", `设置用户(${e.userName})\n的永久黑名单备注`, true, "");
                                    if (remarkStr == undefined)
                                        return;
                                    iframeContext.socketApi.send(`!h4${JSON.stringify(["4", e.userName.toLowerCase(), "&", remarkStr])}`);
                                })
                            ])
                        ] :
                        []
                ),
                NList.getElement([
                    "移出房间",
                    new NEvent("click", async () =>
                    {
                        if (await showInfoBox("房管操作", `是否将用户(${e.userName})\n移出房间`))
                        {
                            iframeContext.socketApi.send(`!#${JSON.stringify([e.userName.toLowerCase()])}`);
                        }
                    })
                ]),
            ]);
        }
    );
}