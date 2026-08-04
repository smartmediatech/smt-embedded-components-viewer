interface PageRequestMessageJson {
    page_id: string;
    meta?: Record<string, string>;
    request: number;
    complete: boolean;
}
export default class PageRequest {
    readonly id: string;
    readonly meta: Record<string, string> | undefined;
    readonly request: number;
    readonly complete: boolean;
    constructor(id: string, meta: Record<string, string> | undefined, request: number, complete: boolean);
    toJson(): PageRequestMessageJson;
    static isPageRequest(data: Record<string, any>): boolean;
    static from(data: Record<string, any>): PageRequest | undefined;
}
export {};
