import Message from './message';
interface ResponseMessageJson {
    response_id: string;
    name: string;
    meta: Record<string, string> | undefined;
    payload: Record<string, string>;
}
export default class ResponseMessage extends Message {
    toJson(): ResponseMessageJson;
    static isResponse(data: Record<string, any>): boolean;
    static from(data: Record<string, any>): ResponseMessage | undefined;
}
export {};
