import type { ArtifactSource } from "@/types/artifact-workspace";

export const defaultArtifactSources: ArtifactSource[] = [
  {
    id: "local-latest",
    repository: "lyquids/local",
    reference: "latest"
  }
];
