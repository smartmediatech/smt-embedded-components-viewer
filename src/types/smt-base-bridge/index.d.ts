import { BridgeConfig } from './model/bridge-config';
import BridgeError from './model/bridge-error';
import ChildBridge from './child-bridge';
import ParentBridge from './parent-bridge';
export { BridgeError, ChildBridge, ParentBridge };
export type { BridgeConfig };
export type SMTBaseBridge = {
    BridgeError: typeof BridgeError;
    ChildBridge: typeof ChildBridge;
    ParentBridge: typeof ParentBridge;
};


declare global {
  interface Window {
    SMTBaseBridge?: SMTBaseBridge;
  }
}
