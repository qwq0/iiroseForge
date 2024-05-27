import { proxyFunction } from "../../lib/plugToolsLib.js";
import { eventName, NList } from "../../lib/qwqframe.js";
import { forgeApi } from "../forgeApi/forgeApi.js";
import { iframeContext } from "../injectIframe/iframeContext.js";
import { readForgePacket, writeForgePacket } from "../protocol/forgePacket.js";
import { setPackageData, toClientTrie } from "../protocol/protocol.js";
import { showCopyBox, showInfoBox, showInputBox } from "../ui/infobox.js";
import { showMenu } from "../ui/menu.js";
import { showNotice } from "../ui/notice.js";
import { htmlSpecialCharsEscape } from "../util/htmlSpecialChars.js";

/**
 * @typedef {{
 *  bgmList?: Array<{title?: string, url: string}>,
 *  draw?: Array<{weight?: number, text: string}>
 * }} ProfilePackageType
 */

const albumForgePackagePrefix = "https://not-exist.fake-domain/";
const albumForgePackageSuffix = "?.png";

/**
 * 启用自定义资料卡
 */
export function enableCustomProfile()
{
    iframeContext.iframeWindow["whois"] = proxyFunction(iframeContext.iframeWindow["whois"], (param, targetFn) =>
    {
        if (param[0])
        {
            try
            {
                /** @type {Array<string>} */
                let part = param[0].split(">");
                let photoAlbum = part[10].split(" ");

                // console.log(param[1], photoAlbum, part);

                /**
                 * @type {ProfilePackageType}
                 */
                let forgePackage = null;

                photoAlbum = photoAlbum.filter(o =>
                {
                    if (o.startsWith(albumForgePackagePrefix + "iiroseForge:"))
                    {
                        o = o.slice(albumForgePackagePrefix.length);
                        if (o.endsWith(albumForgePackageSuffix))
                            o = o.slice(0, -albumForgePackageSuffix.length);
                        forgePackage = readForgePacket(o, "");
                        return false;
                    }
                    return true;
                });

                if (forgePackage)
                {
                    showNotice("自定义资料卡", "您正在查看 自定义资料卡\n如果存在问题请在 附加功能 中关闭");

                    if (forgePackage.bgmList && forgePackage.bgmList.length > 0)
                    {
                        let randomItem = forgePackage.bgmList[Math.floor(Math.random() * forgePackage.bgmList.length)];
                        part[11] = `${htmlSpecialCharsEscape(randomItem.url)} @|${randomItem.title ? htmlSpecialCharsEscape(randomItem.title) : "自定义歌单"}@|forge已接管@|*@|`;
                    }

                    if (forgePackage.draw && forgePackage.draw.length > 0)
                    {
                        let totalWeight = 0;
                        forgePackage.draw.forEach(o =>
                        {
                            totalWeight += (o.weight != undefined ? o.weight : 1);
                        });
                        let randomWeight = Math.random() * totalWeight;
                        let weightSum = 0;
                        for (let o of forgePackage.draw)
                        {
                            weightSum += (o.weight != undefined ? o.weight : 1);
                            if (weightSum > randomWeight)
                            {
                                let text = o.text;
                                if (text.indexOf("{@observer}") != -1)
                                {
                                    text = text.replaceAll("{@observer}", ` [*${forgeApi.operation.getUserName()}*] `);
                                }
                                part[8] += (part[8].endsWith("\n") ? "" : "\n") + htmlSpecialCharsEscape(text);
                                break;
                            }
                        }
                    }

                    part[10] = photoAlbum.join(" ");
                    param[0] = part.join(">");


                    targetFn(...param);

                    let userInfoElement = iframeContext.iframeWindow?.["Variable"]?.currentUserInfoObj;
                    // console.log(userInfoElement);

                    return true;
                }
                return false;
            }
            catch (err)
            {
                console.error("customProfile", err);
            }
        }
        return false;
    });
    takeoverProtocol();
}

/**
 * @type {(originalOption: ProfilePackageType, photoAlbum: string) => void}
 */
let readCallback = null;
/**
 * @type {() => void}
 */
let submitCallback = null;

/**
 * 显示自定义资料卡菜单
 */
export function showCustomProfileMenu()
{
    showNotice("加载中", "正在读取您的原设置");
    readCallback = (originalOption, photoAlbum) =>
    {
        if (originalOption)
        {
            showNotice("自定义资料", "已加载原设置");
        }
        else
        {
            showNotice("自定义资料", "找不到原设置\n将新建设置");
            originalOption = {};
        }

        showMenu([
            NList.getElement([
                "背景随机歌单",
                eventName.click(e =>
                {
                    e.stopImmediatePropagation();
                    showMenu([
                        NList.getElement([
                            "[清空列表]",
                            eventName.click(async () =>
                            {
                                let confirm = await showInfoBox("清空列表", `确认要清空随机歌单吗`, true);
                                if (!confirm)
                                    return;
                                delete originalOption.bgmList;
                            })
                        ]),
                        ...(
                            originalOption.bgmList ?
                                originalOption.bgmList.map((o, index) => NList.getElement([
                                    o.title ? o.title : o.url.slice(0, 20) + "...",
                                    eventName.click(async () =>
                                    {
                                        if (await showInfoBox("删除条目", `确认删除此条目吗\ntitle: ${o.title}\nurl: ${o.url}`, true))
                                        {
                                            originalOption.bgmList.splice(index, 1);
                                            if (originalOption.bgmList.length == 0)
                                                delete originalOption.bgmList;
                                        }
                                    })
                                ])) :
                                []
                        ),
                        NList.getElement([
                            "[添加]",
                            eventName.click(async () =>
                            {
                                let url = await showInputBox("添加条目", "请输入条目的url", true);
                                if (url == undefined)
                                    return;
                                let title = await showInputBox("设置标题", "设置条目的标题\n可留空", true);
                                if (title == undefined)
                                    return;
                                if (!originalOption.bgmList)
                                    originalOption.bgmList = [];
                                if (title)
                                    originalOption.bgmList.push({
                                        title: title,
                                        url: url
                                    });
                                else
                                    originalOption.bgmList.push({
                                        url: url
                                    });
                            })
                        ]),
                        NList.getElement([
                            "[导入歌单]",
                            eventName.click(async () =>
                            {
                                let playListId = await showInputBox("导入歌单", "输入网易云歌单id", true);
                                if (playListId == undefined)
                                    return;
                                try
                                {
                                    let info = await (await fetch(`https://a.iirose.com/lib/php/api/search_163Music_list.php?i=${playListId}&t=0`)).json();
                                    if (!info?.playlist?.tracks)
                                        throw "playlist error";
                                    let confirm = await showInfoBox("导入歌单", `确认要导入这些内容吗?\n重复的内容将被替换\n共 ${info.playlist.tracks.length} 首\n---\n${info.playlist.tracks.map(o => o.name).join("\n")}`, true);
                                    if (!confirm)
                                        return;
                                    if (!originalOption.bgmList)
                                        originalOption.bgmList = [];
                                    /**
                                     * @type {Map<string, string>}
                                     */
                                    // @ts-ignore
                                    let urlToNameMap = new Map([
                                        ...(originalOption.bgmList.map(o => ([o.url, o.title]))),
                                        ...info.playlist.tracks.map(o => [`https://music.163.com/song/media/outer/url?id=${o.id}.mp3`, o.name]),
                                    ]);
                                    originalOption.bgmList = Array.from(urlToNameMap.entries()).map(o => (
                                        o[1] ?
                                            {
                                                title: o[1],
                                                url: o[0]
                                            } :
                                            {
                                                url: o[0]
                                            }
                                    ));
                                }
                                catch (err)
                                {
                                    showInfoBox("导入歌单", "导入失败");
                                }
                            })
                        ])
                    ]);
                })
            ]),
            NList.getElement([
                "抽签文本",
                eventName.click(e =>
                {
                    e.stopImmediatePropagation();

                    let totalWeight = 0;
                    originalOption.draw?.forEach(o =>
                    {
                        totalWeight += (o.weight != undefined ? o.weight : 1);
                    });

                    showMenu([
                        NList.getElement([
                            "[清空列表]",
                            eventName.click(async () =>
                            {
                                let confirm = await showInfoBox("清空列表", `确认要清空抽签文本吗`, true);
                                if (!confirm)
                                    return;
                                delete originalOption.draw;
                            })
                        ]),
                        ...(
                            originalOption.draw ?
                                originalOption.draw.map((o, index) =>
                                {
                                    let weight = o.weight != undefined ? o.weight : 1;
                                    return NList.getElement([
                                        `(权重${weight} 概率${((weight) / totalWeight * 100).toFixed(2)}%) ${o.text.length > 20 ? o.text.slice(0, 20) + "..." : o.text}`,
                                        eventName.click(async () =>
                                        {
                                            if (await showInfoBox("删除条目", `确认删除此条目吗\ntext: ${o.text}\nweight: ${weight}`, true))
                                            {
                                                originalOption.draw.splice(index, 1);
                                                if (originalOption.draw.length == 0)
                                                    delete originalOption.draw;
                                            }
                                        })
                                    ]);
                                }) :
                                []
                        ),
                        NList.getElement([
                            "[添加]",
                            eventName.click(async () =>
                            {
                                let text = await showInputBox("添加条目", "请输入条目的文本\n{@observer}表示观测者", true);
                                if (text == undefined)
                                    return;
                                let weight = await showInputBox("设置权重", "设置条目的权重", true, "1");
                                if (weight == undefined)
                                    return;
                                let weightNumber = Number(weight);
                                if (Number.isFinite(weightNumber) && weightNumber > 0)
                                {
                                    if (!originalOption.draw)
                                        originalOption.draw = [];
                                    if (weightNumber != 1)
                                        originalOption.draw.push({
                                            weight: weightNumber,
                                            text: text
                                        });
                                    else
                                        originalOption.draw.push({
                                            text: text
                                        });
                                }
                                else
                                    showNotice("添加失败", "权重仅能为大于0的数");
                            })
                        ])
                    ]);
                })
            ]),
            NList.getElement([
                "提交更改",
                eventName.click(e =>
                {
                    try
                    {
                        let forgePackageForAlbum = albumForgePackagePrefix + writeForgePacket(originalOption, true) + albumForgePackageSuffix;
                        submitCallback = () =>
                        {
                            showNotice("自定义资料卡", "提交成功");
                        };
                        iframeContext.socketApi.send("$2" + JSON.stringify({ "album": photoAlbum ? forgePackageForAlbum + " " + photoAlbum : forgePackageForAlbum }));
                        showNotice("自定义资料卡", "正在提交");
                    }
                    catch (err)
                    {
                        showNotice("自定义资料卡", "提交失败");
                    }
                })
            ])
        ]);
    };
    iframeContext.socketApi.send("+-" + forgeApi.operation.getUserName().toLowerCase());
}

let hadTakeoverProtocol = false;
function takeoverProtocol()
{
    if (hadTakeoverProtocol)
        return;
    hadTakeoverProtocol = true;
    toClientTrie.addPath("+", (data) =>
    {
        try
        {
            if (readCallback)
            {
                /** @type {Array<string>} */
                let part = data.split(">");
                // console.log(part);
                let photoAlbum = part[10].split(" ");

                /**
                 * @type {Object}
                 */
                let forgePackage = null;

                photoAlbum = photoAlbum.filter(o =>
                {
                    if (o.startsWith(albumForgePackagePrefix + "iiroseForge:"))
                    {
                        o = o.slice(albumForgePackagePrefix.length);
                        if (o.endsWith(albumForgePackageSuffix))
                            o = o.slice(0, -albumForgePackageSuffix.length);
                        forgePackage = readForgePacket(o, "");
                        return false;
                    }
                    return true;
                });

                let callback = readCallback;
                readCallback = null;
                callback(forgePackage, photoAlbum.join(" "));

                return true;
            }
        }
        catch (err)
        {
            console.error("customProfileProtocol", err);
        }
        return false;
    });
    toClientTrie.addPath("$#", (data) =>
    {
        try
        {
            if (data == "" && submitCallback)
            {

                let callback = submitCallback;
                submitCallback = null;
                callback();

                return true;
            }
        }
        catch (err)
        {
            console.error("customProfileProtocol", err);
        }
        return false;
    });
}