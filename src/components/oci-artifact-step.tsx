import { Database, LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";
import type { AbiParameter } from "viem";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { LyquidDeploymentArtifact } from "@/utils/lyquid-deployment-artifact";

type OciArtifactStepProps = {
  rpcEndpoint: string;
  repository: string;
  reference: string;
  artifact: LyquidDeploymentArtifact | null;
  isLoading?: boolean;
  constructorValues?: Record<string, string>;
  onRpcEndpointChange: (value: string) => void;
  onRepositoryChange: (value: string) => void;
  onReferenceChange: (value: string) => void;
  onLoad: () => void;
  onConstructorValuesChange?: (values: Record<string, string>) => void;
  actions?: ReactNode;
};

function jsonText(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2);
}

function getFieldName(field: AbiParameter, index: number) {
  return "name" in field && typeof field.name === "string" && field.name.length > 0 ? field.name : `arg${index}`;
}

function getRawRecord(artifact: LyquidDeploymentArtifact | null) {
  return artifact?.raw && typeof artifact.raw === "object" ? (artifact.raw as Record<string, unknown>) : {};
}

export function OciArtifactStep({
  rpcEndpoint,
  repository,
  reference,
  artifact,
  isLoading = false,
  constructorValues = {},
  onRpcEndpointChange,
  onRepositoryChange,
  onReferenceChange,
  onLoad,
  onConstructorValuesChange,
  actions
}: OciArtifactStepProps) {
  const raw = getRawRecord(artifact);
  const manifestJson = jsonText(raw.manifest);
  const metadataJson = jsonText(raw.metadata);
  const contractAbiJson = artifact?.contractAbi ? jsonText(artifact.contractAbi) : "";

  return (
    <div className="mx-auto flex w-full flex-col gap-6">
      <div className="grid gap-4 rounded-md border bg-card p-4 md:grid-cols-[1.2fr_1fr_1fr_auto] md:items-end">
        <div className="space-y-2">
          <Label htmlFor="oci-rpc-endpoint">RPC Endpoint</Label>
          <Input id="oci-rpc-endpoint" value={rpcEndpoint} onChange={(event) => onRpcEndpointChange(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="oci-repository">Repository</Label>
          <Input id="oci-repository" value={repository} onChange={(event) => onRepositoryChange(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="oci-reference">Reference</Label>
          <Input id="oci-reference" value={reference} onChange={(event) => onReferenceChange(event.target.value)} />
        </div>
        <Button type="button" className="md:self-end" disabled={isLoading || !rpcEndpoint || !repository || !reference} onClick={onLoad}>
          {isLoading ? <LoaderCircle className="size-4 animate-spin" /> : <Database className="size-4" />}
          Load Artifact
        </Button>
      </div>

      {artifact ? (
        <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <section className="flex flex-col gap-4 rounded-md border bg-card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{artifact.name}</p>
              <Badge variant="outline">{artifact.repoHint}</Badge>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-md border bg-background p-3">
                <p className="text-caption text-muted-foreground">imageHash</p>
                <p className="break-all font-mono text-sm">{artifact.imageHash}</p>
              </div>
              <div className="rounded-md border bg-background p-3">
                <p className="text-caption text-muted-foreground">constructor</p>
                <p className="break-all font-mono text-sm">{artifact.abiStr || "()"}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="oci-manifest-json">Manifest JSON</Label>
              <Textarea id="oci-manifest-json" aria-label="Manifest JSON" value={manifestJson} readOnly rows={12} className="w-full font-mono" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="oci-metadata-json">Metadata JSON</Label>
              <Textarea id="oci-metadata-json" aria-label="Metadata JSON" value={metadataJson} readOnly rows={10} className="w-full font-mono" />
            </div>
          </section>

          <section className="flex flex-col gap-4 rounded-md border bg-card p-4">
            <div className="space-y-2">
              <Label htmlFor="oci-deployment-bytecode">Deployment Bytecode</Label>
              <Textarea
                id="oci-deployment-bytecode"
                aria-label="Deployment Bytecode"
                value={artifact.deploymentBytecode}
                readOnly
                rows={12}
                className="w-full font-mono"
              />
            </div>

            {contractAbiJson ? (
              <div className="space-y-2">
                <Label htmlFor="oci-contract-abi">Contract ABI</Label>
                <Textarea id="oci-contract-abi" value={contractAbiJson} readOnly rows={8} className="w-full font-mono" />
              </div>
            ) : null}

            {artifact.constructorParameters.length > 0 ? (
              <div className="space-y-3">
                <p className="font-medium">Constructor</p>
                {artifact.constructorParameters.map((field, index) => {
                  const name = getFieldName(field, index);

                  return (
                    <div key={`${name}:${field.type}`} className="space-y-1">
                      <Label htmlFor={`oci-constructor-${name}`}>{name}</Label>
                      <Input
                        id={`oci-constructor-${name}`}
                        value={constructorValues[name] ?? ""}
                        placeholder={field.type}
                        onChange={(event) => onConstructorValuesChange?.({ ...constructorValues, [name]: event.target.value })}
                      />
                    </div>
                  );
                })}
              </div>
            ) : null}
          </section>
        </div>
      ) : null}

      {actions}
    </div>
  );
}
