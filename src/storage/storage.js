import { createHookObj } from "../../lib/qwqframe.js";
import { showNotice } from "../ui/notice.js";

/**
 * 储存上下文
 * 将使用json进行序列化
 */
export const storageContext = {
    processed: {
        /**
         * 黑名单uid集合
         * @type {Set<string>}
         */
        uidBlacklistSet: new Set(),
        /**
         * 我的其他账号uid集合
         * @type {Set<string>}
         */
        myAccountSet: new Set(),
        /**
         * 置顶会话的uid集合
         * @type {Set<string>}
         */
        pinSessionSet: new Set()
    },
    roaming: {
        /**
         * 插件信息
         * @type {Array<[string, string, Array<string>, Array<string>]>}
         */
        plugInfo: [],
        /**
         * 侧载脚本
         * @type {Array<[string, string, boolean]>}
         */
        sideLoadedScript: [],
        /**
         * 用户备注
         * 用户uid 到 用户备注
         * @type {Object<string, string>}
         */
        userRemark: {},
        /**
         * 我的其他账号uid列表
         * @type {Array<string>}
         */
        myAccountList: [],
        /**
         * 美化设置
         * @type {Object<string, string>}
         */
        beautify: {},
        /**
         * 自定义资料卡设置
         * @type {{
         *  topPinned?: Array<string>,
         *  bottomPinned?: Array<string>
         * }}
         */
        customInfoPage: {},
        /**
         * 黑名单uid列表
         * @type {Array<string>}
         */
        uidBlacklist: [],
        /**
         * 置顶会话的uid列表
         * @type {Array<string>}
         */
        pinSessionList: [],
        /**
         * 黑名单自动回复文本
         * @type {string}
         */
        blacklistAutoReply: "根据对方的隐私设置 您暂时无法向对方发送私信",
        /**
         * 勿扰模式自动回复文本
         * @type {string}
         */
        notDisturbModeAutoReply: "你好 我现在有事不在 一会再和你联系"
    },
    local: {
        // 启用同步聊天记录
        enableSyncChatRecord: false,
        // 启用用户备注
        enableUserRemark: true,
        // 启用音频接管
        enableAudioTakeover: true,
        // 启用超级菜单
        enableSuperMenu: false,
        // 启用快速房管操作
        enableRoomAdminOperation: true,
        // 启用置顶聊天
        enablePinSession: true,
        // 启用聊天记录查看器
        enableRecordViewer: true,
        // 最后一次关闭的时间
        lastCloseTime: 0,
        // 已同步聊天记录到此时间
        syncChatRecordTo: 0,
        // 启用实验性功能
        enableExperimental: false,
        // 实验性功能选项
        experimentalOption: {},
        /**
         * 补丁设置
         * @type {Object<string, string | boolean>}
         */
        patch: {},
        /**
         * 超级菜单优先级
         * @type {Object<string, Object<string, number>>}
         */
        superMenuPriority: {},
        /**
         * 超级菜单选项
         * @type {Object<string, string>}
         */
        superMenuOption: {}
    }
};

/**
 * 获取漫游储存
 * @returns {typeof storageContext.roaming}
 */
export function storageRoamingGet()
{
    try
    {
        storageContext.roaming.myAccountList = Array.from(storageContext.processed.myAccountSet);
        storageContext.roaming.uidBlacklist = Array.from(storageContext.processed.uidBlacklistSet);
        storageContext.roaming.pinSessionList = Array.from(storageContext.processed.pinSessionSet);
    }
    catch (err)
    {
        showNotice("错误", "无法处理储存 这可能导致iiroseForge配置丢失");
    }
    return storageContext.roaming;
}

/**
 * 设置漫游储存
 * @param {Object} storageObj
 */
export function storageRoamingSet(storageObj)
{
    try
    {
        Object.keys(storageObj).forEach(key =>
        {
            storageContext.roaming[key] = storageObj[key];
        });
        Object.keys(storageContext.roaming).forEach(key =>
        {
            if (
                typeof (storageContext.roaming[key]) == "object" &&
                !Array.isArray(storageContext.roaming[key])
            )
                storageContext.roaming[key] = createHookObj(storageContext.roaming[key]);
        });
        storageContext.processed.myAccountSet = new Set(storageContext.roaming.myAccountList);
        storageContext.processed.uidBlacklistSet = new Set(storageContext.roaming.uidBlacklist);
        storageContext.processed.pinSessionSet = new Set(storageContext.roaming.pinSessionList);
    }
    catch (err)
    {
        showNotice("错误", "无法设置储存 这可能导致iiroseForge配置丢失");
    }
}

export function storageRoamingRead()
{
    try
    {
        let storageJson = localStorage.getItem("iiroseForge");
        let storageObj = (storageJson ? JSON.parse(storageJson) : {});
        storageRoamingSet(storageObj);
    }
    catch (err)
    {
        showNotice("错误", "无法读入储存 这可能导致iiroseForge配置丢失");
    }
}

export function storageRoamingSave()
{
    try
    {
        let storageJson = JSON.stringify(storageRoamingGet());
        localStorage.setItem("iiroseForge", storageJson);
    }
    catch (err)
    {
        showNotice("错误", "无法写入储存 这可能导致iiroseForge配置丢失");
    }
}

export function storageLocalRead()
{
    try
    {
        let storageJson = localStorage.getItem("iiroseForgeLocal");
        let storageObj = (storageJson ? JSON.parse(storageJson) : {});
        Object.keys(storageObj).forEach(key =>
        {
            storageContext.local[key] = storageObj[key];
        });
    }
    catch (err)
    {
        showNotice("错误", "无法读入本地储存 这可能导致iiroseForge配置丢失");
    }
}

export function storageLocalSave()
{
    try
    {
        let storageJson = JSON.stringify(storageContext.local);
        localStorage.setItem("iiroseForgeLocal", storageJson);
    }
    catch (err)
    {
        showNotice("错误", "无法写入本地储存 这可能导致iiroseForge配置丢失");
    }
}