import { ParentBridgeConfig } from '../model/bridge-config';
import BaseBridge from '../base-bridge';
export default class ParentBridge extends BaseBridge {
    iframe: HTMLIFrameElement;
    onChildMessage: (event: MessageEvent) => void;
    constructor(iframe: HTMLIFrameElement, config: ParentBridgeConfig);
    sendJsonMessage(message: Record<string, any>): void;
    dispose(): void;
}
