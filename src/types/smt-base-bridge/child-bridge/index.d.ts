import { BridgeConfig } from '../model/bridge-config';
import BaseBridge from '../base-bridge';
export default class ChildBridge extends BaseBridge {
    constructor(config: BridgeConfig);
    sendJsonMessage(message: Record<string, any>): void;
}
