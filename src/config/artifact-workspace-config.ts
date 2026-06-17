import type { ArtifactSource } from "@/types/artifact-workspace";

export const defaultArtifactSources: ArtifactSource[] = [
  {
    id: "cloud-deploy-latest",
    repository: "lyquids/cloud-deploy",
    reference: "latest"
  },
  {
    id: "local-latest",
    repository: "lyquids/local",
    reference: "latest"
  }
];
