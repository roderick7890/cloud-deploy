import type { Abi, AbiFunction } from "viem";

export type RequestTransport = "on-chain" | "off-chain";

export type NormalizedAbiMethod = {
  name: string;
  signature: string;
  transport: RequestTransport;
  abiItem: AbiFunction;
};

export type AbiMethodOption = {
  value: string;
  label: string;
  transport: RequestTransport;
};

export type ConstructorField = {
  name: string;
  type: string;
  internalType?: string;
};

export type ParsedAbi = {
  source: string;
  abi: Abi;
  methods: NormalizedAbiMethod[];
  constructorFields: ConstructorField[];
};
