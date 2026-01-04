import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Upload, FileText, Image as ImageIcon, Video, Download, Trash2, Loader2, AlertCircle, X, Calendar } from "lucide-react";

export default function CustomerAssets({ customerId }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [viewingAsset, setViewingAsset] = useState(null);

  const queryClient = useQueryClient();

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['customerAssets', customerId],
    queryFn: async () => {
      const allAssets = await base44.entities.CustomerAsset.list('-created_date');
      return allAssets.filter(asset => asset.customer_id === customerId);
    },
    enabled: !!customerId,
  });

  const createAssetMutation = useMutation({
    mutationFn: (assetData) => base44.entities.CustomerAsset.create(assetData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customerAssets', customerId] });
      setDescription("");
      setTags("");
    },
  });

  const deleteAssetMutation = useMutation({
    mutationFn: (assetId) => base44.entities.CustomerAsset.delete(assetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customerAssets', customerId] });
    },
  });

  const getFileType = (file) => {
    const type = file.type;
    if (type.startsWith('image/')) return 'image';
    if (type === 'application/pdf') return 'pdf';
    if (type.startsWith('video/')) return 'video';
    return null;
  };

  const handleFileUpload = async (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length === 0) return;

    const validTypes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/gif',
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo'
    ];

    const invalidFiles = selectedFiles.filter(file => !validTypes.includes(file.type));
    if (invalidFiles.length > 0) {
      setUploadError('Bitte nur PDF, Bilder (PNG, JPG, GIF) oder Videos (MP4, MOV, AVI) hochladen.');
      event.target.value = '';
      return;
    }

    const maxFileSize = 50 * 1024 * 1024; // 50MB
    const oversizedFiles = selectedFiles.filter(file => file.size > maxFileSize);
    if (oversizedFiles.length > 0) {
      setUploadError(`Einige Dateien sind zu groß (max. 50MB): ${oversizedFiles.map(f => f.name).join(', ')}`);
      event.target.value = '';
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      for (const file of selectedFiles) {
        const fileType = getFileType(file);
        if (!fileType) continue;

        const result = await base44.integrations.Core.UploadFile({ file });

        await createAssetMutation.mutateAsync({
          customer_id: customerId,
          file_url: result.file_url,
          file_name: file.name,
          file_type: fileType,
          file_size: file.size,
          description: description || "",
          tags: tags || ""
        });
      }
    } catch (error) {
      console.error('Fehler beim Hochladen:', error);
      setUploadError('Fehler beim Hochladen. Bitte versuchen Sie es erneut.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleDelete = async (assetId) => {
    if (window.confirm('Möchten Sie diese Datei wirklich löschen?')) {
      await deleteAssetMutation.mutateAsync(assetId);
    }
  };

  const getFileIcon = (fileType) => {
    switch(fileType) {
      case 'image': return ImageIcon;
      case 'pdf': return FileText;
      case 'video': return Video;
      default: return FileText;
    }
  };

  const getFileColor = (fileType) => {
    switch(fileType) {
      case 'image': return 'text-blue-600 bg-blue-50';
      case 'pdf': return 'text-red-600 bg-red-50';
      case 'video': return 'text-purple-600 bg-purple-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getFileTypeLabel = (fileType) => {
    switch(fileType) {
      case 'image': return 'Bild';
      case 'pdf': return 'PDF';
      case 'video': return 'Video';
      default: return 'Datei';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Dateien hochladen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Input
              placeholder="Beschreibung (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <Input
              placeholder="Tags (kommagetrennt, optional)"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="outline"
              disabled={uploading}
              onClick={() => document.getElementById('customer-asset-upload')?.click()}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Wird hochgeladen...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Dateien auswählen
                </>
              )}
            </Button>
            <input
              id="customer-asset-upload"
              type="file"
              accept=".pdf,image/*,video/*"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
            <span className="text-sm text-slate-500">
              PDF, Bilder oder Videos (max. 50MB pro Datei)
            </span>
          </div>

          {uploadError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{uploadError}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-center py-8 text-slate-500">Lädt...</div>
      ) : assets.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="p-12 text-center">
            <Upload className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Noch keine Dateien hochgeladen</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {assets.map((asset) => {
            const FileIcon = getFileIcon(asset.file_type);
            const colorClass = getFileColor(asset.file_type);

            return (
              <Card key={asset.id} className="hover:shadow-md transition-shadow">
                <div className="p-4 flex items-center gap-4">
                  <div 
                    className={`w-14 h-14 rounded-lg flex items-center justify-center shrink-0 ${colorClass} ${asset.file_type !== 'image' ? 'cursor-pointer hover:opacity-80' : ''}`}
                    onClick={() => asset.file_type !== 'image' && setViewingAsset(asset)}
                  >
                    {asset.file_type === 'image' ? (
                      <img
                        src={asset.file_url}
                        alt={asset.file_name}
                        className="w-full h-full object-cover rounded-lg cursor-pointer"
                        onClick={() => setViewingAsset(asset)}
                      />
                    ) : (
                      <FileIcon className="w-7 h-7" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-slate-900 truncate">{asset.file_name}</p>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {getFileTypeLabel(asset.file_type)}
                      </Badge>
                    </div>

                    {asset.description && (
                      <p className="text-sm text-slate-600 line-clamp-1 mb-1">{asset.description}</p>
                    )}

                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>{formatFileSize(asset.file_size)}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(asset.created_date).toLocaleDateString('de-DE', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </span>
                    </div>

                    {asset.tags && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {asset.tags.split(',').map((tag, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {tag.trim()}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = asset.file_url;
                        link.download = asset.file_name;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      title="Herunterladen"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDelete(asset.id)}
                      title="Löschen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {viewingAsset && (
        <Dialog open={!!viewingAsset} onOpenChange={() => setViewingAsset(null)}>
          <DialogContent className="max-w-5xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>{viewingAsset.file_name}</DialogTitle>
            </DialogHeader>
            <div className="w-full h-[75vh]">
              {viewingAsset.file_type === 'image' ? (
                <img
                  src={viewingAsset.file_url}
                  alt={viewingAsset.file_name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <iframe
                  src={`https://docs.google.com/viewer?url=${encodeURIComponent(viewingAsset.file_url)}&embedded=true`}
                  className="w-full h-full border-0"
                  title={viewingAsset.file_name}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}