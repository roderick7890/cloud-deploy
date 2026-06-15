export type DefaultSettings = {
  rpcEndpoint: string;
  bartenderAddress: string;
  lyquidId: string;
  abi: string;
  buildMethod: string;
  deployMethod: string;
};

export const defaultSettings: DefaultSettings = {
  rpcEndpoint: "",
  bartenderAddress: "0x0000000000000000000000000000000000000001",
  lyquidId: "",
  abi: "[]",
  buildMethod: "",
  deployMethod: ""
};
