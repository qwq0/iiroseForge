export interface iiroseForgeApi
{
    applyPermission(operationList: Array<string>, eventList: Array<string>): Promise<boolean>;

    showForgeNotice(content: string, callback?: Function): Promise<void>;
    getUserName(): Promise<string>;
    getUserUid(): Promise<string>;
    getUserRoomId(): Promise<string>;
    getUserProfilePictureUrl(): Promise<string>;
    getUserInputColor(): Promise<string>;
    sendRoomMessage(content: string): Promise<void>;
    sendRoomForgePacket(content: Object): Promise<void>;
    sendPrivateMessageSilence(targetUid: string, content: string): Promise<void>;
    sendPrivateMessage(targetUid: string, content: string): Promise<void>;
    sendSelfPrivateMessageSilence(content: string): Promise<void>;
    giveALike(targetUid: string, content?: string): Promise<void>;
    switchRoom(roomId: string): Promise<void>;

    addEventListener(name: "roomMessage", callback: (e: { senderId: string, senderName: string, content: string; }) => void): Promise<void>;
    addEventListener(name: "roomForgePacket", callback: (e: { senderId: string, senderName: string, content: Object; }) => void): Promise<void>;
    addEventListener(name: "privateMessage", callback: (e: { senderId: string, senderName: string, content: string; }) => void): Promise<void>;
    addEventListener(name: "selfPrivateMessage", callback: (e: { content: string; }) => void): Promise<void>;
}