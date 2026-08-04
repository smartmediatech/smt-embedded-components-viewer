export default class Message {
    readonly id: string;
    readonly name: string;
    readonly meta: Record<string, string> | undefined;
    readonly payload: Record<string, any> | undefined;
    constructor(id: string, name: string, meta: Record<string, string> | undefined, payload: Record<string, any>);
}
