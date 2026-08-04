export default class BridgeError extends Error {
    code: string;
    constructor(code: string, message: string);
    toJson(): Record<string, any>;
    static isError(data: Record<string, any>): boolean;
    static from(data: Record<string, any>): BridgeError | undefined;
}
