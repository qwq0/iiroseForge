import { getNElement, NList, createNStyle as style, NTagName, NAsse, NEvent } from "../../lib/qwqframe.js";

export function getForgeMenu()
{
    let menu = NList.getElement([
        style("position", "fixed"),
        style("top", "0"),
        style("left", "0"),
        style("zIndex", "91000"),
        style("height", "100%"),
        style("width", "100%"),
        style("backgroundColor", "rgba(255,255,255,0.8)"),

        [
            style("opacity", "0.8"),
            style("backgroundColor", "#303030"),
            style("width", "100%"),
            style("boxShadow", "0 0 1px rgb(0, 0, 0, 0.12), 0 1px 1px rgb(0, 0, 0, 0.24)"),
            style("zIndex", "2"),
            style("fontFamily", "md"),
            style("height", "40px"),
            style("lineHeight", "40px"),
            style("fontSize", "26px !important"),
            style("padding", "0 64px 0 24px"),
            style("whiteSpace", "nowrap"),
            style("boxSizing", "border-box"),
            style("position", "relative"),
            style("color", "#fff"),
            [
                style("fontSize", "16px !important"),
                style("opacity", "0.7"),
                style("fontWeight", "bold"),
                style("marginLeft", "24px"),
                style("height", "100%"),
                style("lineHeight", "40px"),
                style("display", "inline"),
                style("verticalAlign", "top"),

                "欢迎使用Forge for iirose"
            ]
        ],

        [],

        [
            style("color", "#303030"),
            style("background", "#fff"),
            style("opacity", ".8"),
            style("display", "flex"),
            style("height", "40px"),
            style("position", "absolute"),
            style("bottom", "0"),
            style("width", "100%"),
            style("boxShadow", "0 0 1px rgb(0,0,0,0.12),0 1px 1px rgb(0,0,0,0.24)"),
            style("zIndex", "2"),

            ...([
                {
                    text: "返回",
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
                    style("fontSize", "14px !important"),
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