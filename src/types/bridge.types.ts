// Bridge types for smt-base-bridge

export interface Bridge {
  addRequestHandler: (
    name: string,
    callback: (request: {
      id: string;
      name: string;
      meta: Record<string, string> | undefined;
      payload: Record<string, any>;
    }) => Promise<Record<string, any>>
  ) => void;
  removeRequestHandler: (name: string) => void;
  sendRequest: (name: string, payload: Record<string, any>) => Promise<Record<string, any>>;
}

