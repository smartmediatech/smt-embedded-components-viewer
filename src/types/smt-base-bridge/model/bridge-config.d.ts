export interface ParentBridgeConfig {
    meta?: Record<string, string>;
    origin: string;
}
export interface BridgeConfig {
    meta?: Record<string, string>;
    origin?: string;
    native?: {
        ios?: {
            bridgeName: string;
        };
        android?: {
            bridgeName: string;
        };
    };
}
export type ParentType = 'web' | 'ios' | 'android' | 'unknown';
