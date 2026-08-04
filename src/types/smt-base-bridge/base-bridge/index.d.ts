import BridgeError from '../model/bridge-error';
import RequestMessage from '../model/request-message';
import Page from '../model/page';
import { BridgeConfig } from '../model/bridge-config';
interface MessageHandler {
    resolve: (data: Record<string, any>) => void;
    reject: (error: BridgeError) => void;
}
interface PageOutHandler {
    send: (page: number) => void;
}
export default abstract class BaseBridge {
    config: BridgeConfig;
    messages: Record<string, MessageHandler>;
    outPages: Record<string, PageOutHandler>;
    inPages: Record<string, Page[]>;
    requestHandlers: Record<string, (request: RequestMessage) => Promise<Record<string, any>>>;
    constructor(config: BridgeConfig);
    onReceiveMessage: (event: MessageEvent) => void;
    sendResponse(originalRequest: RequestMessage, payload: Record<string, any>): void;
    sendRequest(name: string, payload: Record<string, any>): Promise<Record<string, any>>;
    processMessage(data: Record<string, any>): Promise<void>;
    abstract sendJsonMessage(message: Record<string, any>): void;
    private sendPages;
    addRequestHandler: (name: string, callback: (request: RequestMessage) => Promise<Record<string, any>>) => void;
    removeRequestHandler: (name: string) => void;
}
export {};
