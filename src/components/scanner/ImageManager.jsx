import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { UploadFile } from "@/integrations/Core";
import { 
  Upload, 
  Crop, 
  ZoomIn, 
  ZoomOut, 
  RotateCw,
  Check,
  X,
  Trash2,
  Star,
  StarOff,
  Loader2,
  ImageIcon,
  Download
} from "lucide-react";

/**
 * ImageManager Component
 * Handles multiple images with crop, resize, and thumbnail generation
 */
export default function ImageManager({ 
  images = [], 
  onImagesUpdate, 
  productName = "Product"
}) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Crop state
  const [cropImage, setCropImage] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const canvasRef = useRef(null);
  const imageRef = useRef(null);

  const handleUpload = async (files) => {
    if (!files || files.length === 0) return;
    
    setUploading(true);
    try {
      const newImages = [];
      
      for (const file of Array.from(files)) {
        // Upload original
        const result = await UploadFile({ file });
        const imageUrl = result.file_url;
        
        // Generate thumbnail
        const thumbnailUrl = await generateThumbnail(file);
        
        newImages.push({
          url: imageUrl,
          thumbnail_url: thumbnailUrl,
          is_primary: images.length === 0 && newImages.length === 0, // First image is primary
          source: "uploaded"
        });
      }
      
      const updatedImages = [...images, ...newImages];
      onImagesUpdate(updatedImages);
      
    } catch (error) {
      console.error("Error uploading images:", error);
      alert('שגיאה בהעלאת התמונות');
    } finally {
      setUploading(false);
    }
  };

  const generateThumbnail = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Set thumbnail size (200x200)
          const size = 200;
          canvas.width = size;
          canvas.height = size;
          
          // Calculate crop to center
          const scale = Math.max(size / img.width, size / img.height);
          const x = (size / 2) - (img.width / 2) * scale;
          const y = (size / 2) - (img.height / 2) * scale;
          
          ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
          
          // Convert to blob and upload
          canvas.toBlob(async (blob) => {
            try {
              const thumbnailFile = new File([blob], `thumb_${file.name}`, { type: 'image/jpeg' });
              const result = await UploadFile({ file: thumbnailFile });
              resolve(result.file_url);
            } catch (error) {
              console.error("Error uploading thumbnail:", error);
              resolve(null); // Fallback to original image
            }
          }, 'image/jpeg', 0.8);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSetPrimary = (index) => {
    const updatedImages = images.map((img, i) => ({
      ...img,
      is_primary: i === index
    }));
    onImagesUpdate(updatedImages);
  };

  const handleDelete = (index) => {
    if (!confirm('בטוח שרוצה למחוק את התמונה?')) return;
    
    const updatedImages = images.filter((_, i) => i !== index);
    
    // If we deleted the primary image, set the first one as primary
    if (updatedImages.length > 0 && !updatedImages.some(img => img.is_primary)) {
      updatedImages[0].is_primary = true;
    }
    
    onImagesUpdate(updatedImages);
  };

  const openCropDialog = (index) => {
    setSelectedImageIndex(index);
    setCropImage(images[index]);
    setZoom(1);
    setRotation(0);
    setCropDialogOpen(true);
  };

  const applyCrop = async () => {
    if (!cropImage || !canvasRef.current || !imageRef.current) return;
    
    setUploading(true);
    try {
      const canvas = canvasRef.current;
      const img = imageRef.current;
      
      // Create a new canvas for the cropped image
      const outputCanvas = document.createElement('canvas');
      const outputCtx = outputCanvas.getContext('2d');
      
      // Set output size (maintain aspect ratio, max 1200px)
      const maxSize = 1200;
      const scale = Math.min(maxSize / img.naturalWidth, maxSize / img.naturalHeight, 1);
      outputCanvas.width = img.naturalWidth * scale;
      outputCanvas.height = img.naturalHeight * scale;
      
      // Apply rotation
      if (rotation !== 0) {
        outputCtx.translate(outputCanvas.width / 2, outputCanvas.height / 2);
        outputCtx.rotate((rotation * Math.PI) / 180);
        outputCtx.translate(-outputCanvas.width / 2, -outputCanvas.height / 2);
      }
      
      // Apply zoom and draw
      const zoomedWidth = outputCanvas.width * zoom;
      const zoomedHeight = outputCanvas.height * zoom;
      const x = (outputCanvas.width - zoomedWidth) / 2;
      const y = (outputCanvas.height - zoomedHeight) / 2;
      
      outputCtx.drawImage(img, x, y, zoomedWidth, zoomedHeight);
      
      // Convert to blob and upload
      outputCanvas.toBlob(async (blob) => {
        try {
          const file = new File([blob], `cropped_${Date.now()}.jpg`, { type: 'image/jpeg' });
          const result = await UploadFile({ file });
          const croppedUrl = result.file_url;
          
          // Generate new thumbnail
          const thumbnailUrl = await generateThumbnail(file);
          
          // Update the image
          const updatedImages = [...images];
          updatedImages[selectedImageIndex] = {
            ...updatedImages[selectedImageIndex],
            url: croppedUrl,
            thumbnail_url: thumbnailUrl || croppedUrl
          };
          
          onImagesUpdate(updatedImages);
          setCropDialogOpen(false);
          
        } catch (error) {
          console.error("Error uploading cropped image:", error);
          alert('שגיאה בשמירת התמונה');
        } finally {
          setUploading(false);
        }
      }, 'image/jpeg', 0.9);
      
    } catch (error) {
      console.error("Error applying crop:", error);
      alert('שגיאה בעיבוד התמונה');
      setUploading(false);
    }
  };

  const primaryImage = images.find(img => img.is_primary) || images[0];

  return (
    <div className="space-y-4">
      {/* Primary Image Display */}
      {primaryImage && (
        <Card>
          <CardContent className="p-4">
            <Label className="text-sm font-semibold mb-2 block">תמונה ראשית</Label>
            <div className="relative">
              <img
                src={primaryImage.url}
                alt={productName}
                className="w-full h-64 object-cover rounded border border-stone-200"
              />
              <div className="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
                <Star className="w-3 h-3 fill-white" />
                ראשית
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Button */}
      <div>
        <input
          type="file"
          accept="image/*"
          multiple
          id="image-upload-multi"
          className="hidden"
          onChange={(e) => handleUpload(e.target.files)}
          disabled={uploading}
        />
        <label htmlFor="image-upload-multi">
          <Button
            asChild
            className="w-full bg-blue-500 hover:bg-blue-600 text-white"
            disabled={uploading}
          >
            <span className="cursor-pointer flex items-center justify-center">
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  מעלה תמונות...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 ml-2" />
                  הוסף תמונות
                </>
              )}
            </span>
          </Button>
        </label>
        <p className="text-xs text-stone-500 text-center mt-1">
          ניתן להעלות מספר תמונות בו-זמנית
        </p>
      </div>

      {/* Image Gallery */}
      {images.length > 0 && (
        <div>
          <Label className="text-sm font-semibold mb-3 block">
            גלריית תמונות ({images.length})
          </Label>
          <div className="grid grid-cols-3 gap-3">
            {images.map((image, index) => (
              <div key={index} className="relative group">
                <img
                  src={image.thumbnail_url || image.url}
                  alt={`${productName} ${index + 1}`}
                  className={`w-full h-24 object-cover rounded border-2 transition-all ${
                    image.is_primary 
                      ? 'border-yellow-500 ring-2 ring-yellow-200' 
                      : 'border-stone-200 hover:border-blue-300'
                  }`}
                />
                
                {/* Primary Badge */}
                {image.is_primary && (
                  <div className="absolute top-1 right-1 bg-yellow-500 text-white px-1.5 py-0.5 rounded text-xs font-semibold flex items-center gap-0.5">
                    <Star className="w-2.5 h-2.5 fill-white" />
                  </div>
                )}

                {/* Source Badge */}
                <div className="absolute top-1 left-1 bg-black/60 text-white px-1.5 py-0.5 rounded text-xs">
                  {image.source === 'ai' ? '🤖 AI' : 
                   image.source === 'uploaded' ? '📤' : 
                   '🌐'}
                </div>

                {/* Hover Actions */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center gap-1">
                  {!image.is_primary && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 bg-white/90 hover:bg-white"
                      onClick={() => handleSetPrimary(index)}
                      title="הגדר כראשית"
                    >
                      <Star className="w-4 h-4 text-yellow-600" />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 bg-white/90 hover:bg-white"
                    onClick={() => openCropDialog(index)}
                    title="ערוך תמונה"
                  >
                    <Crop className="w-4 h-4 text-blue-600" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 bg-white/90 hover:bg-white"
                    onClick={() => handleDelete(index)}
                    title="מחק"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Crop/Edit Dialog */}
      <Dialog open={cropDialogOpen} onOpenChange={setCropDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>עריכת תמונה</DialogTitle>
          </DialogHeader>
          
          {cropImage && (
            <div className="space-y-6 py-4">
              {/* Canvas Preview */}
              <div className="bg-stone-100 rounded-lg p-4 flex items-center justify-center min-h-[400px]">
                <div 
                  className="relative overflow-hidden bg-white shadow-lg"
                  style={{ 
                    maxWidth: '600px', 
                    maxHeight: '600px',
                    transform: `rotate(${rotation}deg)`
                  }}
                >
                  <img
                    ref={imageRef}
                    src={cropImage.url}
                    alt="Crop preview"
                    className="max-w-full max-h-full"
                    style={{
                      transform: `scale(${zoom})`,
                      transformOrigin: 'center'
                    }}
                  />
                  <canvas ref={canvasRef} className="hidden" />
                </div>
              </div>

              {/* Controls */}
              <div className="space-y-4">
                {/* Zoom */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="flex items-center gap-2">
                      <ZoomIn className="w-4 h-4" />
                      זום
                    </Label>
                    <span className="text-sm text-stone-600">{Math.round(zoom * 100)}%</span>
                  </div>
                  <Slider
                    value={[zoom]}
                    onValueChange={(values) => setZoom(values[0])}
                    min={0.5}
                    max={3}
                    step={0.1}
                    className="w-full"
                  />
                </div>

                {/* Rotation */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="flex items-center gap-2">
                      <RotateCw className="w-4 h-4" />
                      סיבוב
                    </Label>
                    <span className="text-sm text-stone-600">{rotation}°</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setRotation(r => r - 90)}
                      className="flex-1"
                    >
                      ← 90°
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setRotation(0)}
                      className="flex-1"
                    >
                      איפוס
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setRotation(r => r + 90)}
                      className="flex-1"
                    >
                      90° →
                    </Button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={applyCrop}
                  disabled={uploading}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white h-12"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                      שומר...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5 ml-2" />
                      שמור שינויים
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCropDialogOpen(false)}
                  disabled={uploading}
                  className="flex-1 h-12"
                >
                  <X className="w-5 h-5 ml-2" />
                  ביטול
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}