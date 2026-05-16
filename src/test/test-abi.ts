export const lyquidTestAbi = JSON.stringify([
  {
    type: "constructor",
    inputs: [
      { name: "owner", type: "address", internalType: "address" },
      { name: "limit", type: "uint256", internalType: "uint256" }
    ]
  },
  {
    type: "function",
    name: "compileProject",
    stateMutability: "nonpayable",
    inputs: [{ name: "source", type: "bytes", internalType: "bytes" }],
    outputs: [{ name: "artifactHash", type: "bytes32", internalType: "bytes32" }]
  },
  {
    type: "function",
    name: "publishProject",
    stateMutability: "payable",
    inputs: [{ name: "payload", type: "bytes", internalType: "bytes" }],
    outputs: [{ name: "lyquidId", type: "string", internalType: "string" }]
  },
  {
    type: "function",
    name: "prepareProject",
    stateMutability: "view",
    inputs: [{ name: "sourceHash", type: "bytes32", internalType: "bytes32" }],
    outputs: [{ name: "payload", type: "bytes", internalType: "bytes" }],
    "x-lyquid-transport": "off-chain"
  }
]);
