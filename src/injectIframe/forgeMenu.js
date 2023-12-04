import { RcoCcontext } from "../../lib/jsRco.js";
import { mouseBind } from "../../lib/qwqframe.js";
import { touchBind } from "../../lib/qwqframe.js";
import { getNElement, NList, createNStyle as style, NTagName, NAsse, NEvent, NElement, createNStyleList as styles } from "../../lib/qwqframe.js";
import { showBeautifyMenu } from "../feature/beautify.js";
import { showBlacklistMenu } from "../feature/blacklist.js";
import { showMultiAccountMenu } from "../feature/multiAccount.js";
import { showNotDisturbModeMenu } from "../feature/notDisturbMode.js";
import { showPatchMenu } from "../feature/patch.js";
import { trySyncConfig } from "../feature/syncConfig.js";
import { versionInfo } from "../info.js";
import { removeForgeFromCache, writeForgeToCache } from "../injectCache/injectCache.js";
import { plugList } from "../plug/plugList.js";
import { createPlugWindow } from "../plug/plugWindow.js";
import { storageContext, storageLocalSave, storageRoamingSave } from "../storage/storage.js";
import { className } from "../ui/className.js";
import { showInfoBox, showInputBox, showTextareaBox } from "../ui/infobox.js";
import { showMenu } from "../ui/menu.js";
import { showNotice } from "../ui/notice.js";
import { iframeContext } from "./iframeContext.js";

/**
 * @type {ReturnType<createPlugWindow>}
 */
let plugStone = null;

/**
 * 获取forge菜单
 * @returns {NElement}
 */
export function getForgeMenu()
{
    let menu = NList.getElement([ // 整个菜单
        style("position", "fixed"),
        style("top", "0"),
        style("left", "0"),
        style("zIndex", "91000"),
        style("height", "100%"),
        style("width", "100%"),
        style("backgroundColor", "rgba(255, 255, 255, 0.75)"),
        style("backdropFilter", "blur(3px)"),

        [ // 标题栏
            style("opacity", "0.8"),
            style("backgroundColor", "#303030"),
            style("width", "100%"),
            style("boxShadow", "0 0 1px rgb(0, 0, 0, 0.12), 0 1px 1px rgb(0, 0, 0, 0.24)"),
            style("zIndex", "2"),
            style("fontFamily", "md"),
            style("height", "40px"),
            style("lineHeight", "40px"),
            style("fontSize", "26px"),
            style("padding", "0 16px 0 16px"),
            style("whiteSpace", "nowrap"),
            style("boxSizing", "border-box"),
            style("position", "relative"),
            style("color", "#fff"),

            [
                className("mdi-anvil"),
                styles({
                    display: "inline",
                    opacity: "0.8",
                    backgroundColor: "#303030",
                    boxShadow: "0 0 1px rgb(0,0,0,0.12), 0 1px 1px rgb(0,0,0,0.24)",
                    zIndex: "2",
                    fontFamily: "md",
                    height: "40px",
                    lineHeight: "40px",
                    fontSize: "26px",
                    padding: "0 0 0 0",
                    whiteSpace: "nowrap",
                    boxSizing: "border-box",
                    position: "relative",
                    color: "#fff",
                })
            ],
            [
                style("display", "inline"),
                style("fontSize", "16px"),
                style("opacity", "0.7"),
                style("fontWeight", "bold"),
                style("marginLeft", "16px"),
                style("height", "100%"),
                style("lineHeight", "40px"),
                style("display", "inline"),
                style("verticalAlign", "top"),

                `欢迎使用 iirose-Forge   version ${versionInfo.version}`
            ]
        ],

        [ // 菜单主体
            style("position", "absolute"),
            style("width", "100%"),
            style("top", "40px"),
            style("bottom", "40px"),
            style("overflow", "auto"),

            [
                styles({
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))"
                }),
                ...([ // 菜单列表项
                    {
                        title: "管理插件",
                        text: "管理插件",
                        icon: "puzzle",
                        onClick: async () =>
                        {
                            showMenu([
                                NList.getElement([
                                    "[ 添加插件 ]",
                                    new NEvent("click", async () =>
                                    {
                                        let pluginUrl = await showInputBox("添加插件", "请输入插件地址\n插件会自动进行更新", true);
                                        if (pluginUrl != undefined)
                                        {
                                            await plugList.addPlug(pluginUrl, pluginUrl);
                                            plugList.savePlugList();
                                        }
                                    }),
                                ]),
                                ...(Array.from(plugList.map.keys())).map(name => NList.getElement([
                                    `${name}`,
                                    new NEvent("click", async () =>
                                    {
                                        showMenu([
                                            NList.getElement([
                                                "显示插件窗口",
                                                new NEvent("click", () =>
                                                {
                                                    plugList.showPlugWindow(name);
                                                })
                                            ]),
                                            NList.getElement([
                                                "移除插件",
                                                new NEvent("click", () =>
                                                {
                                                    plugList.removePlug(name);
                                                    plugList.savePlugList();
                                                })
                                            ])
                                        ]);
                                    }),
                                ]))
                            ]);

                        }
                    },
                    {
                        title: "侧载脚本",
                        text: "管理侧载js",
                        icon: "script",
                        onClick: async () =>
                        {
                            await showInfoBox("警告", [
                                "! 侧载外部脚本是高危操作 !",
                                "侧载的脚本不接受forge权限管理",
                                "外部脚本能获取您在此网站的所有信息",
                                "恶意外部脚本可能盗取您的账号",
                                "请勿加载他人提供的闭源脚本",
                                "继续操作前 您应该了解自己正在做什么"
                            ].join("\n"));
                            showMenu([
                                NList.getElement([
                                    "[ 添加iframe外侧侧载脚本 ]",
                                    new NEvent("click", async () =>
                                    {
                                        let scriptUrl = await showInputBox("添加侧载脚本", "请输入脚本地址\n每次载入会重新获取脚本\n脚本将随forge启动运行", true);
                                        if (scriptUrl != undefined)
                                        {
                                            storageContext.roaming.sideLoadedScript.push([scriptUrl, scriptUrl, false]);
                                            storageRoamingSave();
                                            showNotice("添加侧载脚本", "已将脚本添加到侧载列表\n将在下次重启时生效");
                                        }
                                    }),
                                ]),
                                NList.getElement([
                                    "[ 添加iframe内侧侧载脚本 ]",
                                    new NEvent("click", async () =>
                                    {
                                        let scriptUrl = await showInputBox("添加侧载脚本", "请输入脚本地址\n每次载入会重新获取脚本\n脚本将随iframe重载运行", true);
                                        if (scriptUrl != undefined)
                                        {
                                            storageContext.roaming.sideLoadedScript.push([scriptUrl, scriptUrl, true]);
                                            storageRoamingSave();
                                            showNotice("添加侧载脚本", "已将脚本添加到侧载列表\n将在下次重启或iframe重载时生效");
                                        }
                                    }),
                                ]),
                                ...(storageContext.roaming.sideLoadedScript.map(([name, url, insideIframe], ind) => NList.getElement([
                                    `${insideIframe ? "内" : "外"} | ${name}`,
                                    new NEvent("click", async () =>
                                    {
                                        showMenu([
                                            NList.getElement([
                                                "移除插件",
                                                new NEvent("click", () =>
                                                {
                                                    storageContext.roaming.sideLoadedScript.splice(ind, 1);
                                                    storageRoamingSave();
                                                    showNotice("删除侧载脚本", "已将脚本从侧载列表移除\n将在下次重启时生效");
                                                })
                                            ])
                                        ]);
                                    }),
                                ])))
                            ]);

                        }
                    },
                    {
                        title: "插件商店",
                        text: "打开插件商店",
                        icon: "shopping",
                        onClick: async () =>
                        {
                            if (plugStone)
                            {
                                plugStone.windowElement.setDisplay("block");
                                plugStone.windowElement.setStyle("pointerEvents", "auto");
                                return;
                            }

                            plugStone = createPlugWindow(true);
                            plugStone.iframe.element.src = "https://iplugin.reifuu.icu";

                            let available = false;

                            let channel = new MessageChannel();
                            let port = channel.port1;

                            let rcoContext = new RcoCcontext();
                            rcoContext.addGlobalNamedFunctions(/** @satisfies {import("../../doc/plugStoreApi").iiroseForgePlugStoreApi} */({
                                getForgeVersion: async () => versionInfo.version,
                                getPlugList: async () => Array.from(plugList.map.entries()).map(o => ({
                                    name: o[0],
                                    url: o[1].url
                                })),
                                installPlug: async (name, url) =>
                                {
                                    name = String(name);
                                    url = String(url);
                                    return 3;
                                },
                                uninstallPlug: async (name) =>
                                {
                                    name = String(name);
                                    return 3;
                                },
                            }));
                            port.addEventListener("message", data => { rcoContext.onData(data); });
                            rcoContext.bindOutStream(data => { port.postMessage(data); }, "raw");

                            plugStone.iframe.addEventListener("load", () =>
                            {
                                if (!available)
                                {
                                    port.start();
                                    plugStone.iframe.element.contentWindow.postMessage({
                                        type: "setMessagePort",
                                        port: channel.port2
                                    }, "*", [channel.port2]); // 初始化通信管道
                                }
                            });

                            plugStone.windowElement.setDisplay("block");
                            plugStone.windowElement.setStyle("pointerEvents", "auto");
                        }
                    },
                    {
                        title: "勿扰模式",
                        text: "设置自动回复",
                        icon: "bell-minus-outline",
                        onClick: async () =>
                        {
                            showNotDisturbModeMenu();
                        }
                    },
                    {
                        title: "拉取配置",
                        text: "获取您其他在线设备的配置",
                        icon: "sync",
                        onClick: async () =>
                        {
                            trySyncConfig();
                        }
                    },
                    {
                        title: "美化设置",
                        text: "定制你的界面",
                        icon: "brush-outline",
                        onClick: async () =>
                        {
                            showBeautifyMenu();
                        }
                    },
                    {
                        title: "附加功能",
                        text: "设置本机的附加功能",
                        icon: "cog",
                        onClick: async () =>
                        {
                            showMenu([
                                ...([
                                    {
                                        name: "用户备注",
                                        storageKey: "enableUserRemark"
                                    },
                                    {
                                        name: "聊天记录同步(测试)",
                                        storageKey: "enableSyncChatRecord"
                                    },
                                    {
                                        name: "超级菜单",
                                        storageKey: "enableSuperMenu"
                                    },
                                    {
                                        name: "快捷房管操作",
                                        storageKey: "enableRoomAdminOperation"
                                    },
                                    ...(
                                        storageContext.local.enableExperimental ?
                                            [
                                                {
                                                    name: "实验性功能",
                                                    storageKey: "enableExperimental"
                                                },
                                                {
                                                    name: "实验性功能设置",
                                                    func: async () =>
                                                    {
                                                        let optionJson = JSON.stringify(storageContext.local.experimentalOption, undefined, 4);
                                                        let newValue = await showTextareaBox("实验性功能设置", "设置实验性功能的json", true, optionJson);
                                                        if (newValue != undefined && newValue != optionJson)
                                                        {
                                                            try
                                                            {
                                                                storageContext.local.experimentalOption = JSON.parse(newValue);
                                                                storageLocalSave();
                                                                showNotice("实验性功能", "已更新实验性功能设置");
                                                            }
                                                            catch (err)
                                                            {
                                                                showNotice("实验性功能", `实验性功能设置更新失败\n${err instanceof Error ? err.message : ""}`);
                                                            }
                                                        }
                                                    }
                                                },
                                            ] :
                                            []
                                    )
                                ]).map(o => NList.getElement([
                                    `${o.storageKey ? (storageContext.local[o.storageKey] ? "(已启用)" : "(已禁用)") : ""}${o.name}`,
                                    new NEvent("click", async () =>
                                    {
                                        if (o.storageKey)
                                        {
                                            let targetState = !storageContext.local[o.storageKey];
                                            let confirm = await showInfoBox("设置功能", `切换 ${o.name} 功能到 ${targetState ? "启用" : "禁用"} 状态\n可能需要重载以生效`, true);
                                            if (confirm)
                                            {
                                                storageContext.local[o.storageKey] = targetState;
                                                storageLocalSave();
                                            }
                                        }
                                        else if (o.func)
                                        {
                                            o.func();
                                        }
                                    }),
                                ]))
                            ]);
                        }
                    },
                    {
                        title: "补丁设置",
                        text: "启用或禁用补丁",
                        icon: "bandage",
                        onClick: async () =>
                        {
                            showPatchMenu();
                        }
                    },
                    {
                        title: "账号管理",
                        text: "管理你的其他账号",
                        icon: "account-cog",
                        onClick: async () =>
                        {
                            await showMultiAccountMenu();
                        }
                    },
                    {
                        title: "黑名单",
                        text: "管理黑名单",
                        icon: "account-cancel-outline",
                        onClick: async () =>
                        {
                            await showBlacklistMenu();
                        }
                    },
                    {
                        title: "安装iiroseForge",
                        text: "下次使用无需注入",
                        icon: "puzzle",
                        onClick: async () =>
                        {
                            localStorage.setItem("installForge", "true");
                            writeForgeToCache(true);
                            showInfoBox("安装iiroseForge", "已完成");
                        }
                    },
                    {
                        title: "卸载iiroseForge",
                        text: "下次启动清除iiroseForge",
                        icon: "puzzle",
                        onClick: async () =>
                        {
                            localStorage.removeItem("installForge");
                            removeForgeFromCache();
                            showInfoBox("卸载iiroseForge", "已完成");
                        }
                    }
                ]).map(o => [ // 菜单列表项元素
                    className("commonBox"),
                    style("maxWidth", "calc(100% - 24px)"),
                    style("minWidth", "355.2px"),
                    style("minHeight", "200px"),
                    style("float", "none"),
                    style("boxShadow", "0 0 1px rgb(0,0,0,0.12),0 1px 1px rgb(0,0,0,0.24)"),
                    style("margin", "24px 12px 0px 12px"),
                    style("position", "relative"),
                    [ // 元素标题行
                        className("commonBoxHead"),
                        style("backgroundColor", "rgba(255,255,255,0.2)"),
                        style("color", "rgba(0,0,0,0.4)"),
                        style("height", "100px"),
                        style("width", "100%"),
                        style("display", "flex"),
                        style("justifyContent", "center"),
                        style("padding", "0 24px"),
                        style("boxSizing", "border-box"),
                        [ // 图标
                            className("mdi-" + o.icon),
                            style("lineHeight", "100px"),
                            style("fontSize", "30px"),
                            style("fontFamily", "md"),
                            style("display", "inline-block"),
                            style("verticalAlign", "top"),
                            style("height", "100%"),
                            style("opacity", "0.7"),
                        ],
                        [ // 标题文本
                            style("lineHeight", "100px"),
                            style("fontSize", "20px"),
                            style("display", "inline-block"),
                            style("verticalAlign", "top"),
                            style("height", "100%"),
                            style("fontWeight", "bold"),
                            style("marginLeft", "22px"),
                            style("overflow", "hidden"),
                            style("whiteSpace", "pre"),
                            style("textOverflow", "ellipsis"),

                            o.title
                        ]
                    ],
                    [ // 元素正文
                        className("textColor"),
                        style("width", "100%"),
                        style("minHeight", "100px"),
                        style("backgroundColor", "rgba(255,255,255,0.5)"),
                        style("color", "rgba(0,0,0,0.75)"),
                        [
                            style("fontWeight", "bold"),
                            style("width", "100%"),
                            style("height", "100%"),
                            style("lineHeight", "1.8em"),
                            style("textAlign", "center"),
                            style("padding", "2.2em"),
                            style("boxSizing", "border-box"),
                            style("whiteSpace", "pre-wrap"),
                            style("fontSize", "16px"),
                            style("color", "rgba(0,0,0,0.7)"),

                            o.text
                        ]
                    ],

                    new NEvent("click", o.onClick)
                ]),

            ],
            [ // 菜单主体下方的填充
                styles({
                    height: "25px"
                })
            ]
        ],

        [ // 底栏
            style("color", "#303030"),
            style("background", "#fff"),
            style("opacity", "0.8"),
            style("display", "flex"),
            style("height", "40px"),
            style("position", "absolute"),
            style("bottom", "0"),
            style("width", "100%"),
            style("boxShadow", "0 0 1px rgb(0,0,0,0.12),0 1px 1px rgb(0,0,0,0.24)"),
            style("zIndex", "2"),

            ...([
                {
                    text: "< 返回",
                    onClick: () =>
                    {
                        menu.remove();
                    }
                }
            ].map(o => [
                style("width", "0"),
                style("flexGrow", "1"),
                style("justifyContent", "center"),
                style("padding", "0 24px"),
                style("boxSizing", "border-box"),

                new NEvent("click", o.onClick),

                [],

                [
                    style("display", "inline-block"),
                    style("verticalAlign", "top"),
                    style("height", "100%"),
                    style("fontWeight", "bold"),
                    style("marginLeft", "22px"),
                    style("fontSize", "14px"),
                    style("lineHeight", "40px"),
                    style("overflow", "hidden"),
                    style("whiteSpace", "pre"),
                    style("textOverflow", "ellipsis"),

                    o.text
                ]
            ]))
        ],

        ele => // 实验性功能手势
        {
            const gestureTable = [
                "left",
                "leftDown",
                "down",
                "rightUp",
                "right",
                "rightDown",
                "up",
                "leftUp",
                "none"
            ];
            /**
             * @type {Array<typeof gestureTable[number]>}
             */
            let gestureList = [];
            // 跟踪点的累计值
            let trackPointX = 0;
            let trackPointY = 0;
            /**
             * @type {null | number | NodeJS.Timeout}
             */
            let intervalId = null;
            /**
             * @type {typeof gestureTable[number]}
             */
            let nowDirection = "none";
            let nowDirectionStartTime = 0;

            /**
             * @param {import("../../lib/qwqframe").PointerData} e
             */
            function pointerMove(e)
            {
                if (e.pressing)
                {
                    trackPointX = 0;
                    trackPointY = 0;
                    nowDirectionStartTime = Date.now();
                    nowDirection = "none";
                    if (intervalId == null)
                        intervalId = setInterval(checkPath, 85);
                }
                else
                {
                    trackPointX += e.vx;
                    trackPointY += e.vy;
                }

                if (!e.hold)
                {
                    if (intervalId != null)
                    {
                        clearInterval(intervalId);
                        intervalId = null;
                    }
                }
            }

            function checkPath()
            {
                let nowTickDirection = "none";
                if (Math.abs(trackPointX) >= 10 || Math.abs(trackPointY) >= 10)
                {
                    nowTickDirection = gestureTable[
                        Math.floor(((Math.floor(
                            ((Math.atan2(-trackPointY, trackPointX)) / (2 * Math.PI) + 0.5) * 16
                        ) + 1) % 16) / 2)
                    ];
                }
                trackPointX = 0;
                trackPointY = 0;

                if (nowTickDirection != nowDirection)
                {
                    nowDirection = nowTickDirection;
                    if (nowDirection != "none")
                        gestureList.push(nowDirection);
                }

                while (gestureList.length > 200)
                    gestureList.shift();

                /**
                 * @type {Array<typeof gestureTable[number]>}
                 */
                const targetGesture = [
                    "down",

                    "down",

                    "leftDown",
                    "right",
                    "down"
                ];

                if (targetGesture.every((o, index) => o == gestureList.at(index - targetGesture.length)))
                {
                    gestureList = [];

                    storageContext.local.enableExperimental = true;
                    storageLocalSave();
                    showNotice("实验性功能", "已激活实验性功能\n部分功能需要重载以启用");
                }
            }

            mouseBind(ele, pointerMove, 0, iframeContext.iframeWindow);
            touchBind(ele, pointerMove, false);
            ele.addEventListener("mousedown", e => { e.stopPropagation(); });
            ele.addEventListener("mouseup", e => { e.stopPropagation(); });
            ele.addEventListener("touchstart", e => { e.stopPropagation(); });
            ele.addEventListener("touchend", e => { e.stopPropagation(); });
            ele.addEventListener("touchmove", e => { e.stopPropagation(); });
            ele.addEventListener("touchcancel", e => { e.stopPropagation(); });
        }
    ]);
    menu.element.id = "iiroseForgeMenu";

    return menu;
}