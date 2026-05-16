import type { NormalizedAbiMethod, ParsedAbi } from "@/types/abi";

export type RequestSenderContext = {
  rpcEndpoint: string;
  lyquidId?: string;
  accountAddress?: `0x${string}`;
  walletClient?: unknown;
  publicClient?: unknown;
  offChainFetch: typeof fetch;
};

export type SelectedMethodRequest = {
  parsedAbi: ParsedAbi;
  selectedMethod: string;
  args: unknown[];
  context: RequestSenderContext;
};

export type MethodSenderInput = {
  method: NormalizedAbiMethod;
  args: unknown[];
  context: RequestSenderContext;
};

export type MethodSender = (input: MethodSenderInput) => Promise<unknown>;
