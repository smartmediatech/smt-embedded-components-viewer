import BridgeError from './bridge-error';
interface PageErrorMessageJson {
    page_id: string;
    meta?: Record<string, string>;
    error_code: string;
    error_message: string;
}
export default class PageError extends BridgeError {
    readonly id: string;
    readonly meta: Record<string, string> | undefined;
    constructor(id: string, meta: Record<string, string> | undefined, code: string, message: string);
    toJson(): PageErrorMessageJson;
    static isPageError(data: Record<string, any>): boolean;
    static from(data: Record<string, any>): PageError | undefined;
}
export declare const DefaultPageErrors: {
    UNKNOWN_PAGE_ID: (id: string, meta?: Record<string, string>) => PageError;
};
export {};
