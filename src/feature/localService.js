import { localServiceClient } from "../storage/localService/LocalServiceClient.js";
import { storageContext } from "../storage/storage.js";

/**
 * 启动本地服务
 */
export function enableLocalService()
{
    let url = storageContext.local.localServiceUrl;
    if (url.at(-1) == "/")
        url = url.slice(0, -1);
    url += "/forgeLocalServer";
    
    localServiceClient.url = url;
    localServiceClient.connect();
}