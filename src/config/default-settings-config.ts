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
  bartenderAddress: "",
  lyquidId: "",
  abi: "[]",
  buildMethod: "",
  deployMethod: ""
};
