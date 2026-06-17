export type DefaultSettings = {
  rpcEndpoint: string;
  bartenderAddress: string;
  abi: string;
  buildMethod: string;
  deployMethod: string;
};

export const defaultSettings: DefaultSettings = {
  rpcEndpoint: "",
  bartenderAddress: "",
  abi: "[]",
  buildMethod: "",
  deployMethod: ""
};
