export type HostedNodeDomain = {
  suffix: string;
  protocol: "https:";
};

export const hostedNodeDomains: HostedNodeDomain[] = [
  {
    suffix: "devnet-alpha.lyquor.dev",
    protocol: "https:"
  }
];
