import { BridgeConfig } from '../model/bridge-config';
import BaseBridge from '../base-bridge';
export default class ParentBridge extends BaseBridge {
    iframe: HTMLIFrameElement;
    constructor(iframe: HTMLIFrameElement, config: BridgeConfig);
    sendJsonMessage(message: Record<string, any>): void;
    dispose(): void;
}
