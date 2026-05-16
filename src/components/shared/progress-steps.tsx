import type { DeployStep, DeployStepId } from "@/types/deploy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

type ProgressStepsProps = {
  steps: DeployStep[];
  currentStep: DeployStepId;
  completedSteps: DeployStepId[];
  onStepBack: (step: DeployStepId) => void;
};

export function ProgressSteps({ steps, currentStep, completedSteps, onStepBack }: ProgressStepsProps) {
  const currentIndex = steps.findIndex((step) => step.id === currentStep);
  const progress = ((currentIndex + 1) / steps.length) * 100;

  return (
    <div className="space-y-4">
      <Progress value={progress} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = step.id === currentStep;
          return (
            <Button
              key={step.id}
              type="button"
              variant={isCurrent ? "default" : "outline"}
              disabled={index > currentIndex && !isCompleted}
              onClick={() => index < currentIndex && onStepBack(step.id)}
              className="h-auto min-h-toolbar flex-col items-start gap-2 text-left"
            >
              <span>{step.label}</span>
              <Badge variant={isCompleted ? "secondary" : "outline"}>{isCurrent ? "Current" : isCompleted ? "Done" : "Pending"}</Badge>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
