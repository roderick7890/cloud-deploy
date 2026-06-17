import { useState } from "react";
import { CircleHelp, Database, LoaderCircle } from "lucide-react";
import type { AbiParameter } from "viem";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { LyquidDeploymentArtifact } from "@/utils/lyquid-deployment-artifact";

type OciArtifactStepProps = {
  rpcEndpoint: string;
  bartenderAddress: string;
  repository: string;
  reference: string;
  artifact: LyquidDeploymentArtifact | null;
  isLoading?: boolean;
  isDeploying?: boolean;
  isFetchingBartender?: boolean;
  constructorValues?: Record<string, string>;
  onRpcEndpointChange: (value: string) => void;
  onBartenderAddressChange: (value: string) => void;
  onRepositoryChange: (value: string) => void;
  onReferenceChange: (value: string) => void;
  onFetchBartender: () => void;
  onLoad: () => void;
  onDeploy: (updateLyquidId?: string) => void;
  onConstructorValuesChange?: (values: Record<string, string>) => void;
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
  bartenderAddress,
  repository,
  reference,
  artifact,
  isLoading = false,
  isDeploying = false,
  isFetchingBartender = false,
  constructorValues = {},
  onRpcEndpointChange,
  onBartenderAddressChange,
  onRepositoryChange,
  onReferenceChange,
  onFetchBartender,
  onLoad,
  onDeploy,
  onConstructorValuesChange
}: OciArtifactStepProps) {
  const [updateLyquidId, setUpdateLyquidId] = useState("");
  const raw = getRawRecord(artifact);
  const manifestJson = jsonText(raw.manifest);
  const metadataJson = jsonText(raw.metadata);
  const contractAbiJson = artifact?.contractAbi ? jsonText(artifact.contractAbi) : "";
  const canDeploy = Boolean(artifact && bartenderAddress && !isLoading && !isDeploying);

  return (
    <div className="mx-auto flex w-full flex-col gap-5">
      <section className="flex flex-col gap-4 rounded-md border bg-card p-4">
        <div className="space-y-2">
          <div>
            <h2 className="text-base font-semibold">Workspace</h2>
            <p className="text-sm text-muted-foreground">Shared network settings for artifact loading and deployment.</p>
          </div>
          <div className="flex items-center justify-between gap-6">
            <div className="space-y-2 w-full">
              <Label htmlFor="oci-rpc-endpoint">RPC Endpoint</Label>
              <Input className="w-full" id="oci-rpc-endpoint" value={rpcEndpoint} onChange={(event) => onRpcEndpointChange(event.target.value)} />
            </div>
            <div className="space-y-2 w-full">
              <Label htmlFor="oci-bartender-address">Bartender Address</Label>
              <div className="flex gap-2">
                <Input
                  className="w-full"
                  id="oci-bartender-address"
                  value={bartenderAddress}
                  onChange={(event) => onBartenderAddressChange(event.target.value)}
                />
                <Button type="button" variant="outline" disabled={!rpcEndpoint || isFetchingBartender} onClick={onFetchBartender}>
                  {isFetchingBartender ? <LoaderCircle className="size-4 animate-spin" /> : null}
                  Fetch
                </Button>
              </div>
            </div>
          </div>
        </div>

        <hr className="my-4" />
        <div className="space-y-2">
          <div>
            <h2 className="text-base font-semibold">Artifact Reference</h2>
            <p className="text-sm text-muted-foreground">Repository and tag or digest inside this workspace.</p>
          </div>
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-4 flex-1">
              <div className="space-y-2 w-full">
                <Label htmlFor="oci-repository">Repository</Label>
                <Input className="w-full" id="oci-repository" value={repository} onChange={(event) => onRepositoryChange(event.target.value)} />
              </div>
              <div className="space-y-2 w-full">
                <Label htmlFor="oci-reference">Reference</Label>
                <Input className="w-full" id="oci-reference" value={reference} onChange={(event) => onReferenceChange(event.target.value)} />
              </div>
            </div>
            <Button type="button" className="sm:self-end" disabled={isLoading || !rpcEndpoint || !repository || !reference} onClick={onLoad}>
              {isLoading ? <LoaderCircle className="size-4 animate-spin" /> : <Database className="size-4" />}
              Load Artifact
            </Button>
          </div>
        </div>
      </section>

      {artifact ? (
        <div className="flex  gap-4">
          <section className="flex-2 flex flex-col gap-4 rounded-md border bg-card p-4">
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

          <section className="flex-1 flex flex-col gap-4 rounded-md border bg-card p-4 h-fit">
            <div className="space-y-2">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <Label htmlFor="oci-deployment-bytecode">Deployment Bytecode</Label>
                  {!bartenderAddress ? <p className="text-sm text-destructive">Bartender Address is required before deploy.</p> : null}
                </div>
              </div>
              <Textarea
                id="oci-deployment-bytecode"
                aria-label="Deployment Bytecode"
                value={artifact.deploymentBytecode}
                readOnly
                rows={12}
                className="w-full font-mono"
              />
              <div className="space-y-2 mt-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="oci-update-lyquid-id">Update to (optional)</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button className="size-6" type="button" variant="ghost" size="icon" aria-label="Explain update deployment">
                          <CircleHelp className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        Fill a Lyquid ID to update that existing Lyquid. Cloud Deploy uses the node update path, but does not verify this code matches the target. Check it yourself before deploying.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  className="w-full"
                  id="oci-update-lyquid-id"
                  value={updateLyquidId}
                  placeholder="Lyquid-*"
                  onChange={(event) => setUpdateLyquidId(event.target.value)}
                />
              </div>
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
                        className="w-full"
                        value={constructorValues[name] ?? ""}
                        placeholder={field.type}
                        onChange={(event) => onConstructorValuesChange?.({ ...constructorValues, [name]: event.target.value })}
                      />
                    </div>
                  );
                })}
              </div>
            ) : null}

            <div className="flex justify-end">
              <Button type="button" disabled={!canDeploy} onClick={() => onDeploy(updateLyquidId.trim() || undefined)} className="mt-4">
                {isDeploying ? "Deploying..." : "Deploy"}
              </Button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
