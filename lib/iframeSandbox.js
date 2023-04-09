let sandboxScript = "!function(){\"use strict\";function e(e=2){var t=Math.floor(Date.now()).toString(36);for(let a=0;a<e;a++)t+=\"-\"+Math.floor(1e12*Math.random()).toString(36);return t}function t(t,a){let r=new Map;let n=function t(n){if(\"function\"==typeof n){let t={},s=e();return a.set(s,n),r.set(t,s),t}if(\"object\"==typeof n){if(Array.isArray(n))return n.map(t);{let e={};return Object.keys(n).forEach((a=>{e[a]=t(n[a])})),e}}return n}(t);return{result:n,fnMap:r}}const a=new FinalizationRegistry((({id:e,port:t})=>{t.postMessage({type:\"rF\",id:e})}));function r(r,n,s,i,o){let p=new Map;n.forEach(((r,n)=>{if(!p.has(r)){let n=(...a)=>new Promise(((n,p)=>{let l=t(a,i),d=e();i.set(d,n),o.set(d,p),s.postMessage({type:\"fn\",id:r,param:l.result,fnMap:l.fnMap.size>0?l.fnMap:void 0,cb:d})}));p.set(r,n),a.register(n,{id:r,port:s})}}));const l=e=>{if(\"object\"==typeof e){if(n.has(e))return p.get(n.get(e));if(Array.isArray(e))return e.map(l);{let t={};return Object.keys(e).forEach((a=>{t[a]=l(e[a])})),t}}return e};return{result:l(r)}}(()=>{let e=null,a=new Map,n=new Map;window.addEventListener(\"message\",(s=>{\"setMessagePort\"==s.data&&null==e&&(e=s.ports[0],Object.defineProperty(window,\"iframeSandbox\",{configurable:!1,writable:!1,value:{}}),e.addEventListener(\"message\",(async s=>{let i=s.data;switch(i.type){case\"execJs\":new Function(...i.paramList,i.js)(i.fnMap?r(i.param,i.fnMap,e,a,n).result:i.param);break;case\"fn\":if(a.has(i.id)){let s=i.fnMap?r(i.param,i.fnMap,e,a,n).result:i.param;try{let r=await a.get(i.id)(...s);if(i.cb){let n=t(r,a);e.postMessage({type:\"sol\",id:i.cb,param:[n.result],fnMap:n.fnMap.size>0?n.fnMap:void 0})}}catch(t){i.cb&&e.postMessage({type:\"rej\",id:i.cb,param:[t]})}}break;case\"rF\":a.delete(i.id);break;case\"sol\":{let t=i.fnMap?r(i.param,i.fnMap,e,a,n).result:i.param;a.has(i.id)&&a.get(i.id)(...t),a.delete(i.id),n.delete(i.id);break}case\"rej\":n.has(i.id)&&n.get(i.id)(...i.param),a.delete(i.id),n.delete(i.id)}})),e.start(),e.postMessage({type:\"ready\"}))})),window.addEventListener(\"load\",(e=>{console.log(\"sandbox onload\")}))})()}();";

/**
 * 生成唯一字符串
 * 基于毫秒级时间和随机数
 * 不保证安全性
 * @param {number} [randomSection] 随机节数量
 * @returns {string}
 */
function uniqueIdentifierString(randomSection = 2)
{
    var ret = Math.floor(Date.now()).toString(36);
    for (let i = 0; i < randomSection; i++)
        ret += "-" + Math.floor(Math.random() * 1e12).toString(36);
    return ret;
}

/**
 * 提取对象中的函数
 * @param {Object} obj
 * @param {Map<string, Function>} callbackMap
 */
function extractFunction(obj, callbackMap)
{
    let functionMap = new Map();

    /**
     * 遍历对象过滤函数
     * @param {any} now 
     * @returns {any}
     */
    function traversal(now)
    {
        if (typeof (now) == "function")
        {
            let ret = {};
            let functionId = uniqueIdentifierString();
            callbackMap.set(functionId, now);
            functionMap.set(ret, functionId);
            return ret;
        }
        else if (typeof (now) == "object")
        {
            if (Array.isArray(now))
            {
                return now.map(traversal);
            }
            else
            {
                let ret = {};
                Object.keys(now).forEach(key =>
                {
                    ret[key] = traversal(now[key]);
                });
                return ret;
            }
        }
        else
            return now;
    }
    let result = traversal(obj);

    return ({
        result: result,
        fnMap: functionMap
    });
}


const functionFinalizationRegistry = new FinalizationRegistry((/** @type {{ id: string, port: MessagePort }} */{ id, port }) =>
{
    port.postMessage({
        type: "rF",
        id: id
    });
});

/**
 * 将函数注入回对象
 * @param {Object} obj 
 * @param {Map<Object, string>} fnMap 
 * @param {MessagePort} port
 * @param {Map<string, Function>} callbackMap
 * @param {Map<string, Function>} callbackRejectMap
 */
function injectFunction(obj, fnMap, port, callbackMap, callbackRejectMap)
{
    /**
     * @type {Map<string, Function>}
     */
    let generatedFunctionMap = new Map();
    fnMap.forEach((id, functionObj) =>
    {
        if (!generatedFunctionMap.has(id))
        {
            let generatedFunction = (...param) =>
            {
                return new Promise((resolve, reject) =>
                {
                    let result = extractFunction(param, callbackMap);
                    let callbackId = uniqueIdentifierString();
                    callbackMap.set(callbackId, resolve);
                    callbackRejectMap.set(callbackId, reject);
                    port.postMessage({
                        type: "fn",
                        id: id,
                        param: result.result,
                        fnMap: (result.fnMap.size > 0 ? result.fnMap : undefined),
                        cb: callbackId
                    });
                });
            };
            generatedFunctionMap.set(id, generatedFunction);
            functionFinalizationRegistry.register(generatedFunction, {
                id: id,
                port: port
            });
        }
    });

    /**
     * 遍历对象嵌入函数
     * @param {any} now 
     * @returns {any}
     */
    const traversal = (now) =>
    {
        if (typeof (now) == "object")
        {
            if (fnMap.has(now))
            {
                return generatedFunctionMap.get(fnMap.get(now));
            }
            else if (Array.isArray(now))
            {
                return now.map(traversal);
            }
            else
            {
                let ret = {};
                Object.keys(now).forEach(key =>
                {
                    ret[key] = traversal(now[key]);
                });
                return ret;
            }
        }
        else
            return now;
    };
    let result = traversal(obj);

    return ({
        result: result
    });
}

/**
 * 事件处理器
 * 可以定多个事件响应函数
 * @template {*} T
 */
class EventHandler
{
    /**
     * 回调列表
     * @type {Array<function(T): void>}
     */
    cbList = [];
    /**
     * 单次回调列表
     * @type {Array<function(T): void>}
     */
    onceCbList = [];

    /**
     * 添加响应函数
     * @param {function(T): void} cb
     */
    add(cb)
    {
        this.cbList.push(cb);
    }

    /**
     * 添加单次响应函数
     * 触发一次事件后将不再响应
     * @param {function(T): void} cb
     */
    addOnce(cb)
    {
        this.onceCbList.push(cb);
    }

    /**
     * 移除响应函数
     * @param {function(T): void} cb
     */
    remove(cb)
    {
        let ind = this.cbList.indexOf(cb);
        if (ind > -1)
        {
            this.cbList.splice(ind, 1);
        }
        else
        {
            ind = this.onceCbList.indexOf(cb);
            if (ind > -1)
            {
                this.onceCbList.splice(ind, 1);
            }
        }
    }

    /**
     * 移除所有响应函数
     */
    removeAll()
    {
        this.cbList = [];
        this.onceCbList = [];
    }

    /**
     * 触发事件
     * @param {T} e
     */
    trigger(e)
    {
        this.cbList.forEach(o => { o(e); });
        this.onceCbList.forEach(o => { o(e); });
        this.onceCbList = [];
    }
}

/**
 * 沙箱上下文
 */
class SandboxContext
{
    /**
     * 沙箱iframe元素
     * @type {HTMLIFrameElement}
     */
    #iframe = null;

    /**
     * 与沙箱的通信端口
     * @type {MessagePort}
     */
    #port = null;

    /**
     * 沙箱可用
     * @type {boolean}
     */
    #available = false;

    /**
     * 沙箱可用事件
     * @type {EventHandler}
     */
    #availableEvent = new EventHandler();

    /**
     * 传递给沙箱的接口
     * @type {Object}
     */
    apiObj = {};

    /**
     * 回调映射
     * @type {Map<string, Function>}
     */
    #callbackMap = new Map();

    /**
     * 拒绝回调映射
     * @type {Map<string, Function>}
     */
    #callbackRejectMap = new Map();

    constructor()
    {
        if (!(("sandbox" in HTMLIFrameElement.prototype) && Object.hasOwn(HTMLIFrameElement.prototype, "contentDocument")))
            throw "sandbox property are not supported";
        let iframe = document.createElement("iframe");
        iframe.sandbox.add("allow-scripts");
        iframe.style.display = "none";
        iframe.srcdoc = ([
            "<!DOCTYPE html>",
            "<html>",

            "<head>",
            '<meta charset="utf-8" />',
            '<title>iframe sandbox</title>',
            '<meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no" />',
            "</head>",

            "<body>",
            "<script>",
            sandboxScript,
            "</script>",
            "</body>",

            "</html>"
        ]).join("");


        let channel = new MessageChannel();
        let port = channel.port1;
        port.addEventListener("message", async (e) =>
        {
            let data = e.data;
            switch (data.type)
            {
                case "ready": {
                    this.#available = true;
                    this.#availableEvent.trigger();
                    break;
                }
                case "fn": {
                    if (this.#callbackMap.has(data.id))
                    {
                        let param = (data.fnMap ? injectFunction(data.param, data.fnMap, port, this.#callbackMap, this.#callbackRejectMap).result : data.param);
                        try
                        {
                            let retValue = await this.#callbackMap.get(data.id)(...param);
                            if (data.cb)
                            {
                                let result = extractFunction(retValue, this.#callbackMap);
                                port.postMessage({
                                    type: "sol",
                                    id: data.cb,
                                    param: [result.result],
                                    fnMap: (result.fnMap.size > 0 ? result.fnMap : undefined)
                                });
                            }
                        }
                        catch (err)
                        {
                            if (data.cb)
                                port.postMessage({
                                    type: "rej",
                                    id: data.cb,
                                    param: [err]
                                });
                        }
                    }
                    break;
                }
                case "rF": {
                    this.#callbackMap.delete(data.id);
                    break;
                }
                case "sol": {
                    let param = (data.fnMap ? injectFunction(data.param, data.fnMap, port, this.#callbackMap, this.#callbackRejectMap).result : data.param);
                    if (this.#callbackMap.has(data.id))
                        this.#callbackMap.get(data.id)(...param);
                    this.#callbackMap.delete(data.id);
                    this.#callbackRejectMap.delete(data.id);
                    break;
                }
                case "rej": {
                    if (this.#callbackRejectMap.has(data.id))
                        this.#callbackRejectMap.get(data.id)(...data.param);
                    this.#callbackMap.delete(data.id);
                    this.#callbackRejectMap.delete(data.id);
                    break;
                }
            }
        });
        iframe.addEventListener("load", () =>
        {
            if (!this.#available)
            {
                if (iframe.contentDocument)
                    throw "sandbox isolation failed";
                port.start();
                iframe.contentWindow.postMessage("setMessagePort", "*", [channel.port2]); // 初始化通信管道
            }
        });


        document.body.appendChild(iframe);
        this.#iframe = iframe;
        this.#port = port;
    }

    /**
     * 等待沙箱可用
     * @returns {Promise<void>}
     */
    async waitAvailable()
    {
        return new Promise((resolve, reject) =>
        {
            if (this.#available)
                resolve();
            else
                this.#availableEvent.addOnce(resolve);
        });
    }

    /**
     * 执行js代码
     * @param {string} jsCodeStr
     * @returns {Promise<void>}
     */
    async execJs(jsCodeStr)
    {
        if (!this.#available)
            await this.waitAvailable();
        let result = extractFunction(this.apiObj, this.#callbackMap);
        this.#port.postMessage({
            type: "execJs",
            js: jsCodeStr,
            param: result.result,
            fnMap: (result.fnMap.size > 0 ? result.fnMap : undefined),
            paramList: ["api"]
        });
    }

    get iframe()
    {
        return this.#iframe;
    }
}

export { SandboxContext };
