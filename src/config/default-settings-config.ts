export type DefaultSettings = {
  rpcEndpoint: string;
  lyquidId: string;
  abi: string;
  buildMethod: string;
  deployMethod: string;
};

export const defaultSettings: DefaultSettings = {
  rpcEndpoint: "",
  lyquidId: "",
  abi: "[]",
  buildMethod: "",
  deployMethod: ""
};
