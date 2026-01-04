import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl, formatCurrency } from "@/components/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, TrendingUp, DollarSign, Target, Trash2, Edit, Save, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import BasicInfoStep from "../components/process/BasicInfoStep";
import IstAnalysisStep from "../components/process/IstAnalysisStep";
import SollDefinitionStep from "../components/process/SollDefinitionStep";
import EffortEstimationStep from "../components/process/EffortEstimationStep";
import CostAnalysisStep from "../components/process/CostAnalysisStep";
import ROICalculationStep from "../components/process/ROICalculationStep";
import ProcessVisualization from "../components/process/ProcessVisualization";
import RequirementsSpecification from "../components/process/RequirementsSpecification";
import Base44Input from "../components/process/Base44Input";
import BPMNExport from "../components/process/BPMNExport";
import ProcessPresentations from "../components/process/ProcessPresentations";

export default function ProcessDetails() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const processId = urlParams.get('id');
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState(null);
  const [showSyncMessage, setShowSyncMessage] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const { data: process, isLoading, error } = useQuery({
    queryKey: ['process', processId],
    queryFn: async () => {
      if (!processId) return null;
      try {
        const processes = await base44.entities.Process.list();
        return processes.find(p => p.id === processId);
      } catch (err) {
        console.error("Error loading process:", err);
        throw new Error("Prozess konnte nicht geladen werden.");
      }
    },
    enabled: !!processId,
  });

  const { data: kundenstamm = [] } = useQuery({
    queryKey: ['kundenstamm'],
    queryFn: async () => {
      try {
        return await base44.entities.Kundenstamm.list();
      } catch (error) {
        console.error("Error loading kundenstamm:", error);
        return [];
      }
    },
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

  const { data: processStatuses = [] } = useQuery({
    queryKey: ['processStatuses'],
    queryFn: () => base44.entities.ProcessStatus.list('sort_order'),
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      try {
        // Validiere und bereinige die Daten
        const cleanedData = {
          ...data,
          ist_answers: {
            ...data.ist_answers,
            interfaces: Array.isArray(data.ist_answers?.interfaces) ? data.ist_answers.interfaces : [],
            ist_files: Array.isArray(data.ist_answers?.ist_files) ? data.ist_answers.ist_files : []
          },
          soll_answers: {
            ...data.soll_answers,
            new_interfaces: Array.isArray(data.soll_answers?.new_interfaces) ? data.soll_answers.new_interfaces : [],
            soll_files: Array.isArray(data.soll_answers?.soll_files) ? data.soll_answers.soll_files : []
          },
          roi_data: data.roi_data || {},
          effort_details: data.effort_details || {},
          ist_costs: data.ist_costs || {},
          specification_files: Array.isArray(data.specification_files) ? data.specification_files : [],
          lastenheft_uploaded_files: Array.isArray(data.lastenheft_uploaded_files) ? data.lastenheft_uploaded_files : [],
          base44_specifications: Array.isArray(data.base44_specifications) ? data.base44_specifications : [],
          bpmn_files: Array.isArray(data.bpmn_files) ? data.bpmn_files : [],
          presentations_files: Array.isArray(data.presentations_files) ? data.presentations_files : []
        };

        // Berechne Gesamtkosten aus Aufwand
        const totalHours = 
          (cleanedData.effort_details?.conception_hours || 0) +
          (cleanedData.effort_details?.development_hours || 0) +
          (cleanedData.effort_details?.testing_hours || 0) +
          (cleanedData.effort_details?.deployment_hours || 0);
        
        const hourlyRate = cleanedData.effort_details?.hourly_rate_at_estimation || 0;
        const totalCost = totalHours * hourlyRate;

        // Übertrage in ROI Investitionskosten
        cleanedData.roi_data = {
          ...cleanedData.roi_data,
          investment_cost: totalCost > 0 ? totalCost : (cleanedData.roi_data?.investment_cost || 0)
        };

        // Prüfe Datengröße (grobe Schätzung)
        const dataString = JSON.stringify(cleanedData);
        const dataSizeInMB = new Blob([dataString]).size / (1024 * 1024);
        
        console.log('Datengröße:', dataSizeInMB.toFixed(2), 'MB');
        
        if (dataSizeInMB > 10) {
          throw new Error('Die Datenmenge ist zu groß (>10MB). Bitte reduzieren Sie die Anzahl oder Größe der hochgeladenen Dateien.');
        }

        console.log('Speichere Prozess mit bereinigten Daten...');
        const result = await base44.entities.Process.update(processId, cleanedData);
        console.log('Prozess erfolgreich gespeichert');
        return result;
      } catch (error) {
        console.error('Fehler beim Speichern:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['process', processId] });
      queryClient.invalidateQueries({ queryKey: ['processes'] });
      queryClient.refetchQueries({ queryKey: ['processes'] });
      
      setIsEditing(false);
      setEditedData(null);
      
      setShowSyncMessage(true);
      setTimeout(() => {
        setShowSyncMessage(false);
      }, 3000);
    },
    onError: (error) => {
      console.error("Error updating process:", error);
      
      let errorMessage = 'Fehler beim Speichern.';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.toString().includes('Network Error')) {
        errorMessage = 'Netzwerkfehler: Die Daten sind möglicherweise zu groß. Bitte reduzieren Sie die Anzahl hochgeladener Dateien oder versuchen Sie es später erneut.';
      } else if (error.toString().includes('Failed to fetch')) {
        errorMessage = 'Verbindungsfehler: Bitte überprüfen Sie Ihre Internetverbindung.';
      }
      
      alert(errorMessage);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Process.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processes'] });
      navigate(createPageUrl("Dashboard"));
    },
    onError: (error) => {
      console.error("Error deleting process:", error);
      alert('Fehler beim Löschen. Bitte versuchen Sie es erneut.');
    }
  });

  const handleEdit = () => {
    setEditedData(process);
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync(editedData);
    } catch (error) {
      // The onError handler of useMutation will display the alert
      console.error('Fehler beim Speichern in handleSave:', error);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedData(null);
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(processId);
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
    }
  };

  const updateEditedData = (updates) => {
    setEditedData(prev => ({
      ...prev,
      ...updates
    }));
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 pt-8 md:pt-10">
        <Skeleton className="h-12 w-64 mb-6" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !process) {
    return (
      <div className="p-6 md:p-8 pt-8 md:pt-10">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error ? error.message : "Prozess konnte nicht gefunden werden. Bitte versuchen Sie es erneut."}
          </AlertDescription>
        </Alert>
        <Button onClick={() => navigate(createPageUrl("Dashboard"))} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zurück zum Dashboard
        </Button>
      </div>
    );
  }

  const displayData = isEditing ? editedData : process;
  const getStatusColor = (status) => {
    const statusObj = processStatuses.find(s => s.status_name === status);
    return statusObj?.status_color || 'bg-gray-100 text-gray-700';
  };

  // Berechne die Amortisationszeit aus den ROI-Daten
  const calculatePaybackMonths = () => {
    const totalSavingsPerYear = 
      (displayData.roi_data?.efficiency_savings || 0) + 
      (displayData.roi_data?.error_reduction_savings || 0) + 
      (displayData.roi_data?.personnel_savings || 0) + 
      (displayData.roi_data?.additional_revenue || 0);
    
    const investment = displayData.roi_data?.investment_cost || 0;
    
    if (totalSavingsPerYear === 0 || investment === 0) return 0;
    
    const monthlySavings = totalSavingsPerYear / 12;
    // Prevent division by zero if monthlySavings is still zero (should not happen if totalSavingsPerYear > 0)
    if (monthlySavings === 0) return 0; 

    const paybackMonths = investment / monthlySavings;
    
    return paybackMonths;
  };

  const calculatedPaybackMonths = calculatePaybackMonths();

  // Tabs where edit mode is available
  const editableTabs = ['overview', 'ist', 'soll', 'effort', 'roi', 'costs']; // Added 'costs' as it has updateData prop
  const showEditButtons = editableTabs.includes(activeTab);

  return (
    <div className="p-6 md:p-8 pt-8 md:pt-10 space-y-6">
      {/* Sync-Benachrichtigung */}
      {showSyncMessage && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2">
          <Alert className="bg-green-50 border-green-200 shadow-lg">
            <AlertCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Gesamtkosten wurden automatisch in ROI-Investitionskosten übertragen
            </AlertDescription>
          </Alert>
        </div>
      )}

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
            <h1 className="text-3xl font-bold text-slate-900">{displayData.process_name}</h1>
            <Badge className={`mt-2 ${getStatusColor(displayData.status)}`}>
              {displayData.status}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          {showEditButtons && (
            <>
              {!isEditing ? (
                <Button onClick={handleEdit} className="gap-2">
                  <Edit className="w-4 h-4" />
                  Bearbeiten
                </Button>
              ) : (
                <>
                  <Button 
                    onClick={handleSave} 
                    disabled={updateMutation.isPending} 
                    className="gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <Save className="w-4 h-4" />
                    {updateMutation.isPending ? 'Speichert...' : 'Speichern'}
                  </Button>
                  <Button onClick={handleCancel} variant="outline" className="gap-2">
                    <X className="w-4 h-4" />
                    Abbrechen
                  </Button>
                </>
              )}
            </>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-2">
                <Trash2 className="w-4 h-4" />
                Löschen
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Prozess wirklich löschen?</AlertDialogTitle>
                <AlertDialogDescription>
                  Diese Aktion kann nicht rückgängig gemacht werden. Der Prozess "{process.process_name}" 
                  und alle zugehörigen Daten werden permanent gelöscht.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700"
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? 'Wird gelöscht...' : 'Löschen'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-slate-600">Amortisation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-3xl font-bold text-green-600">
                  {calculatedPaybackMonths > 0 && isFinite(calculatedPaybackMonths)
                    ? calculatedPaybackMonths.toFixed(1)
                    : '∞'}
                </div>
                <div className="text-xs text-slate-500 mt-1">In Monaten</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-slate-600">Investition</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div className="text-3xl font-bold text-blue-600">
                {formatCurrency(displayData.roi_data?.investment_cost || 0)}
              </div>
              <DollarSign className="w-8 h-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-slate-600">Ist-Kosten</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div className="text-3xl font-bold text-orange-600">
                {(() => {
                  const istPersonnelCost = (displayData.ist_costs?.personnel_hours || 0) * (displayData.ist_costs?.hourly_rate || 0);
                  const istTotalMonthlyCost = istPersonnelCost + (displayData.ist_costs?.system_costs || 0) + (displayData.ist_costs?.other_costs || 0);
                  const istTotalYearlyCost = istTotalMonthlyCost * 12;
                  return formatCurrency(istTotalYearlyCost);
                })()}
              </div>
              <Target className="w-8 h-8 text-orange-500 opacity-50" />
            </div>
            <div className="text-xs text-slate-500 mt-1">pro Jahr</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-slate-600">Einsparungen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div className="text-3xl font-bold text-emerald-600">
                {(() => {
                  const totalSavingsPerYear = 
                    (displayData.roi_data?.efficiency_savings || 0) +
                    (displayData.roi_data?.error_reduction_savings || 0) +
                    (displayData.roi_data?.personnel_savings || 0) +
                    (displayData.roi_data?.additional_revenue || 0);
                  return formatCurrency(totalSavingsPerYear);
                })()}
              </div>
              <TrendingUp className="w-8 h-8 text-emerald-500 opacity-50" />
            </div>
            <div className="text-xs text-slate-500 mt-1">pro Jahr</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-11 gap-1">
          <TabsTrigger value="overview" className="text-xs md:text-sm">
            Übersicht
          </TabsTrigger>
          <TabsTrigger value="ist" className="text-xs md:text-sm">
            Ist-Analyse
          </TabsTrigger>
          <TabsTrigger value="soll" className="text-xs md:text-sm">
            Soll-Zustand
          </TabsTrigger>
          <TabsTrigger value="costs" className="text-xs md:text-sm">
            Ist-Kosten
          </TabsTrigger>
          <TabsTrigger value="effort" className="text-xs md:text-sm">
            Aufwand
          </TabsTrigger>
          <TabsTrigger value="roi" className="text-xs md:text-sm">
            ROI
          </TabsTrigger>
          <TabsTrigger value="visualization" className="text-xs md:text-sm">
            Soll &lt;-&gt; Ist
          </TabsTrigger>
          <TabsTrigger value="specification" className="text-xs md:text-sm">
            Berichte
          </TabsTrigger>
          <TabsTrigger value="presentations" className="text-xs md:text-sm">
            Präsentationen
          </TabsTrigger>
          <TabsTrigger value="base44" className="text-xs md:text-sm">
            Base44
          </TabsTrigger>
          <TabsTrigger value="bpmn" className="text-xs md:text-sm">
            Camunda
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardContent className="pt-6">
              <BasicInfoStep
                data={isEditing ? editedData : displayData}
                updateData={isEditing ? updateEditedData : () => {}}
                consultants={consultants}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ist">
          <Card>
            <CardContent className="pt-6">
              <IstAnalysisStep
                data={isEditing ? editedData : displayData}
                updateData={isEditing ? updateEditedData : () => {}}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="soll">
          <Card>
            <CardContent className="pt-6">
              <SollDefinitionStep
                data={isEditing ? editedData : displayData}
                updateData={isEditing ? updateEditedData : () => {}}
                processId={processId}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costs">
          <Card>
            <CardContent className="pt-6">
              <CostAnalysisStep
                data={isEditing ? editedData : displayData}
                updateData={isEditing ? updateEditedData : () => {}}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="effort">
          <Card>
            <CardContent className="pt-6">
              <EffortEstimationStep
                data={isEditing ? editedData : displayData}
                updateData={isEditing ? updateEditedData : () => {}}
                consultants={consultants} 
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roi">
          <Card>
            <CardContent className="pt-6">
              <ROICalculationStep
                data={isEditing ? editedData : displayData}
                updateData={isEditing ? updateEditedData : () => {}}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="visualization">
          <Card>
            <CardContent className="pt-6">
              <ProcessVisualization process={displayData} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="specification">
          <Card>
            <CardContent className="pt-6">
              <RequirementsSpecification 
                process={displayData}
                processId={processId}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="presentations">
          <Card>
            <CardContent className="pt-6">
              <ProcessPresentations 
                process={displayData}
                processId={processId}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="base44">
          <Card>
            <CardContent className="pt-6">
              <Base44Input 
                process={displayData}
                processId={processId}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bpmn">
          <Card>
            <CardContent className="pt-6">
              <BPMNExport 
                process={displayData} 
                processId={processId}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}