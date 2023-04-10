interface iiroseForgeApi
{
    applyPermission(operationList: Array<string>, eventList: Array<string>): Promise<boolean>;

    getUserName(): Promise<string>;
    getUserUid(): Promise<string>;
    getUserRoomId(): Promise<string>;
    getUserProfilePictureUrl(): Promise<string>;
    getUserInputColor(): Promise<string>;
    sendRoomMessage(content: string): Promise<void>;
    sendPrivateMessageSilence(targetUid: string, context: string): Promise<void>;
    sendPrivateMessage(targetUid: string, context: string): Promise<void>;
    sendSelfPrivateMessageSilence(context: string): Promise<void>;
    giveALike(targetUid: string, [content]: string): Promise<void>;
    switchRoom(roomId: string): Promise<void>;

    addEventListener(name: "roomMessage", callback: Function): Promise<void>;
    addEventListener(name: "privateMessage", callback: Function): Promise<void>;
    addEventListener(name: "selfPrivateMessage", callback: Function): Promise<void>;
}