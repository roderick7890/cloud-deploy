import { OciArtifactStep } from "@/components/oci-artifact-step";
import type { ArtifactSource } from "@/types/artifact-workspace";
import type { LyquidDeploymentArtifact } from "@/utils/lyquid-deployment-artifact";

type ArtifactDeploySurfaceProps = {
  source: ArtifactSource;
  rpcEndpoint: string;
  bartenderAddress: string;
  artifact: LyquidDeploymentArtifact | null;
  isLoading: boolean;
  isDeploying: boolean;
  isFetchingBartender: boolean;
  pushCommand: string;
  constructorValues: Record<string, string>;
  onRpcEndpointChange: (value: string) => void;
  onBartenderAddressChange: (value: string) => void;
  onRepositoryChange: (value: string) => void;
  onReferenceChange: (value: string) => void;
  onFetchBartender: () => void;
  onLoad: () => void;
  onDeploy: (updateLyquidId?: string) => void;
  onConstructorValuesChange: (values: Record<string, string>) => void;
};

export function ArtifactDeploySurface({
  source,
  rpcEndpoint,
  bartenderAddress,
  artifact,
  isLoading,
  isDeploying,
  isFetchingBartender,
  pushCommand,
  constructorValues,
  onRpcEndpointChange,
  onBartenderAddressChange,
  onRepositoryChange,
  onReferenceChange,
  onFetchBartender,
  onLoad,
  onDeploy,
  onConstructorValuesChange
}: ArtifactDeploySurfaceProps) {
  return (
    <OciArtifactStep
      rpcEndpoint={rpcEndpoint}
      bartenderAddress={bartenderAddress}
      repository={source.repository}
      reference={source.reference}
      artifact={artifact}
      isLoading={isLoading}
      isDeploying={isDeploying}
      isFetchingBartender={isFetchingBartender}
      pushCommand={pushCommand}
      onRpcEndpointChange={onRpcEndpointChange}
      onBartenderAddressChange={onBartenderAddressChange}
      onFetchBartender={onFetchBartender}
      onRepositoryChange={onRepositoryChange}
      onReferenceChange={onReferenceChange}
      onLoad={onLoad}
      onDeploy={onDeploy}
      constructorValues={constructorValues}
      onConstructorValuesChange={onConstructorValuesChange}
    />
  );
}
