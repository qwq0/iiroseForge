/**
 * 字典树
 */
export class Trie
{
    /**
     * 根节点
     */
    #root = new TrieNode();

    /**
     * 添加路径
     * @param {string} pathStr
     * @param {(restStr: string, srcStr: string) => any} callback
     */
    addPath(pathStr, callback)
    {
        this.#root.addPath(pathStr, 0, callback);
    }

    /**
     * 匹配前缀
     * @param {string} str
     * @returns {any}
     */
    matchPrefix(str)
    {
        return this.#root.matchPrefix(str, 0);
    }
}

/**
 * 字典树的节点
 */
class TrieNode
{
    /**
     * 子节点
     * @type {Map<string, TrieNode>}
     */
    #childs = new Map();

    /**
     * 回调函数
     * @type {(restStr: string, srcStr:string) => any}
     */
    #callback = null;

    /**
     * 添加路径
     * @param {string} pathStr
     * @param {number} pathInd
     * @param {(restStr: string, srcStr:string) => any} callback
     */
    addPath(pathStr, pathInd, callback)
    {
        if (pathInd >= pathStr.length)
        {
            this.#callback = callback;
        }
        else
        {
            let child = this.#childs.get(pathStr[pathInd]);
            if (child == undefined)
            {
                child = new TrieNode();
                this.#childs.set(pathStr[pathInd], child);
            }
            child.addPath(pathStr, pathInd + 1, callback);
        }
    }

    /**
     * 匹配前缀
     * @param {string} str
     * @param {number} strInd
     * @returns {any}
     */
    matchPrefix(str, strInd)
    {
        if (strInd >= str.length)
        {
            return this.#callback?.("", str);
        }
        else
        {
            let child = this.#childs.get(str[strInd]);
            if (child != undefined)
                return child.matchPrefix(str, strInd + 1);
            else
                return this.#callback?.(str.slice(strInd), str);
        }
    }
}