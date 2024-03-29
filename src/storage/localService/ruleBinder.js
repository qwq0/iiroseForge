import { RuleBinder, EventRule, RuleType } from "../../../lib/qwqsocket.js";

/*
    此内容在客户端与服务端间复用
*/

export const serverBinder = RuleBinder.createServerBound();
export const clientBinder = RuleBinder.createClientBound();
serverBinder.bindOpposite(clientBinder);

/**
 * @param {Object<string, RuleType>} obj
 */
function createEventRule(obj)
{
    return EventRule.create(Object.entries(obj).map(o => ({ key: o[0], rule: o[1] })));
}

// 服务器绑定请求
serverBinder.addQueryRules({
    writeFile: {
        request: createEventRule({
            filePath: RuleType.string(),
            content: RuleType.string()
        }),
        response: createEventRule({
            ok: RuleType.boolean()
        })
    },
    traversalWriteJson: {
        request: createEventRule({
            filePath: RuleType.string(),
            deleteTree: RuleType.string(),
            json: RuleType.string()
        }),
        response: createEventRule({
            ok: RuleType.boolean()
        })
    },
    readFile: {
        request: createEventRule({
            filePath: RuleType.string(),
        }),
        response: createEventRule({
            exist: RuleType.boolean(),
            content: RuleType.string()
        })
    },
    sendBroadcast: {
        request: createEventRule({
            content: RuleType.string()
        }),
        response: createEventRule({
            ok: RuleType.boolean()
        })
    }
});

// 客户端绑定事件
clientBinder.addEventRules({
    fileChange: createEventRule({
        filePath: RuleType.string()
    }),
    broadcast: createEventRule({
        content: RuleType.string()
    })
});