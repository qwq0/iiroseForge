import { iframeContext } from "../../injectIframe/iframeContext.js";
import { getNElement, NList, createNStyle as style, NTagName, NAsse, NEvent, NElement, createNStyleList as styles, mouseBind } from "../../../lib/qwqframe.js";
import { domPath } from "../../../lib/plugToolsLib.js";
import { className } from "../../ui/className.js";
import { NAttr } from "../../../lib/qwqframe.js";
import { ForgeSuperMenu } from "./ForgeSuperMenu.js";
import { ForgeSuperMenuColumn } from "./ForgeSuperMenuColumn.js";
import { forgeApi } from "../../forgeApi/forgeApi.js";
import { touchBind } from "../../../lib/qwqframe.js";
import { showMenu } from "../../ui/menu.js";
import { storageContext, storageLocalSave } from "../../storage/storage.js";
import { setNotDisturbMode } from "../notDisturbMode.js";
import { showNotice } from "../../ui/notice.js";
import { showInfoBox, showInputBox } from "../../ui/infobox.js";
import { isAmong } from "../../../lib/qwqframe.js";


/**
 * @param {Array<{id?: string;item: any;execute: () => void;}>} menuList
 * @param {ForgeSuperMenuColumn} column
 * @param {string} columnName
 */
export function createSortableList(menuList, column, columnName)
{
    menuList.sort((a, b) =>
    {
        /**
         * @param {{ id?: string }} o
         */
        function mappingPriority(o)
        {
            if (o.id == undefined)
                return 0;
            let priorityValue = storageContext.local.superMenuPriority?.[columnName]?.[o.id];
            if (priorityValue == undefined)
                return (1 << 30);
            else if (priorityValue > 0)
                return (1 << 30) - priorityValue;
            else if (priorityValue < 0)
                return (1 << 31) - priorityValue;
        }
        return mappingPriority(a) - mappingPriority(b);
    }).forEach((o, index) =>
    {
        column.addChild(
            o.item,
            o.execute,
            () =>
            {
                if (!o.id)
                    return;
                showMenu([
                    NList.getElement([
                        "置底于无动作上方",
                        new NEvent("click", () =>
                        {
                            let mapObj = storageContext.local.superMenuPriority[columnName];
                            if (!mapObj)
                            {
                                mapObj = {};
                                storageContext.local.superMenuPriority[columnName] = mapObj;
                            }
                            let minValue = 0;
                            Object.keys(mapObj).forEach(key =>
                            {
                                if (key != o.id && mapObj[key] < 0)
                                    minValue = Math.min(minValue, mapObj[key]);
                            });
                            mapObj[o.id] = minValue - 1;
                            storageLocalSave();
                        })
                    ]),
                    NList.getElement([
                        "置顶于无动作下方",
                        new NEvent("click", () =>
                        {
                            let mapObj = storageContext.local.superMenuPriority[columnName];
                            if (!mapObj)
                            {
                                mapObj = {};
                                storageContext.local.superMenuPriority[columnName] = mapObj;
                            }
                            let maxValue = 0;
                            Object.keys(mapObj).forEach(key =>
                            {
                                if (key != o.id && mapObj[key] > 0)
                                    maxValue = Math.max(maxValue, mapObj[key]);
                            });
                            mapObj[o.id] = maxValue + 1;
                            storageLocalSave();
                        })
                    ]),
                    NList.getElement([
                        "取消自定义位置",
                        new NEvent("click", () =>
                        {
                            if (storageContext.local.superMenuPriority[columnName])
                            {
                                delete storageContext.local.superMenuPriority[columnName][o.id];
                                storageLocalSave();
                            }
                        })
                    ])
                ]);
            }
        );
        if (!o.id)
            column.currentRowIndex = index;
    });
}


/**
 * 通过房间id创建列表项
 * @param {string} roomId 
 * @param {string} [addition]
 * @returns 
 */
export function createRoomListItemById(roomId, addition = "")
{
    let roomInfo = forgeApi.operation.getRoomInfoById(roomId);
    if (roomInfo)
        return createListItem(
            "http" + roomInfo.roomImage,
            roomInfo.name,
            roomInfo.description,
            (roomInfo.currentUserNum != "hidden" ? `${roomInfo.currentUserNum}人` : "隐藏人数"),
            addition,
            `rgba(${roomInfo.color}, 0.8)`
        );
    else
        return createListItem(
            "",
            "不存在的房间",
            "",
            "",
            "",
            `rgba(0, 0, 0, 0.8)`
        );
}

/**
 * 创建列表项
 * @param {string} image
 * @param {string} title
 * @param {string} text
 * @param {string} [addition]
 * @param {string} [cornerMark]
 * @returns {NElement}
 */
export function createListItem(image, title, text, addition = "", cornerMark = "", color = "rgba(240, 240, 240, 0.8)")
{
    /**
     * 检测是亮色或暗色
     * @param {string} colorStr
     */
    function rgbLightOrDark(colorStr)
    {
        let braceIndex = color.indexOf("(");
        if (braceIndex != -1)
            colorStr = colorStr.slice(braceIndex + 1, colorStr.lastIndexOf(")"));
        let part = colorStr.split(",").map(o => Number.parseInt(o));
        return (part[0] * 0.299 + part[1] * 0.587 + part[2] * 0.114 > 186);
    }

    let textColor = (rgbLightOrDark(color) ? "rgba(0, 0, 0, 0.75)" : "rgba(255, 255, 255, 0.75)");
    return NList.getElement([
        className("sessionHolderPmTaskBoxItem"),
        styles({
            backgroundColor: color,
            color: textColor
        }),
        [
            styles({
                height: "100px",
                width: "100px",
                position: "relative",
                WebkitMaskImage: "linear-gradient(to right,#000 50%,transparent)",
                display: (image ? "block" : "none")
            }),
            [
                className("bgImgBox"),
                (
                    image.startsWith("mdi-") ?
                        [
                            styles({
                                width: "100%",
                                height: "100%",
                                textAlign: "center"
                            }),
                            [
                                styles({
                                    lineHeight: "100px",
                                    fontSize: "50px",
                                    fontFamily: "md",
                                    height: "100%",
                                }),
                                className(image),
                                new NTagName("span"),
                            ]
                        ] :
                        [
                            className("bgImg"),
                            new NTagName("img"),
                            new NAttr("loading", "lazy"),
                            new NAttr("decoding", "async"),
                            new NAttr("src", image),
                        ]
                ),
                [
                    className("fullBox")
                ]
            ]
        ],
        [
            styles({
                height: "100%",
                position: "absolute",
                top: "0",
                left: "100px",
                right: "0"
            }),
            [
                className("sessionHolderPmTaskBoxItemName textOverflowEllipsis"),
                [
                    styles({
                        fontSize: "inherit",
                        fontWeight: "inherit"
                    }),
                    title
                ]
            ],
            [
                className("sessionHolderPmTaskBoxItemTime textOverflowEllipsis"),
                addition
            ],
            [
                className("sessionHolderPmTaskBoxItemMsg textOverflowEllipsis"),
                text
            ]
        ],
        [
            styles({
                position: "absolute",
                top: "1px",
                right: "1px",
                backgroundColor: textColor,
                color: color,
                fontSize: "16px",
                fontWeight: "bold",
                padding: "0px 8px",
                height: "26.5px",
                lineHeight: "26.5px",
                transition: "transform 0.25s ease 0s",
                borderRadius: "0px 0px 0px 2px",
                display: (cornerMark ? "block" : "none")
            }),
            cornerMark
        ]
    ]);
}

let superMenuOptionInfoList = [
    {
        name: "右键延迟显示时间",
        key: "rightButtonDelay",
        type: "number",
        min: 50,
        max: 500,
        default: 125
    },
    {
        name: "右Alt键打开超级菜单",
        key: "rightAltEnable",
        type: "boolean",
    },
];
let superMenuOptionInfoMap = new Map(superMenuOptionInfoList.map(o => [o.key, o]));

/**
 * 获取超级菜单选项值
 * @param {string} key
 */
export function getSuperMenuOption(key)
{
    let info = superMenuOptionInfoMap.get(key);
    if (!info)
        throw "A non-existent option key was accessed";
    let rawValue = storageContext.local.superMenuOption[key];
    switch (info.type)
    {
        case "text":
            return (rawValue ? rawValue : info.default);
        case "number":
            return (rawValue ? Number(rawValue) : info.default);
        case "boolean":
            return (rawValue == "true" ? true : false);
        default:
            return rawValue;
    }
}

/**
 * 显示超级菜单选项菜单
 */
export function showSuperMenuOptionMenu()
{
    showMenu([
        ...(superMenuOptionInfoList.map(o => NList.getElement([
            o.name + (storageContext.local.superMenuOption[o.key] ? " (已设置)" : ""),
            new NEvent("click", async () =>
            {
                if (o.type == "boolean")
                {
                    let targetValue = (storageContext.local.superMenuOption[o.key] == "true" ? "" : "true");
                    let targetValueText = (targetValue == "true" ? "启用" : "禁用");
                    let confirm = await showInfoBox("超级菜单设置", `设置 ${o.name} 为 ${targetValueText} ?`, true);
                    if (confirm)
                    {
                        if (targetValue != "")
                        {
                            storageContext.local.superMenuOption[o.key] = targetValue;
                            storageLocalSave();
                        }
                        else
                        {
                            delete storageContext.local.superMenuOption[o.key];
                            storageLocalSave();
                        }
                    }
                }
                else if (isAmong(o.type, "number", "text"))
                {
                    let promptText = (
                        o.type == "number" ?
                            "填写一个数字" :
                            ""
                    );
                    if (
                        o.min != undefined ||
                        o.max != undefined ||
                        o.default != undefined
                    )
                    {
                        if (promptText != "")
                            promptText += "\n";

                        if (o.min != undefined)
                            promptText += `最小值 ${o.min} `;
                        if (o.max != undefined)
                            promptText += `最大值 ${o.max} `;
                        if (o.default != undefined)
                            promptText += `默认值 ${o.default} `;
                    }
                    let oldValue = storageContext.local.superMenuOption[o.key];

                    let value = await showInputBox("超级菜单设置", `设置 ${o.name}${promptText ? "\n" + promptText : ""}`, true, (oldValue ? oldValue : ""));
                    if (value != undefined)
                    {
                        if (value != "")
                        {
                            if (o.type == "number")
                            {
                                let valueNumber = Number(value);
                                if (!Number.isFinite(valueNumber))
                                {
                                    showNotice("超级菜单设置", "设置的值不是一个数字");
                                    return;
                                }
                                if (
                                    (o.min != undefined && valueNumber < o.min) ||
                                    (o.max != undefined && valueNumber > o.max)
                                )
                                {
                                    showNotice("超级菜单设置", "设置的值不满足范围要求");
                                    return;
                                }
                            }
                            storageContext.local.superMenuOption[o.key] = value;
                            storageLocalSave();
                        }
                        else
                        {
                            delete storageContext.local.superMenuOption[o.key];
                            storageLocalSave();
                        }
                    }
                }
            }),
        ])))
    ]);
}