import type { DeployStep } from "@/types/deploy";

export const deploySteps: DeployStep[] = [
  { id: "upload", label: "Upload", description: "Select a Lyquid project source." },
  { id: "build", label: "Build", description: "Run the ABI-selected build method." },
  { id: "review", label: "Review", description: "Inspect deployment evidence and payload." },
  { id: "deploy", label: "Deploy", description: "Submit create or update deployment." }
];
