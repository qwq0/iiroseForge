import { getNElement, NList, createNStyle as style, NTagName, NAsse, NEvent, NElement, createNStyleList } from "../../lib/qwqframe.js";
import { versionInfo } from "../info.js";
import { removeForgeFromCache, writeForgeToCache } from "../injectCache/injectCache.js";
import { plugList } from "../plug/plugList.js";
import { className } from "../ui/className.js";
import { showInfoBox, showInputBox } from "../ui/infobox.js";
import { showMenu } from "../ui/menu.js";

/**
 * 获取forge菜单
 * @returns {NElement}
 */
export function getForgeMenu()
{
    let menu = NList.getElement([
        style("position", "fixed"),
        style("top", "0"),
        style("left", "0"),
        style("zIndex", "91000"),
        style("height", "100%"),
        style("width", "100%"),
        style("backgroundColor", "rgba(255, 255, 255, 0.75)"),
        style("backdropFilter", "blur(3px)"),

        [
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
                createNStyleList({
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

        [
            style("position", "absolute"),
            style("width", "100%"),
            style("top", "40px"),
            style("bottom", "40px"),

            [
                ...([
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
                        title: "安装iiroseForge",
                        text: "下次使用无需注入",
                        icon: "puzzle",
                        onClick: async () =>
                        {
                            writeForgeToCache();
                            showInfoBox("安装iiroseForge", "已完成");
                        }
                    },
                    {
                        title: "卸载iiroseForge",
                        text: "下次启动清除iiroseForge",
                        icon: "puzzle",
                        onClick: async () =>
                        {
                            removeForgeFromCache();
                            showInfoBox("卸载iiroseForge", "已完成");
                        }
                    }
                ]).map(o => [
                    className("commonBox"),
                    style("maxWidth", "calc(100% - 24px)"),
                    style("minWidth", "355.2px"),
                    style("minHeight", "200px"),
                    style("float", "left"),
                    style("boxShadow", "0 0 1px rgb(0,0,0,0.12),0 1px 1px rgb(0,0,0,0.24)"),
                    style("margin", "24px 12px 0px 12px"),
                    style("position", "relative"),
                    [
                        className("commonBoxHead"),
                        style("backgroundColor", "rgba(255,255,255,0.2)"),
                        style("color", "rgba(0,0,0,0.4)"),
                        style("height", "100px"),
                        style("width", "100%"),
                        style("display", "flex"),
                        style("justifyContent", "center"),
                        style("padding", "0 24px"),
                        style("boxSizing", "border-box"),
                        [
                            className("mdi-" + o.icon),
                            style("lineHeight", "100px"),
                            style("fontSize", "30px"),
                            style("fontFamily", "md"),
                            style("display", "inline-block"),
                            style("verticalAlign", "top"),
                            style("height", "100%"),
                            style("opacity", "0.7"),
                        ],
                        [
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
                    [
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
                ])
            ]
        ],

        [
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
        ]
    ]);
    menu.element.id = "iiroseForgeMenu";

    return menu;
}