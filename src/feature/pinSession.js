import { NList } from "../../lib/qwqframe.js";
import { iframeContext } from "../injectIframe/iframeContext.js";
import { storageContext, storageRoamingSave } from "../storage/storage.js";
import { className } from "../ui/className.js";
import { showNotice } from "../ui/notice.js";
import { addMenuHook } from "./uiHook.js";

/**
 * 启用会话置顶
 */
export function enablePinSession()
{
    addMenuHook(
        "pinSession",
        "sessionMenu",
        e => (storageContext.processed.pinSessionSet.has(e.uid) ? { icon: "pin-off", text: "取消置顶" } : { icon: "pin", text: "置顶会话" }),
        e =>
        {
            if (storageContext.processed.pinSessionSet.has(e.uid))
            {
                storageContext.processed.pinSessionSet.delete(e.uid);
                showNotice("置顶会话", "已取消置顶会话");
            }
            else
            {
                storageContext.processed.pinSessionSet.add(e.uid);
                showNotice("置顶会话", "已置顶会话");
            }
            storageRoamingSave();
            refresh();
        }
    );


    let enabled = false;
    /**
     * @type {() => void}
     */
    let refreshList = null;

    if (storageContext.processed.pinSessionSet.size > 0)
        init();

    function init()
    {
        if (enabled)
            return;
        enabled = true;

        // 私聊选项卡列表
        let sessionHolderPmTaskBox = iframeContext.iframeDocument.getElementsByClassName("sessionHolderPmTaskBox")[0];
        let recentSessionLable = sessionHolderPmTaskBox.children[1];
        let pinnedSessionLable = NList.getElement([
            className("sessionHolderSpliter"),
            "置顶会话"
        ]).element;
        sessionHolderPmTaskBox.children[0].after(pinnedSessionLable);
        refreshList = () =>
        {
            if (!recentSessionLable.parentElement)
            {
                pinnedSessionLable.after(recentSessionLable);
            }

            Array.from(sessionHolderPmTaskBox.children).reverse().forEach(o =>
            {
                if (
                    o.classList.length == 2 &&
                    o.classList.contains("sessionHolderPmTaskBoxItem") &&
                    o.classList.contains("whoisTouch2") &&
                    o != sessionHolderPmTaskBox.children[0]
                )
                {
                    let uid = o.getAttribute("ip");
                    let pinned = storageContext.processed.pinSessionSet.has(uid);
                    let positionBitmap = recentSessionLable.compareDocumentPosition(o);
                    if ((positionBitmap & 2) && !pinned)
                    {
                        recentSessionLable.after(o);
                    }
                    else if ((positionBitmap & 4) && pinned)
                    {
                        pinnedSessionLable.after(o);
                    }
                }
            });
        };
        refreshList();
        {
            let paddingElement = document.createElement("div");
            paddingElement.style.display = "none";
            recentSessionLable.after(paddingElement);
        }
        (new MutationObserver(mutationsList =>
        {
            for (let mutation of mutationsList)
            {
                if (mutation.type == "childList")
                {
                    Array.from(mutation.addedNodes).forEach((/** @type {HTMLElement} */o) =>
                    { // 处理新增的私聊选项卡
                        if (o.classList != undefined && o.classList.contains("sessionHolderPmTaskBoxItem"))
                        {
                            if (
                                o.classList.length == 2 &&
                                o.classList.contains("sessionHolderPmTaskBoxItem") &&
                                o.classList.contains("whoisTouch2")
                            )
                            {
                                let uid = o.getAttribute("ip");
                                console.log("on list item change", uid);
                                let pinned = storageContext.processed.pinSessionSet.has(uid);
                                if ((recentSessionLable.compareDocumentPosition(o) & 2) && !pinned)
                                {
                                    recentSessionLable.after(o);
                                }
                                else if ((recentSessionLable.compareDocumentPosition(o) & 4) && pinned)
                                {
                                    pinnedSessionLable.after(o);
                                }

                            }
                        }
                    });

                    if (!recentSessionLable.parentElement || !recentSessionLable.nextElementSibling)
                    {
                        if (!recentSessionLable.parentElement)
                        {
                            pinnedSessionLable.after(recentSessionLable);
                            refreshList();
                        }
                        if (!recentSessionLable.nextSibling)
                        {
                            let paddingElement = document.createElement("div");
                            paddingElement.style.display = "none";
                            recentSessionLable.after(paddingElement);
                        }
                    }
                }
            }
        })).observe(sessionHolderPmTaskBox, { attributes: false, childList: true, subtree: true, characterData: true, characterDataOldValue: true });
    }

    function refresh()
    {
        if (!enabled)
            init();
        refreshList();
    }
}