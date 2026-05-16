export type DeployStepId = "upload" | "build" | "review" | "deploy";

export type DeployStep = {
  id: DeployStepId;
  label: string;
  description: string;
};

export type ProjectMetadata = {
  name: string;
  fileCount: number;
  totalSize: number;
};

export type ProjectTreeNode = {
  name: string;
  path: string;
  type: "directory" | "file";
  children?: ProjectTreeNode[];
};

export type ProjectTomlFile = {
  name: string;
  path: string;
  content: string;
  size: number;
};

export type UploadedProject = {
  metadata: ProjectMetadata;
  files: File[];
  rootName: string;
  tree: ProjectTreeNode[];
  tomlFiles: ProjectTomlFile[];
  selectedTomlPath: string;
};

export type DeploymentHashes = {
  sourceHash?: string;
  artifactHash?: string;
  constructorInputHash?: string;
  signedPayloadHash?: string;
};

export type BuildResult = {
  hashes: DeploymentHashes;
  logs: string[];
  payload?: unknown;
  raw: unknown;
};

export type ReviewPayload = {
  hashes: DeploymentHashes;
  payload: unknown;
};

export type DeployResult = {
  transactionHash?: string;
  lyquidId?: string;
  status?: string;
  signedPayloadHash?: string;
  raw: unknown;
};
