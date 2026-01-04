import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Check, Save } from "lucide-react";

import BasicInfoStep from "../components/process/BasicInfoStep";
import IstAnalysisStep from "../components/process/IstAnalysisStep";
import SollDefinitionStep from "../components/process/SollDefinitionStep";
import EffortEstimationStep from "../components/process/EffortEstimationStep";
import CostAnalysisStep from "../components/process/CostAnalysisStep";
import ROICalculationStep from "../components/process/ROICalculationStep";

const STEPS = [
  { id: 1, name: "Grunddaten", component: BasicInfoStep },
  { id: 2, name: "Ist-Analyse", component: IstAnalysisStep },
  { id: 3, name: "Soll-Zustand", component: SollDefinitionStep },
  { id: 4, name: "Ist-Kosten", component: CostAnalysisStep },
  { id: 5, name: "Aufwand", component: EffortEstimationStep },
  { id: 6, name: "ROI", component: ROICalculationStep },
];

export default function NewProcess() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [processId, setProcessId] = useState(null);
  const [saveStatus, setSaveStatus] = useState("saved");
  const [processData, setProcessData] = useState({
    process_name: "",
    customer_id: "",
    erfasser: "",
    erfassungsdatum: new Date().toISOString().split('T')[0],
    status: "Entwurf",
    ist_answers: {},
    soll_answers: {},
    soll_description: "",
    effort_details: {},
    ist_costs: {},
    roi_data: {},
  });

  const { data: consultants = [] } = useQuery({
    queryKey: ['consultants'],
    queryFn: async () => {
      try {
        return await base44.entities.Consultant.list();
      } catch (error) {
        console.error("Error loading consultants:", error);
        return [];
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Process.create(data),
    onSuccess: (result) => {
      setProcessId(result.id);
      queryClient.invalidateQueries({ queryKey: ['processes'] });
      setSaveStatus("saved");
    },
    onError: (error) => {
      console.error("Error creating process:", error);
      setSaveStatus("error");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Process.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processes'] });
      queryClient.invalidateQueries({ queryKey: ['process', processId] });
      setSaveStatus("saved");
    },
    onError: (error) => {
      console.error("Error updating process:", error);
      setSaveStatus("error");
    }
  });

  const handleAutoSave = async () => {
    if (!processData.process_name) return;

    setSaveStatus("saving");

    try {
      if (!processId) {
        await createMutation.mutateAsync(processData);
      } else {
        await updateMutation.mutateAsync({ id: processId, data: processData });
      }
    } catch (error) {
      console.error("Error in auto-save:", error);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      handleAutoSave();
    }, 1000);

    return () => clearTimeout(timer);
  }, [processData]);

  const updateProcessData = (updates) => {
    setProcessData((prev) => ({
      ...prev,
      ...updates,
    }));
    setSaveStatus("unsaved");
  };

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = () => {
    if (processId) {
      navigate(createPageUrl(`ProcessDetails?id=${processId}`));
    }
  };

  const CurrentStepComponent = STEPS[currentStep - 1].component;
  const progress = (currentStep / STEPS.length) * 100;

  const getSaveStatusBadge = () => {
    switch (saveStatus) {
      case "saving":
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Wird gespeichert...</Badge>;
      case "saved":
        return <Badge variant="outline" className="text-green-600 border-green-600">Gespeichert</Badge>;
      case "unsaved":
        return <Badge variant="outline" className="text-slate-600 border-slate-600">Nicht gespeichert</Badge>;
      case "error":
        return <Badge variant="outline" className="text-red-600 border-red-600">Fehler beim Speichern</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="p-6 md:p-8 pt-8 md:pt-10 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl("Dashboard"))}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              {processId ? "Prozess bearbeiten" : "Neuen Prozess erstellen"}
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Schritt {currentStep} von {STEPS.length}: {STEPS[currentStep - 1].name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {getSaveStatusBadge()}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm text-slate-600">
          {STEPS.map((step) => (
            <span
              key={step.id}
              className={`${
                step.id === currentStep ? "font-semibold text-blue-600" : ""
              } ${step.id < currentStep ? "text-green-600" : ""}`}
            >
              {step.name}
            </span>
          ))}
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{STEPS[currentStep - 1].name}</CardTitle>
        </CardHeader>
        <CardContent>
          <CurrentStepComponent
            data={processData}
            updateData={updateProcessData}
            consultants={consultants}
            processId={processId}
          />
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 1}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück
        </Button>

        {currentStep === STEPS.length ? (
          <Button onClick={handleFinish} className="gap-2">
            <Check className="w-4 h-4" />
            Abschließen
          </Button>
        ) : (
          <Button onClick={handleNext} className="gap-2">
            Weiter
            <ArrowRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}