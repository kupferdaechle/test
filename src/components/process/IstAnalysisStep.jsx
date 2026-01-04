import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Trash2, FileSearch, Upload, X, Loader2, FileText, FileSpreadsheet, Image as ImageIcon, Download, AlertCircle, Eye, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const IST_QUESTIONS = [
  { key: "process_steps", label: "Welche Schritte umfasst der aktuelle Prozess?" },
  { key: "responsible_person", label: "Wer ist verantwortlich für den Prozess?" },
  { key: "involved_departments", label: "Welche Abteilungen/Mitarbeiter sind involviert?" },
  { key: "current_systems", label: "Welche Systeme/Software werden aktuell eingesetzt?" },
  { key: "data_processed", label: "Welche Daten werden verarbeitet?" },
  { key: "bottlenecks", label: "Wo liegen die größten Engpässe oder Probleme?" },
  { key: "manual_tasks", label: "Welche manuellen Tätigkeiten sind damit verbunden?" },
  { key: "regulatory_requirements", label: "Welche regulatorischen Anforderungen sind zu beachten?" },
  { key: "technical_challenges", label: "Welche technischen Herausforderungen sehen Sie?" },
  { key: "kpis", label: "Welche Kennzahlen werden zur Messung verwendet?" },
];

export default function IstAnalysisStep({ data, updateData }) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [sortBy, setSortBy] = useState("date");
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentFile, setCurrentFile] = useState(null);

  const openFile = (file) => {
    setCurrentFile(file);
    setViewerOpen(true);
  };

  const closeViewer = () => {
    setViewerOpen(false);
    setCurrentFile(null);
  };

  const updateAnswer = (key, value) => {
    updateData({
      ist_answers: {
        ...data.ist_answers,
        [key]: value
      }
    });
  };

  const addInterface = () => {
    const interfaces = data.ist_answers?.interfaces || [];
    updateData({
      ist_answers: {
        ...data.ist_answers,
        interfaces: [...interfaces, { system_name: "", interface_type: "", description: "" }]
      }
    });
  };

  const updateInterface = (index, field, value) => {
    const interfaces = [...(data.ist_answers?.interfaces || [])];
    interfaces[index] = { ...interfaces[index], [field]: value };
    updateData({
      ist_answers: {
        ...data.ist_answers,
        interfaces
      }
    });
  };

  const removeInterface = (index) => {
    const interfaces = data.ist_answers?.interfaces?.filter((_, i) => i !== index) || [];
    updateData({
      ist_answers: {
        ...data.ist_answers,
        interfaces
      }
    });
  };

  const getFileType = (file) => {
    const type = file.type;
    if (type.startsWith('image/')) return 'image';
    if (type === 'application/pdf') return 'pdf';
    if (type === 'text/csv' || type === 'application/vnd.ms-excel' || type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return 'csv';
    return 'unknown';
  };

  const handleFilesUpload = async (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length === 0) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'application/pdf', 'text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    const invalidFiles = selectedFiles.filter(file => !validTypes.includes(file.type));
    
    if (invalidFiles.length > 0) {
      setUploadError('Bitte wählen Sie nur Bilder (PNG, JPG, GIF), PDF- oder CSV-Dateien aus.');
      event.target.value = '';
      return;
    }

    const maxFileSize = 5 * 1024 * 1024; // Reduziert auf 5MB
    const oversizedFiles = selectedFiles.filter(file => file.size > maxFileSize);
    
    if (oversizedFiles.length > 0) {
      setUploadError(`Einige Dateien sind zu groß. Maximale Dateigröße: 5MB. Große Dateien: ${oversizedFiles.map(f => f.name).join(', ')}`);
      event.target.value = '';
      return;
    }

    // Prüfe Gesamtanzahl der Dateien
    const existingFilesCount = data.ist_answers?.ist_files?.length || 0;
    if (existingFilesCount + selectedFiles.length > 20) {
      setUploadError(`Maximale Anzahl von 20 Dateien erreicht. Sie haben bereits ${existingFilesCount} Dateien hochgeladen.`);
      event.target.value = '';
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      const files = data.ist_answers?.ist_files || [];
      const totalFiles = selectedFiles.length;
      const failedUploads = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        
        try {
          const result = await base44.integrations.Core.UploadFile({ file });
          
          const fileData = {
            url: result.file_url,
            name: file.name,
            type: getFileType(file),
            uploaded_date: new Date().toISOString()
          };

          files.push(fileData);
          setUploadProgress(((i + 1) / totalFiles) * 100);
        } catch (fileError) {
          console.error(`Fehler beim Hochladen von ${file.name}:`, fileError);
          failedUploads.push(file.name);
        }
      }

      updateData({
        ist_answers: {
          ...data.ist_answers,
          ist_files: files
        }
      });

      if (failedUploads.length > 0) {
        setUploadError(`${failedUploads.length} Datei(en) konnten nicht hochgeladen werden: ${failedUploads.join(', ')}.`);
      }
    } catch (error) {
      console.error('Fehler beim Hochladen der Dateien:', error);
      setUploadError('Fehler beim Hochladen. Bitte versuchen Sie es mit kleineren Dateien oder weniger Dateien gleichzeitig.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      event.target.value = '';
    }
  };

  const removeFile = (indexToRemove) => {
    const files = data.ist_answers?.ist_files?.filter((_, i) => i !== indexToRemove) || [];
    updateData({
      ist_answers: {
        ...data.ist_answers,
        ist_files: files
      }
    });
  };

  const getFileIcon = (fileType) => {
    switch(fileType) {
      case 'image': return ImageIcon;
      case 'pdf': return FileText;
      case 'csv': return FileSpreadsheet;
      default: return FileText;
    }
  };

  const getFileColor = (fileType) => {
    switch(fileType) {
      case 'image': return 'text-blue-600 bg-blue-50';
      case 'pdf': return 'text-red-600 bg-red-50';
      case 'csv': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getFileTypeLabel = (fileType) => {
    switch(fileType) {
      case 'image': return 'Bild';
      case 'pdf': return 'PDF';
      case 'csv': return 'Excel/CSV';
      default: return 'Datei';
    }
  };

  const getFilteredAndSortedFiles = () => {
    let files = data.ist_answers?.ist_files || [];
    
    if (filterType !== "all") {
      files = files.filter(file => file.type === filterType);
    }
    
    if (sortBy === "date") {
      files = [...files].sort((a, b) => new Date(b.uploaded_date || 0) - new Date(a.uploaded_date || 0));
    } else if (sortBy === "name") {
      files = [...files].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "type") {
      files = [...files].sort((a, b) => a.type.localeCompare(b.type));
    }
    
    return files;
  };

  const renderFileViewer = () => {
    if (!currentFile) return null;

    // Bilder: Direktanzeige
    if (currentFile.type === 'image') {
      return (
        <div className="w-full h-full flex items-center justify-center bg-slate-900 p-4">
          <img
            src={currentFile.url}
            alt={currentFile.name}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      );
    }

    // Alle anderen Dateien (PDF, CSV, etc.): Google Docs Viewer
    return (
      <div className="w-full h-full flex flex-col">
        <iframe
          src={`https://docs.google.com/viewer?url=${encodeURIComponent(currentFile.url)}&embedded=true`}
          className="w-full flex-1 border-0"
          title={currentFile.name}
        />
      </div>
    );
  };

  const totalFiles = data.ist_answers?.ist_files?.length || 0;
  const showListView = totalFiles > 3;
  const filteredFiles = getFilteredAndSortedFiles();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <FileSearch className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">Ist-Zustands-Analyse</h3>
          <p className="text-sm text-slate-600">Dokumentation des aktuellen Prozesses</p>
        </div>
      </div>

      <div className="space-y-6">
        {IST_QUESTIONS.map((question) => (
          <div key={question.key} className="space-y-2">
            <Label>{question.label}</Label>
            <Textarea
              value={data.ist_answers?.[question.key] || ""}
              onChange={(e) => updateAnswer(question.key, e.target.value)}
              placeholder="Ihre Antwort..."
              className="min-h-20"
            />
          </div>
        ))}

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Schnittstellen zu anderen Systemen</Label>
            <Button type="button" variant="outline" size="sm" onClick={addInterface}>
              <Plus className="w-4 h-4 mr-2" />
              Schnittstelle hinzufügen
            </Button>
          </div>

          {data.ist_answers?.interfaces?.map((interface_item, index) => (
            <Card key={index} className="p-4 space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Systemname</Label>
                  <Input
                    value={interface_item.system_name}
                    onChange={(e) => updateInterface(index, "system_name", e.target.value)}
                    placeholder="z.B. SAP, CRM"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Schnittstellentyp</Label>
                  <Input
                    value={interface_item.interface_type}
                    onChange={(e) => updateInterface(index, "interface_type", e.target.value)}
                    placeholder="z.B. API, CSV, manuell"
                  />
                </div>
                <div className="space-y-2 flex items-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => removeInterface(index)}
                    className="w-full"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Entfernen
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Beschreibung</Label>
                <Textarea
                  value={interface_item.description}
                  onChange={(e) => updateInterface(index, "description", e.target.value)}
                  placeholder="Beschreibung der Schnittstelle..."
                />
              </div>
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <Label>Dateien zum Ist-Zustand</Label>
            {totalFiles > 0 && (
              <span className="text-sm text-slate-500">({totalFiles} {totalFiles === 1 ? 'Datei' : 'Dateien'})</span>
            )}
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <Button
                type="button"
                variant="outline"
                disabled={uploading}
                className="relative"
                onClick={() => document.getElementById('ist-file-upload')?.click()}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Wird hochgeladen... {uploadProgress.toFixed(0)}%
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Dateien hochladen
                  </>
                )}
              </Button>
              <input
                id="ist-file-upload"
                type="file"
                accept="image/*,.pdf,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                multiple
                onChange={handleFilesUpload}
                className="hidden"
              />
              <span className="text-sm text-slate-500">
                Bilder, PDF oder CSV (max. 5MB pro Datei, max. 20 Dateien)
              </span>
            </div>

            {uploadError && (
              <Alert variant="destructive" className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{uploadError}</AlertDescription>
              </Alert>
            )}

            {uploading && uploadProgress > 0 && (
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
          </div>

          {totalFiles > 0 && (
            showListView ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-600" />
                    <Label className="text-sm shrink-0">Filter:</Label>
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger className="w-32 h-8">
                        <SelectValue placeholder="Alle Typen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle Typen</SelectItem>
                        <SelectItem value="image">Bilder</SelectItem>
                        <SelectItem value="pdf">PDFs</SelectItem>
                        <SelectItem value="csv">Excel/CSV</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Label className="text-sm shrink-0">Sortieren:</Label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-32 h-8">
                        <SelectValue placeholder="Nach Datum" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">Nach Datum</SelectItem>
                        <SelectItem value="name">Nach Name</SelectItem>
                        <SelectItem value="type">Nach Typ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="ml-auto text-sm text-slate-600">
                    {filteredFiles.length} von {totalFiles} Dateien
                  </div>
                </div>

                <div className="space-y-2">
                  {filteredFiles.map((file) => {
                    const FileIcon = getFileIcon(file.type);
                    const colorClass = getFileColor(file.type);
                    const originalIndex = data.ist_answers?.ist_files?.indexOf(file);
                    
                    return (
                      <Card key={file.url} className="hover:shadow-md transition-shadow">
                        <div className="p-4 flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                            <FileIcon className="w-6 h-6" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-900 truncate">{file.name}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-slate-500">
                                {getFileTypeLabel(file.type)}
                              </span>
                              {file.uploaded_date && (
                                <>
                                  <span className="text-xs text-slate-400">•</span>
                                  <span className="text-xs text-slate-500">
                                    {new Date(file.uploaded_date).toLocaleDateString('de-DE', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = file.url;
                                link.download = file.name;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              }}
                              className="gap-2"
                            >
                              <Download className="w-4 h-4" />
                              Download
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(originalIndex)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                {data.ist_answers.ist_files.map((file, index) => {
                  const FileIcon = getFileIcon(file.type);
                  const colorClass = getFileColor(file.type);
                  
                  return (
                    <Card key={index} className="relative group hover:shadow-md transition-shadow">
                      {file.type === 'image' ? (
                        <div className="relative">
                          <img
                            src={file.url}
                            alt={file.name}
                            className="w-full h-32 object-cover rounded-t-lg cursor-pointer"
                            onClick={() => openFile(file)}
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent opening file when clicking delete
                              removeFile(index);
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className={`p-4 rounded-t-lg ${colorClass} cursor-pointer`} onClick={() => openFile(file)}>
                          <div className="flex items-center justify-between">
                            <FileIcon className="w-8 h-8" />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFile(index);
                              }}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                      <div className="p-3 border-t">
                        <p className="text-sm font-medium truncate" title={file.name}>
                          {file.name}
                        </p>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-xs text-slate-500 uppercase">
                            {getFileTypeLabel(file.type)}
                          </span>
                          <div className="flex gap-2">
                            {/* The "Ansehen" button was removed from here. The card/image itself is clickable to open the viewer. */}
                            <a
                              href={file.url}
                              download
                              className="text-green-600 hover:text-green-700 transition-colors"
                              title="Download"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )
          )}
        </div>
      </div>

      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] h-[95vh] p-0">
          <DialogHeader className="px-6 py-4 border-b bg-white">
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${getFileColor(currentFile?.type)}`}>
                  {currentFile && React.createElement(getFileIcon(currentFile.type), { className: "w-5 h-5" })}
                </div>
                <span className="truncate text-base">{currentFile?.name}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={closeViewer}
                className="shrink-0 ml-4"
              >
                <X className="w-5 h-5" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {renderFileViewer()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}