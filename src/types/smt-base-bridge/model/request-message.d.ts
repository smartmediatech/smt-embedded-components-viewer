import Message from './message';
interface RequestMessageJson {
    request_id: string;
    name: string;
    meta: Record<string, string> | undefined;
    payload: Record<string, any>;
}
export default class RequestMessage extends Message {
    toJson(): RequestMessageJson;
    static isRequest(data: Record<string, any>): boolean;
    static from(data: Record<string, any>): RequestMessage | undefined;
}
export {};
