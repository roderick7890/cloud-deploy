import { create } from "zustand";
import { persist } from "zustand/middleware";
import { artifactWorkspaceStorageKey, artifactWorkspaceVersion } from "@/config/storage-config";
import type { ArtifactSelection, ArtifactWorkspace } from "@/types/artifact-workspace";
import { buildDefaultArtifactWorkspaces, getInitialArtifactSelection } from "@/utils/artifact-workspace-utils";

type ArtifactWorkspaceState = {
  workspaces: ArtifactWorkspace[];
  selection: ArtifactSelection;
  setWorkspaces: (updater: ArtifactWorkspace[] | ((workspaces: ArtifactWorkspace[]) => ArtifactWorkspace[])) => void;
  setSelection: (selection: ArtifactSelection) => void;
};

function getInitialState() {
  const workspaces = buildDefaultArtifactWorkspaces();

  return {
    workspaces,
    selection: getInitialArtifactSelection(workspaces)
  };
}

function resolveWorkspaces(updater: ArtifactWorkspace[] | ((workspaces: ArtifactWorkspace[]) => ArtifactWorkspace[]), current: ArtifactWorkspace[]) {
  return typeof updater === "function" ? updater(current) : updater;
}

export const useArtifactWorkspaceStore = create<ArtifactWorkspaceState>()(
  persist(
    (set) => ({
      ...getInitialState(),
      setWorkspaces: (updater) =>
        set((state) => {
          const workspaces = resolveWorkspaces(updater, state.workspaces);
          const selectedWorkspace = workspaces.find((workspace) => workspace.id === state.selection.workspaceId);
          const selectedArtifact = selectedWorkspace?.artifacts.find((artifact) => artifact.id === state.selection.artifactId);

          return {
            workspaces,
            selection: selectedArtifact ? state.selection : getInitialArtifactSelection(workspaces)
          };
        }),
      setSelection: (selection) => set({ selection })
    }),
    {
      name: artifactWorkspaceStorageKey,
      version: artifactWorkspaceVersion,
      partialize: (state) => ({
        workspaces: state.workspaces,
        selection: state.selection
      }),
      onRehydrateStorage: () => (state) => {
        if (!state || state.workspaces.length > 0) {
          return;
        }

        const workspaces = buildDefaultArtifactWorkspaces();
        state.setWorkspaces(workspaces);
        state.setSelection(getInitialArtifactSelection(workspaces));
      }
    }
  )
);
