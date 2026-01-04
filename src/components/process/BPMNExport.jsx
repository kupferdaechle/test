
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // Added Input import
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Network, Loader2, Download, Copy, CheckCircle, FileJson, FileText, ExternalLink, Upload, X, File, AlertCircle, Eye } from "lucide-react"; // Added Eye import
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function BPMNExport({ process, processId }) {
  const [generating, setGenerating] = useState(false);
  const [bpmnData, setBpmnData] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  
  const queryClient = useQueryClient();

  const updateBPMNFilesMutation = useMutation({
    mutationFn: (bpmn_files) => base44.entities.Process.update(processId, { bpmn_files }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['process', processId] });
      queryClient.invalidateQueries({ queryKey: ['processes'] });
    },
  });

  const generateBPMNData = async () => {
    setGenerating(true);
    setError(null);

    try {
      const prompt = `
Du bist ein BPMN-Experte. Analysiere die folgenden Prozessinformationen und erstelle eine strukturierte, maschinenlesbare Darstellung für BPMN-Modellierungstools.

PROZESSNAME: ${process.process_name}

IST-ZUSTAND:
- Prozessschritte: ${process.ist_answers?.process_steps || 'Nicht definiert'}
- Verantwortliche Person: ${process.ist_answers?.responsible_person || 'Nicht definiert'}
- Beteiligte Abteilungen: ${process.ist_answers?.involved_departments || 'Nicht definiert'}
- Aktuelle Systeme: ${process.ist_answers?.current_systems || 'Nicht definiert'}
- Engpässe: ${process.ist_answers?.bottlenecks || 'Nicht definiert'}
- Manuelle Tätigkeiten: ${process.ist_answers?.manual_tasks || 'Nicht definiert'}
- KPIs: ${process.ist_answers?.kpis || 'Nicht definiert'}

SCHNITTSTELLEN (IST):
${process.ist_answers?.interfaces?.map(i => `- ${i.system_name} (${i.interface_type}): ${i.description}`).join('\n') || 'Keine'}

SOLL-ZUSTAND:
${process.soll_description || 'Nicht definiert'}

- Ziele: ${process.soll_answers?.goals || 'Nicht definiert'}
- Neue Technologien: ${process.soll_answers?.new_technologies || 'Nicht definiert'}

NEUE SCHNITTSTELLEN (SOLL):
${process.soll_answers?.new_interfaces?.map(i => `- ${i.name} (${i.category}): ${i.description}`).join('\n') || 'Keine'}

Erstelle eine BPMN-kompatible Struktur mit folgenden Elementen:

1. PROZESS-ÜBERSICHT
   - Prozessname
   - Prozessverantwortlicher (Pool Owner)
   - Beteiligte Pools/Lanes (Abteilungen)

2. PROZESSSCHRITTE (Tasks/Activities)
   - Nummeriere jeden Schritt (Step-001, Step-002, etc.)
   - Typ (Task, User Task, Service Task, etc.)
   - Name des Schritts
   - Verantwortliche Lane/Abteilung
   - Beschreibung
   - Input/Output Daten

3. GATEWAYS (Entscheidungspunkte)
   - Identifiziere mögliche Entscheidungspunkte
   - Typ (Exklusiv, Parallel, Inklusiv)
   - Bedingungen

4. EVENTS
   - Start-Event
   - Zwischen-Events (Timer, Message, etc.)
   - End-Event(s)

5. SEQUENCE FLOWS
   - Verbindungen zwischen Schritten
   - Von -> Nach
   - Bedingungen (falls vorhanden)

6. DATA OBJECTS
   - Welche Daten werden verwendet
   - Input/Output Dokumente

7. SYSTEM-INTEGRATIONEN
   - Message Flows zu externen Systemen
   - API-Aufrufe

Gib die Struktur als klar strukturierten Text aus, der leicht in JSON oder BPMN-Tools übertragbar ist.
Nutze klare Nummerierung und Hierarchie.
`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: false
      });

      const jsonStructure = {
        process: {
          id: process.id,
          name: process.process_name,
          description: process.soll_description || process.ist_answers?.process_steps || "",
          pools: [
            {
              id: "pool-main",
              name: process.ist_answers?.responsible_person || "Hauptverantwortlicher",
              lanes: process.ist_answers?.involved_departments?.split(',').map((dept, idx) => ({
                id: `lane-${idx + 1}`,
                name: dept.trim()
              })) || []
            }
          ],
          tasks: extractTasks(process),
          gateways: extractGateways(process),
          events: {
            start: {
              id: "start-001",
              name: "Prozess gestartet",
              type: "startEvent"
            },
            end: {
              id: "end-001",
              name: "Prozess abgeschlossen",
              type: "endEvent"
            }
          },
          sequenceFlows: [],
          dataObjects: extractDataObjects(process),
          messageFlows: extractMessageFlows(process)
        },
        metadata: {
          created_date: process.created_date,
          status: process.status,
          roi: process.roi_data?.calculated_roi,
          effort_hours: (process.effort_details?.conception_hours || 0) + 
                       (process.effort_details?.development_hours || 0) + 
                       (process.effort_details?.testing_hours || 0) + 
                       (process.effort_details?.deployment_hours || 0)
        }
      };

      setBpmnData({
        textFormat: result,
        jsonFormat: JSON.stringify(jsonStructure, null, 2)
      });
    } catch (err) {
      setError('Fehler beim Generieren der BPMN-Daten. Bitte versuchen Sie es erneut.');
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const extractTasks = (proc) => {
    const tasks = [];
    const steps = proc.ist_answers?.process_steps || "";
    const manualTasks = proc.ist_answers?.manual_tasks || "";
    
    const stepLines = steps.split('\n').filter(s => s.trim());
    stepLines.forEach((step, idx) => {
      tasks.push({
        id: `task-${String(idx + 1).padStart(3, '0')}`,
        name: step.trim(),
        type: manualTasks.toLowerCase().includes(step.toLowerCase().slice(0, 20)) ? "userTask" : "task",
        description: step.trim()
      });
    });
    
    return tasks;
  };

  const extractGateways = (proc) => {
    const gateways = [];
    const bottlenecks = proc.ist_answers?.bottlenecks || "";
    
    if (bottlenecks.toLowerCase().includes('entscheidung') || 
        bottlenecks.toLowerCase().includes('genehmigung') ||
        bottlenecks.toLowerCase().includes('prüfung')) {
      gateways.push({
        id: "gateway-001",
        name: "Entscheidungspunkt",
        type: "exclusiveGateway",
        description: "Basierend auf Engpass-Analyse identifiziert"
      });
    }
    
    return gateways;
  };

  const extractDataObjects = (proc) => {
    const dataObjects = [];
    const dataProcessed = proc.ist_answers?.data_processed || "";
    
    if (dataProcessed) {
      const dataTypes = dataProcessed.split(',').map(d => d.trim()).filter(d => d);
      dataTypes.forEach((data, idx) => {
        dataObjects.push({
          id: `data-${String(idx + 1).padStart(3, '0')}`,
          name: data,
          type: "dataObject"
        });
      });
    }
    
    return dataObjects;
  };

  const extractMessageFlows = (proc) => {
    const messageFlows = [];
    
    proc.ist_answers?.interfaces?.forEach((iface, idx) => {
      messageFlows.push({
        id: `message-ist-${String(idx + 1).padStart(3, '0')}`,
        name: iface.system_name,
        source: "process",
        target: iface.system_name,
        type: iface.interface_type,
        description: iface.description,
        status: "current"
      });
    });
    
    proc.soll_answers?.new_interfaces?.forEach((iface, idx) => {
      messageFlows.push({
        id: `message-soll-${String(idx + 1).padStart(3, '0')}`,
        name: iface.name || `Schnittstelle ${idx + 1}`,
        source: "process",
        target: iface.name || `System ${idx + 1}`,
        category: iface.category,
        description: iface.description,
        status: "planned"
      });
    });
    
    return messageFlows;
  };

  const handleBPMNUpload = async (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length === 0) return;

    const validExtensions = ['.bpmn', '.xml'];
    const validMimeTypes = ['text/xml', 'application/xml', 'application/octet-stream'];

    const invalidFiles = selectedFiles.filter(file => {
      const fileName = file.name.toLowerCase();
      const fileExtension = fileName.substring(fileName.lastIndexOf('.'));
      const isValidExtension = validExtensions.includes(fileExtension);
      const isValidMimeType = validMimeTypes.includes(file.type);
      return !isValidExtension && !isValidMimeType;
    });
    
    if (invalidFiles.length > 0) {
      setUploadError('Bitte wählen Sie nur BPMN- oder XML-Dateien aus.');
      event.target.value = '';
      return;
    }

    const maxFileSize = 10 * 1024 * 1024;
    const oversizedFiles = selectedFiles.filter(file => file.size > maxFileSize);
    
    if (oversizedFiles.length > 0) {
      setUploadError(`Einige Dateien sind zu groß (${oversizedFiles.map(f => f.name).join(', ')}). Maximale Dateigröße: 10MB.`);
      event.target.value = '';
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const existingFiles = process.bpmn_files ? [...process.bpmn_files] : [];
      const failedUploads = [];

      for (const file of selectedFiles) {
        try {
          const result = await base44.integrations.Core.UploadFile({ file });
          
          const fileData = {
            url: result.file_url,
            name: file.name,
            uploaded_date: new Date().toISOString(),
            direct_link: "" // New field added
          };

          existingFiles.push(fileData);
        } catch (fileError) {
          console.error(`Fehler beim Hochladen von ${file.name}:`, fileError);
          failedUploads.push(file.name);
        }
      }

      await updateBPMNFilesMutation.mutateAsync(existingFiles);

      if (failedUploads.length > 0) {
        setUploadError(`${failedUploads.length} Datei(en) konnte(n) nicht hochgeladen werden: ${failedUploads.join(', ')}`);
      }
    } catch (error) {
      console.error('Fehler beim Hochladen der BPMN-Dateien:', error);
      setUploadError('Ein unerwarteter Fehler ist beim Hochladen aufgetreten. Bitte versuchen Sie es später erneut.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const removeBPMNFile = async (indexToRemove) => {
    if (process.bpmn_files) {
      const files = process.bpmn_files.filter((_, i) => i !== indexToRemove);
      await updateBPMNFilesMutation.mutateAsync(files);
    }
    setUploadError(null);
  };

  // New function to update the direct link
  const updateDirectLink = async (index, newLink) => {
    if (process.bpmn_files) {
      const files = [...process.bpmn_files];
      files[index] = { ...files[index], direct_link: newLink };
      await updateBPMNFilesMutation.mutateAsync(files);
    }
  };

  const openInCamunda = (fileUrl) => {
    window.open('https://modeler.camunda.io', '_blank');
    window.open(fileUrl, '_blank');
    alert('Camunda Modeler wurde geöffnet. Bitte laden Sie die BPMN-Datei dort über "File > Open" hoch.');
  };

  // New function to open the direct link
  const openDirectLink = (directLink) => {
    if (directLink && directLink.trim()) {
      window.open(directLink, '_blank');
    } else {
      alert('Bitte tragen Sie zuerst einen Link ein.');
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      alert('Fehler beim Kopieren in die Zwischenablage');
    }
  };

  const downloadFile = (content, filename, contentType) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
          <Network className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">BPMN Export</h3>
          <p className="text-sm text-slate-600">
            Strukturierte Prozessdaten für BPMN-Modellierungstools
          </p>
        </div>
      </div>

      {/* BPMN-Dateien Upload Bereich */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600" />
            BPMN-Dateien hochladen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="outline"
              disabled={uploading}
              className="relative bg-white"
              onClick={() => document.getElementById('bpmn-file-upload')?.click()}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Wird hochgeladen...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  BPMN-Dateien auswählen
                </>
              )}
            </Button>
            <input
              id="bpmn-file-upload"
              type="file"
              accept=".bpmn,.xml,text/xml,application/xml,application/octet-stream"
              multiple
              onChange={handleBPMNUpload}
              className="hidden"
            />
            <span className="text-sm text-slate-600">
              BPMN oder XML-Dateien (max. 10MB pro Datei)
            </span>
          </div>

          {uploadError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{uploadError}</AlertDescription>
            </Alert>
          )}

          {process.bpmn_files && process.bpmn_files.length > 0 && (
            <div className="space-y-2 mt-4">
              <p className="text-sm font-medium text-slate-700">Hochgeladene BPMN-Dateien:</p>
              <div className="space-y-3">
                {process.bpmn_files.map((file, index) => (
                  <Card key={index} className="relative group hover:shadow-md transition-shadow bg-white">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
                            <File className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
                            <p className="text-xs text-slate-500">
                              Hochgeladen: {new Date(file.uploaded_date).toLocaleDateString('de-DE')}
                            </p>
                          </div>
                        </div>
                        {/* Remove button moved for better layout */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeBPMNFile(index)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0"
                          aria-label={`Remove ${file.name}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <label htmlFor={`direct-link-${index}`} className="text-xs font-medium text-slate-700">
                          Direkter Link zum Prozess:
                        </label>
                        <Input
                          id={`direct-link-${index}`}
                          type="url"
                          placeholder="https://modeler.camunda.io/..."
                          defaultValue={file.direct_link || ""}
                          onBlur={(e) => updateDirectLink(index, e.target.value)}
                          className="text-sm"
                        />
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openInCamunda(file.url)}
                          className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Camunda BPMN
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openDirectLink(file.direct_link)}
                          disabled={!file.direct_link || !file.direct_link.trim()}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50 disabled:opacity-50"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Prozess anzeigen
                        </Button>
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="text-slate-600 hover:text-slate-700"
                        >
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Download ${file.name}`}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </a>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {!bpmnData ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Network className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              BPMN-Daten generieren
            </h3>
            <p className="text-slate-600 mb-6 max-w-2xl mx-auto">
              Generieren Sie eine strukturierte Darstellung Ihres Prozesses für BPMN-Modellierungstools 
              wie Camunda Modeler, Signavio oder draw.io. Die Daten werden in einem maschinenlesbaren 
              Format (JSON und strukturierter Text) bereitgestellt.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <Button 
                onClick={generateBPMNData} 
                disabled={generating}
                className="gap-2 bg-indigo-600 hover:bg-indigo-700"
                size="lg"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Wird generiert...
                  </>
                ) : (
                  <>
                    <Network className="w-5 h-5" />
                    BPMN-Daten generieren
                  </>
                )}
              </Button>
              <Button 
                variant="outline"
                size="lg"
                className="gap-2"
                onClick={() => window.open('https://modeler.camunda.io', '_blank')}
              >
                <ExternalLink className="w-5 h-5" />
                Camunda Modeler öffnen
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="text" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="text" className="gap-2">
              <FileText className="w-4 h-4" />
              Strukturierter Text
            </TabsTrigger>
            <TabsTrigger value="json" className="gap-2">
              <FileJson className="w-4 h-4" />
              JSON-Format
            </TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="space-y-4">
            <div className="flex flex-wrap gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => copyToClipboard(bpmnData.textFormat)}
                className="gap-2"
              >
                {copied ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Kopiert!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Kopieren
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => downloadFile(
                  bpmnData.textFormat, 
                  `${process.process_name}_BPMN.txt`, 
                  'text/plain'
                )}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Download TXT
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open('https://modeler.camunda.io', '_blank')}
                className="gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Camunda Modeler
              </Button>
              <Button
                onClick={generateBPMNData}
                className="gap-2"
              >
                <Network className="w-4 h-4" />
                Neu generieren
              </Button>
            </div>

            <Card>
              <CardContent className="p-6">
                <pre className="whitespace-pre-wrap text-sm bg-slate-50 p-4 rounded-lg border overflow-auto max-h-[600px]">
                  {bpmnData.textFormat}
                </pre>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="json" className="space-y-4">
            <div className="flex flex-wrap gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => copyToClipboard(bpmnData.jsonFormat)}
                className="gap-2"
              >
                {copied ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Kopiert!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Kopieren
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => downloadFile(
                  bpmnData.jsonFormat, 
                  `${process.process_name}_BPMN.json`, 
                  'application/json'
                )}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Download JSON
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open('https://modeler.camunda.io', '_blank')}
                className="gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Camunda Modeler
              </Button>
              <Button
                onClick={generateBPMNData}
                className="gap-2"
              >
                <Network className="w-4 h-4" />
                Neu generieren
              </Button>
            </div>

            <Card>
              <CardContent className="p-6">
                <pre className="whitespace-pre-wrap text-sm bg-slate-50 p-4 rounded-lg border overflow-auto max-h-[600px] font-mono">
                  {bpmnData.jsonFormat}
                </pre>
              </CardContent>
            </Card>

            <Alert>
              <AlertDescription>
                <strong>Verwendungshinweis:</strong> Diese JSON-Struktur kann als Basis für die 
                Erstellung von BPMN-Diagrammen in Modellierungstools verwendet werden. Importieren 
                Sie die Daten oder nutzen Sie sie als Referenz für die manuelle Modellierung.
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
