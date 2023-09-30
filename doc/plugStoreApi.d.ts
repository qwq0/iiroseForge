export interface iiroseForgePlugStoreApi
{
    /**
     * 获取forge版本号
     */
    getForgeVersion(): Promise<string>;

    /**
     * 获取插件列表
     */
    getPlugList(): Promise<Array<{
        name: string,
        url: string
    }>>;

    /**
     * 安装插件
     * 不可使用此api更换已经安装的插件的url
     * @param name 插件名
     * @param url 插件url
     * @returns 0 成功, 1 用户拒绝, 2 插件已经安装
     */
    installPlug(name: string, url: string): Promise<number>;

    /**
     * 卸载插件
     * @param name 插件名
     * @returns 0 成功, 1 用户拒绝, 2 插件不存在
     */
    uninstallPlug(name: string): Promise<number>;
}