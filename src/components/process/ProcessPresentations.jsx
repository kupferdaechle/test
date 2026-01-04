import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import {
  Upload,
  Video,
  Image as ImageIcon,
  FileText,
  Trash2,
  Download,
  Loader2,
  AlertCircle,
  Presentation,
  X
} from "lucide-react";

export default function ProcessPresentations({ process, processId }) {
  const [uploadingVideos, setUploadingVideos] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingPowerPoints, setUploadingPowerPoints] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentImage, setCurrentImage] = useState(null);
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [currentPDF, setCurrentPDF] = useState(null);

  const queryClient = useQueryClient();

  const updateProcessMutation = useMutation({
    mutationFn: (data) => base44.entities.Process.update(processId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['process', processId] });
      queryClient.invalidateQueries({ queryKey: ['processes'] });
    },
  });

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Videos
  const handleVideoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validTypes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
    const invalidFiles = files.filter(file => !validTypes.includes(file.type));
    
    if (invalidFiles.length > 0) {
      setUploadError('Bitte wählen Sie nur Video-Dateien aus (MP4, MOV, AVI, WEBM).');
      e.target.value = '';
      return;
    }

    const maxFileSize = 50 * 1024 * 1024; // 50MB
    const oversizedFiles = files.filter(file => file.size > maxFileSize);
    
    if (oversizedFiles.length > 0) {
      setUploadError(`Einige Videos sind zu groß. Maximale Dateigröße: 50MB.`);
      e.target.value = '';
      return;
    }

    setUploadingVideos(true);
    setUploadError(null);

    try {
      const videos = process.presentation_videos || [];
      
      for (const file of files) {
        const result = await base44.integrations.Core.UploadFile({ file });
        
        videos.push({
          url: result.file_url,
          name: file.name,
          title: file.name,
          uploaded_date: new Date().toISOString(),
          size: file.size
        });
      }

      await updateProcessMutation.mutateAsync({ presentation_videos: videos });
    } catch (error) {
      console.error('Fehler beim Hochladen:', error);
      setUploadError('Fehler beim Hochladen. Bitte versuchen Sie es erneut.');
    } finally {
      setUploadingVideos(false);
      e.target.value = '';
    }
  };

  const removeVideo = async (index) => {
    const videos = process.presentation_videos.filter((_, i) => i !== index);
    await updateProcessMutation.mutateAsync({ presentation_videos: videos });
  };

  // Images
  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    const invalidFiles = files.filter(file => !validTypes.includes(file.type));
    
    if (invalidFiles.length > 0) {
      setUploadError('Bitte wählen Sie nur Bild-Dateien aus (PNG, JPG, GIF, WEBP).');
      e.target.value = '';
      return;
    }

    const maxFileSize = 10 * 1024 * 1024; // 10MB
    const oversizedFiles = files.filter(file => file.size > maxFileSize);
    
    if (oversizedFiles.length > 0) {
      setUploadError(`Einige Bilder sind zu groß. Maximale Dateigröße: 10MB.`);
      e.target.value = '';
      return;
    }

    setUploadingImages(true);
    setUploadError(null);

    try {
      const images = process.presentation_images || [];
      
      for (const file of files) {
        const result = await base44.integrations.Core.UploadFile({ file });
        
        images.push({
          url: result.file_url,
          name: file.name,
          title: file.name,
          uploaded_date: new Date().toISOString(),
          size: file.size
        });
      }

      await updateProcessMutation.mutateAsync({ presentation_images: images });
    } catch (error) {
      console.error('Fehler beim Hochladen:', error);
      setUploadError('Fehler beim Hochladen. Bitte versuchen Sie es erneut.');
    } finally {
      setUploadingImages(false);
      e.target.value = '';
    }
  };

  const removeImage = async (index) => {
    const images = process.presentation_images.filter((_, i) => i !== index);
    await updateProcessMutation.mutateAsync({ presentation_images: images });
  };

  // PowerPoints
  const handlePowerPointUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validTypes = [
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    const invalidFiles = files.filter(file => !validTypes.includes(file.type));
    
    if (invalidFiles.length > 0) {
      setUploadError('Bitte wählen Sie nur PPT, PPTX, PDF, DOC, DOCX, XLS oder XLSX Dateien aus.');
      e.target.value = '';
      return;
    }

    const maxFileSize = 50 * 1024 * 1024; // 50MB
    const oversizedFiles = files.filter(file => file.size > maxFileSize);
    
    if (oversizedFiles.length > 0) {
      setUploadError(`Einige Dateien sind zu groß. Maximale Dateigröße: 50MB.`);
      e.target.value = '';
      return;
    }

    setUploadingPowerPoints(true);
    setUploadError(null);

    try {
      const powerpoints = process.presentation_powerpoints || [];
      
      for (const file of files) {
        const result = await base44.integrations.Core.UploadFile({ file });
        
        powerpoints.push({
          url: result.file_url,
          name: file.name,
          title: file.name,
          uploaded_date: new Date().toISOString(),
          size: file.size
        });
      }

      await updateProcessMutation.mutateAsync({ presentation_powerpoints: powerpoints });
    } catch (error) {
      console.error('Fehler beim Hochladen:', error);
      setUploadError('Fehler beim Hochladen. Bitte versuchen Sie es erneut.');
    } finally {
      setUploadingPowerPoints(false);
      e.target.value = '';
    }
  };

  const removePowerPoint = async (index) => {
    const powerpoints = process.presentation_powerpoints.filter((_, i) => i !== index);
    await updateProcessMutation.mutateAsync({ presentation_powerpoints: powerpoints });
  };

  // New functions for image viewer
  const openImageViewer = (image) => {
    setCurrentImage(image);
    setViewerOpen(true);
  };

  const closeImageViewer = () => {
    setViewerOpen(false);
    setCurrentImage(null);
  };

  // New functions for PDF viewer
  const openPDFViewer = (file) => {
    setCurrentPDF(file);
    setPdfViewerOpen(true);
  };

  const closePDFViewer = () => {
    setPdfViewerOpen(false);
    setCurrentPDF(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
          <Presentation className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">Präsentationsmaterial</h3>
          <p className="text-sm text-slate-600">Videos, Bilder und PowerPoints für diesen Prozess</p>
        </div>
      </div>

      <Tabs defaultValue="videos" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="videos">
            <Video className="w-4 h-4 mr-2" />
            Videos ({process.presentation_videos?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="images">
            <ImageIcon className="w-4 h-4 mr-2" />
            Bilder ({process.presentation_images?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="powerpoints">
            <FileText className="w-4 h-4 mr-2" />
            PowerPoints ({process.presentation_powerpoints?.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* Videos Tab */}
        <TabsContent value="videos" className="space-y-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              disabled={uploadingVideos}
              onClick={() => document.getElementById('process-video-upload')?.click()}
              className="gap-2"
            >
              {uploadingVideos ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Wird hochgeladen...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Videos hochladen
                </>
              )}
            </Button>
            <input
              id="process-video-upload"
              type="file"
              accept="video/*"
              multiple
              onChange={handleVideoUpload}
              className="hidden"
            />
            <span className="text-sm text-slate-500">
              MP4, MOV, AVI, WEBM (max. 50MB)
            </span>
          </div>

          {uploadError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{uploadError}</AlertDescription>
            </Alert>
          )}

          {process.presentation_videos && process.presentation_videos.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4">
              {process.presentation_videos.map((video, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="aspect-video bg-slate-900 rounded-lg mb-3 overflow-hidden">
                      <video
                        src={video.url}
                        controls
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="font-medium text-sm truncate">{video.name}</p>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{formatFileSize(video.size)}</span>
                        <span>{new Date(video.uploaded_date).toLocaleDateString('de-DE')}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-2"
                          onClick={() => window.open(video.url, '_blank')}
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeVideo(index)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <Video className="w-16 h-16 mx-auto mb-3 text-slate-300" />
              <p>Noch keine Videos hochgeladen</p>
            </div>
          )}
        </TabsContent>

        {/* Images Tab */}
        <TabsContent value="images" className="space-y-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              disabled={uploadingImages}
              onClick={() => document.getElementById('process-image-upload')?.click()}
              className="gap-2"
            >
              {uploadingImages ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Wird hochgeladen...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Bilder hochladen
                </>
              )}
            </Button>
            <input
              id="process-image-upload"
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
            />
            <span className="text-sm text-slate-500">
              PNG, JPG, GIF, WEBP (max. 10MB)
            </span>
          </div>

          {uploadError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{uploadError}</AlertDescription>
            </Alert>
          )}

          {process.presentation_images && process.presentation_images.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {process.presentation_images.map((image, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow group">
                  <CardContent className="p-2">
                    <div 
                      className="aspect-square bg-slate-100 rounded-lg mb-2 overflow-hidden cursor-pointer"
                      onClick={() => openImageViewer(image)}
                    >
                      <img
                        src={image.url}
                        alt={image.name}
                        className="w-full h-full object-cover hover:scale-105 transition-transform"
                      />
                    </div>
                    <p className="text-xs font-medium truncate mb-2" title={image.name}>
                      {image.name}
                    </p>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-7 text-xs gap-1"
                        onClick={() => window.open(image.url, '_blank')}
                      >
                        <Download className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => removeImage(index)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <ImageIcon className="w-16 h-16 mx-auto mb-3 text-slate-300" />
              <p>Noch keine Bilder hochgeladen</p>
            </div>
          )}
        </TabsContent>

        {/* PowerPoints Tab */}
        <TabsContent value="powerpoints" className="space-y-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              disabled={uploadingPowerPoints}
              onClick={() => document.getElementById('process-powerpoint-upload')?.click()}
              className="gap-2"
            >
              {uploadingPowerPoints ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Wird hochgeladen...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Dateien hochladen
                </>
              )}
            </Button>
            <input
              id="process-powerpoint-upload"
              type="file"
              accept=".ppt,.pptx,.pdf,.doc,.docx,.xls,.xlsx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              multiple
              onChange={handlePowerPointUpload}
              className="hidden"
            />
            <span className="text-sm text-slate-500">
              PPT, PPTX, PDF, DOC, DOCX, XLS, XLSX (max. 50MB)
            </span>
          </div>

          {uploadError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{uploadError}</AlertDescription>
            </Alert>
          )}

          {process.presentation_powerpoints && process.presentation_powerpoints.length > 0 ? (
            <div className="space-y-3">
              {process.presentation_powerpoints.map((file, index) => {
                // Prüfe ob es sich um eine PDF-Datei handelt
                const isPDF = file.name.toLowerCase().endsWith('.pdf');
                const iconBgColor = isPDF ? 'bg-red-100' : 'bg-orange-100';
                const iconBgColorHover = isPDF ? 'group-hover:bg-red-200' : 'group-hover:bg-orange-200';
                const iconColor = isPDF ? 'text-red-600' : 'text-orange-600';
                const textHoverColor = isPDF ? 'group-hover:text-red-600' : 'group-hover:text-orange-600';
                
                return (
                  <Card 
                    key={index} 
                    className="hover:shadow-md transition-shadow cursor-pointer group"
                    onClick={() => isPDF ? openPDFViewer(file) : window.open(file.url, '_blank')}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${iconBgColor} ${iconBgColorHover} transition-colors`}>
                          <FileText className={`w-6 h-6 ${iconColor}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`font-medium text-sm truncate ${textHoverColor} transition-colors`}>{file.name}</p>
                            {isPDF && (
                              <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">
                                PDF
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                            <span>{formatFileSize(file.size)}</span>
                            <span>•</span>
                            <span>{new Date(file.uploaded_date).toLocaleDateString('de-DE')}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              const link = document.createElement('a');
                              link.href = file.url;
                              link.download = file.name;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }}
                          >
                            <Download className="w-4 h-4" />
                            Download
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              removePowerPoint(index);
                            }}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <FileText className="w-16 h-16 mx-auto mb-3 text-slate-300" />
              <p>Noch keine Dateien hochgeladen</p>
            </div>
          )}
        </TabsContent>

      </Tabs>

      {/* Image Viewer Dialog */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] h-[95vh] p-0">
          <DialogHeader className="px-6 py-4 border-b bg-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                  <ImageIcon className="w-5 h-5 text-blue-600" />
                </div>
                <span className="truncate text-base font-semibold">{currentImage?.name}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={closeImageViewer}
                className="shrink-0 ml-4"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-hidden bg-slate-900 flex items-center justify-center p-4">
            {currentImage && (
              <img
                src={currentImage.url}
                alt={currentImage.name}
                className="max-w-full max-h-full object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* PDF Viewer Dialog */}
      <Dialog open={pdfViewerOpen} onOpenChange={setPdfViewerOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] h-[95vh] p-0">
          <DialogHeader className="px-6 py-4 border-b bg-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-red-600" />
                </div>
                <span className="truncate text-base font-semibold">{currentPDF?.name}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={closePDFViewer}
                className="shrink-0 ml-4"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {currentPDF && (
              <iframe
                src={`https://docs.google.com/viewer?url=${encodeURIComponent(currentPDF.url)}&embedded=true`}
                className="w-full h-full border-0"
                title={currentPDF.name}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}