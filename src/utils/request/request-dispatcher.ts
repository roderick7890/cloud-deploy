import { findMethod } from "@/utils/abi/abi-utils";
import { sendOffChainMethod } from "./off-chain-sender";
import { sendOnChainMethod } from "./on-chain-sender";
import type { MethodSender, SelectedMethodRequest } from "./request-types";

type DispatchSelectedMethodInput = SelectedMethodRequest & {
  onChainSender?: MethodSender;
  offChainSender?: MethodSender;
};

export async function dispatchSelectedMethod({
  parsedAbi,
  selectedMethod,
  args,
  context,
  onChainSender = sendOnChainMethod,
  offChainSender = sendOffChainMethod
}: DispatchSelectedMethodInput) {
  const method = findMethod(parsedAbi, selectedMethod);

  if (!method) {
    throw new Error("Selected method does not exist.");
  }

  const sender = method.transport === "off-chain" ? offChainSender : onChainSender;
  return sender({ method, args, context });
}
