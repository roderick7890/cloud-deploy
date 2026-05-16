import type { Abi, AbiFunction } from "viem";
import type { AbiMethodOption, ConstructorField, NormalizedAbiMethod, ParsedAbi, RequestTransport } from "@/types/abi";

type AbiItemWithTransport = AbiFunction & {
  "x-lyquid-transport"?: RequestTransport;
  xLyquidTransport?: RequestTransport;
};

type AbiConstructorItem = {
  type: "constructor";
  inputs?: Array<{
    name?: string;
    type: string;
    internalType?: string;
  }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAbiFunction(item: unknown): item is AbiFunction {
  return isRecord(item) && item.type === "function" && typeof item.name === "string";
}

function isAbiConstructor(item: unknown): item is AbiConstructorItem {
  return isRecord(item) && item.type === "constructor";
}

function inputSignature(item: AbiFunction) {
  const inputs = item.inputs ?? [];
  return inputs.map((input) => input.type).join(",");
}

function methodSignature(item: AbiFunction) {
  return `${item.name}(${inputSignature(item)})`;
}

function normalizeTransport(value: unknown): RequestTransport | undefined {
  if (value === "on-chain" || value === "off-chain") {
    return value;
  }

  return undefined;
}

export function resolveMethodTransport(method: NormalizedAbiMethod | AbiFunction): RequestTransport {
  if ("transport" in method) {
    return method.transport;
  }

  const item = method as AbiItemWithTransport;
  return normalizeTransport(item["x-lyquid-transport"]) ?? normalizeTransport(item.xLyquidTransport) ?? "on-chain";
}

export function parseAbiSource(source: string): ParsedAbi {
  let parsed: unknown;

  try {
    parsed = JSON.parse(source);
  } catch {
    throw new Error("Invalid ABI JSON");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("Invalid ABI JSON");
  }

  const abi = parsed as Abi;
  const methods = abi.filter(isAbiFunction).map<NormalizedAbiMethod>((item) => ({
    name: item.name,
    signature: methodSignature(item),
    transport: resolveMethodTransport(item),
    abiItem: item
  }));

  const constructor = parsed.find(isAbiConstructor);
  const constructorFields: ConstructorField[] = (constructor?.inputs ?? []).map((input, index) => ({
    name: input.name || `arg${index}`,
    type: input.type,
    internalType: input.internalType
  }));

  return {
    source,
    abi,
    methods,
    constructorFields
  };
}

export function getMethodOptions(parsed: ParsedAbi): AbiMethodOption[] {
  return parsed.methods.map((method) => ({
    value: method.signature,
    label: method.signature,
    transport: method.transport
  }));
}

export function getConstructorFields(parsed: ParsedAbi): ConstructorField[] {
  return parsed.constructorFields;
}

export function methodExists(parsed: ParsedAbi, selectedMethod: string) {
  return parsed.methods.some((method) => method.signature === selectedMethod);
}

export function findMethod(parsed: ParsedAbi, selectedMethod: string) {
  return parsed.methods.find((method) => method.signature === selectedMethod);
}
