import { QwQSocketClient } from "../../../lib/qwqsocket.js";
import { clientBinder } from "./ruleBinder.js";
import { JSOBin } from "../../../lib/jsobin.js";
import { showNotice } from "../../ui/notice.js";
import "./listener.js";

let textDecoder = new TextDecoder("utf-8");
let jsobinContext = new JSOBin();

/**
 * 本地服务客户端
 * 用于连接forge本地服务
 */
export class LocalServiceClient
{
    /**
     * 本地服务的url
     */
    url = "ws://127.0.0.1:21909/forgeLocalServer";

    /**
     * qwqsocket客户端上下文
     * @type {QwQSocketClient}
     */
    client = null;

    /**
     * qwqsocket操作器上下文
     */
    operator = null;

    /**
     * websocket连接
     * @type {WebSocket}
     */
    socket = null;

    serviceAvailable = false;

    constructor()
    {
    }

    /**
     * 断开连接
     */
    close()
    {
        this.serviceAvailable = false;
        if (this.socket)
        {
            this.socket.close();
            this.socket = null;
        }
        if (this.client)
        {
            this.client.sendData.removeAll();
            this.client = null;
        }
        if (this.operator)
            this.operator = null;
    }

    /**
     * 等待连接
     * 如果未在连接则发起连接
     * @returns {Promise<void>}
     */
    waitConnect()
    {
        return new Promise(resolve =>
        {
            if (this.socket?.readyState == WebSocket.OPEN)
            {
                resolve();
                return;
            }

            if (this.socket == null || this.socket.readyState != WebSocket.CONNECTING)
            {
                this.connect();
            }
            this.socket.addEventListener("open", () =>
            {
                resolve();
            });
        });
    }

    /**
     * 连接或重连服务
     */
    connect()
    {
        showNotice("forge本地服务", `正在尝试与本地服务建立连接`);

        if (this.socket)
            this.socket.close();


        this.socket = new WebSocket(this.url);
        this.socket.binaryType = "arraybuffer";

        this.client = new QwQSocketClient();
        clientBinder.applyToInstance(this.client);
        this.client.sendData.add(e =>
        {
            if (this.socket)
                this.socket.send(e.prefix + "\0" + JSON.stringify(e.body));
        });
        this.operator = clientBinder.createOperator(this.client);

        this.socket.addEventListener("open", () =>
        {
            this.serviceAvailable = true;
        });
        this.socket.addEventListener("message", e =>
        {
            let rawData = e.data;
            try
            {
                if (typeof (rawData) == "object")
                {
                    let data = new Uint8Array(/** @type {ArrayBuffer} */(rawData));
                    let separatorIndex = data.indexOf(0);
                    if (this.client)
                    {
                        if (separatorIndex != -1)
                            this.client.receiveData(
                                textDecoder.decode(data.subarray(0, separatorIndex)),
                                jsobinContext.decode(data.subarray(separatorIndex + 1))
                            );
                        else
                            this.client.receiveData(
                                textDecoder.decode(data),
                                undefined
                            );
                    }
                    else
                        this.close();
                }
                else
                {
                    let data = rawData;
                    let separatorIndex = data.indexOf("\0");
                    if (this.client)
                    {
                        if (separatorIndex != -1)
                            this.client.receiveData(
                                data.slice(0, separatorIndex),
                                JSON.parse(data.slice(separatorIndex + 1))
                            );
                        else
                            this.client.receiveData(
                                data,
                                undefined
                            );
                    }
                    else
                        this.close();
                }
            }
            catch (err)
            {
                console.error("LocalServiceClient error:", err);
            }
        });

        this.socket.addEventListener("close", e =>
        {
            this.serviceAvailable = false;
            setTimeout(() =>
            {
                if (this.socket == null || this.socket.readyState == WebSocket.CLOSED)
                {
                    this.connect();
                }
            }, 10 * 1000);
        });
        this.socket.addEventListener("error", e =>
        {
            this.serviceAvailable = false;
            showNotice("forge本地服务", `与本地服务器的连接意外断开`);
        });
    }

}

export let localServiceClient = new LocalServiceClient();