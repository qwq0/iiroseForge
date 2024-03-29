import { showNotice } from "../../ui/notice.js";
import { storageRoamingSave, storageRoamingSet } from "../storage.js";
import { localServiceClient } from "./LocalServiceClient.js";
import { clientBinder } from "./ruleBinder.js";

clientBinder.setEventListeners({
    fileChange: async (/** @type {{ filePath: string }} */e) =>
    {
        if (e.filePath == "roamingConfig.json")
        {
            let storageJson = (await localServiceClient.operator.query.readFile({
                filePath: "roamingConfig.json"
            })).content;
            if (storageJson)
            {
                let storageObj = JSON.parse(storageJson);
                storageRoamingSet(storageObj);
                storageRoamingSave(true);
                showNotice("forge本地服务", `漫游配置已更新`);
            }
        }
    },
    broadcast: () => { },
});