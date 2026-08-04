interface PageJson {
    page_id: string;
    meta: Record<string, string> | undefined;
    data: string;
    pages: number;
    current: number;
}
export default class Page {
    readonly id: string;
    readonly meta: Record<string, string> | undefined;
    readonly data: string;
    readonly pages: number;
    readonly current: number;
    constructor(id: string, meta: Record<string, string> | undefined, data: string, pages: number, current: number);
    static createPages(id: string, meta: Record<string, string> | undefined, message: Record<string, any>): Page[];
    static createJsonFromPages(pages: Page[]): Record<string, any>;
    static isPage(data: Record<string, any>): boolean;
    static from(data: Record<string, any>): Page | undefined;
    toJson(): PageJson;
}
export {};
