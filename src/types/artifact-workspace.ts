export type ArtifactSource = {
  id: string;
  repository: string;
  reference: string;
};

export type ArtifactWorkspace = {
  id: string;
  nodeHost: string;
  rpcEndpoint: string;
  wsEndpoint: string;
  artifacts: ArtifactSource[];
};

export type ArtifactSelection = {
  workspaceId: string;
  artifactId: string;
};
