import { create } from "zustand";
import type { BuildResult, DeployResult, DeployStepId, ReviewPayload, UploadedProject } from "@/types/deploy";

type DeploySessionState = {
  currentStep: DeployStepId;
  uploadedProject: UploadedProject | null;
  buildResult: BuildResult | null;
  reviewPayload: ReviewPayload | null;
  deployResult: DeployResult | null;
  currentError: string | null;
  setUploadedProject: (project: UploadedProject) => void;
  setBuildResult: (result: BuildResult) => void;
  setReviewPayload: (payload: ReviewPayload) => void;
  setDeployResult: (result: DeployResult) => void;
  setCurrentError: (error: string | null) => void;
  goToStep: (step: DeployStepId) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  resetSession: () => void;
};

const stepOrder: DeployStepId[] = ["upload", "build", "review", "deploy"];

const initialState = {
  currentStep: "upload" as DeployStepId,
  uploadedProject: null,
  buildResult: null,
  reviewPayload: null,
  deployResult: null,
  currentError: null
};

function nextStep(currentStep: DeployStepId) {
  return stepOrder[Math.min(stepOrder.indexOf(currentStep) + 1, stepOrder.length - 1)];
}

function previousStep(currentStep: DeployStepId) {
  return stepOrder[Math.max(stepOrder.indexOf(currentStep) - 1, 0)];
}

export const useDeploySessionStore = create<DeploySessionState>()((set) => ({
  ...initialState,
  setUploadedProject: (project) =>
    set({
      uploadedProject: project,
      buildResult: null,
      reviewPayload: null,
      deployResult: null,
      currentError: null
    }),
  setBuildResult: (result) =>
    set({
      buildResult: result,
      reviewPayload: {
        hashes: result.hashes,
        payload: result.payload ?? result.raw
      },
      deployResult: null,
      currentError: null,
      currentStep: "review"
    }),
  setReviewPayload: (payload) =>
    set({
      reviewPayload: payload,
      deployResult: null,
      currentError: null
    }),
  setDeployResult: (result) =>
    set({
      deployResult: result,
      currentError: null,
      currentStep: "review"
    }),
  setCurrentError: (error) => set({ currentError: error }),
  goToStep: (step) => set({ currentStep: step }),
  goToNextStep: () => set((state) => ({ currentStep: nextStep(state.currentStep) })),
  goToPreviousStep: () => set((state) => ({ currentStep: previousStep(state.currentStep) })),
  resetSession: () => set(initialState)
}));
