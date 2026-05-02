import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Cropper, { Area } from "react-easy-crop";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ZoomIn, ZoomOut, RotateCcw, Check, X } from "lucide-react";

interface ImageCropperProps {
  open: boolean;
  onClose: () => void;
  imageSrc: string;
  onCropComplete: (croppedBlob: Blob) => void;
  onError?: (message: string) => void;
  /** "avatar" = circle 1:1, "cover" = rectangle 3:1, "sticker" = square WhatsApp-like presets */
  mode: "avatar" | "cover" | "sticker";
  title?: string;
}

/**
 * Creates a cropped image blob from canvas.
 */
async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  rotation = 0,
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  const radians = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(radians));
  const cos = Math.abs(Math.cos(radians));

  // Compute bounding box of the rotated image
  const bBoxWidth = image.width * cos + image.height * sin;
  const bBoxHeight = image.width * sin + image.height * cos;

  // Set canvas size to match the crop area
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // Translate and rotate
  ctx.translate(-pixelCrop.x, -pixelCrop.y);
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(radians);
  ctx.translate(-image.width / 2, -image.height / 2);

  ctx.drawImage(image, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas toBlob failed"));
      },
      "image/jpeg",
      0.92,
    );
  });
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.crossOrigin = "anonymous";
    image.src = url;
  });
}

export default function ImageCropper({
  open,
  onClose,
  imageSrc,
  onCropComplete,
  onError,
  mode,
  title,
}: ImageCropperProps) {
  const { t } = useTranslation();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const [stickerPreset, setStickerPreset] = useState<"fit" | "fill" | "head" | "wide">("fit");

  const aspect = mode === "cover" ? 3 / 1 : 1;
  const cropShape = mode === "avatar" ? "round" : "rect";

  const onCropChange = useCallback(
    (_: Area, croppedAreaPx: Area) => {
      setCroppedAreaPixels(croppedAreaPx);
    },
    [],
  );

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    setSaving(true);
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
      onCropComplete(croppedBlob);
      onClose();
    } catch {
      onError?.(t("childProfile.uploadFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setStickerPreset("fit");
  };

  const applyStickerPreset = (preset: "fit" | "fill" | "head" | "wide") => {
    setStickerPreset(preset);
    if (preset === "fit") {
      setZoom(1);
      setCrop({ x: 0, y: 0 });
      return;
    }
    if (preset === "fill") {
      setZoom(1.25);
      setCrop({ x: 0, y: 0 });
      return;
    }
    if (preset === "head") {
      setZoom(1.35);
      setCrop({ x: 0, y: -18 });
      return;
    }
    setZoom(1.2);
    setCrop({ x: 0, y: 12 });
  };

  const defaultTitle =
    mode === "avatar"
      ? "قص صورة الملف الشخصي"
      : mode === "sticker"
        ? "قص صورة الملصق"
        : "قص صورة الغلاف";

  useEffect(() => {
    if (!open) return;
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setStickerPreset("fit");
  }, [open, imageSrc, mode]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle>{title || defaultTitle}</DialogTitle>
        </DialogHeader>

        {/* Crop area */}
        <div className="relative w-full h-[300px] sm:h-[350px] bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspect}
            cropShape={cropShape}
            showGrid={mode !== "avatar"}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropChange}
          />
        </div>

        {mode === "sticker" && (
          <div className="px-4 pt-2 pb-1 grid grid-cols-2 gap-2">
            <Button
              type="button"
              size="sm"
              variant={stickerPreset === "fit" ? "default" : "outline"}
              onClick={() => applyStickerPreset("fit")}
            >
              {t("taskForm.stickerPresetFit")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={stickerPreset === "fill" ? "default" : "outline"}
              onClick={() => applyStickerPreset("fill")}
            >
              {t("taskForm.stickerPresetFill")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={stickerPreset === "head" ? "default" : "outline"}
              onClick={() => applyStickerPreset("head")}
            >
              {t("taskForm.stickerPresetHead")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={stickerPreset === "wide" ? "default" : "outline"}
              onClick={() => applyStickerPreset("wide")}
            >
              {t("taskForm.stickerPresetWide")}
            </Button>
          </div>
        )}

        {/* Controls */}
        <div className="px-4 pb-2 space-y-3">
          {/* Zoom */}
          <div className="flex items-center gap-3">
            <ZoomOut className="h-4 w-4 text-muted-foreground shrink-0" />
            <Slider
              min={1}
              max={3}
              step={0.05}
              value={[zoom]}
              onValueChange={(v) => setZoom(v[0])}
              className="flex-1"
            />
            <ZoomIn className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>

          {/* Rotation */}
          <div className="flex items-center gap-3">
            <RotateCcw className="h-4 w-4 text-muted-foreground shrink-0" />
            <Slider
              min={0}
              max={360}
              step={1}
              value={[rotation]}
              onValueChange={(v) => setRotation(v[0])}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground w-10 text-center shrink-0">
              {rotation}°
            </span>
          </div>
        </div>

        <DialogFooter className="p-4 pt-0 flex gap-2">
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RotateCcw className="h-3.5 w-3.5 ml-1" />
            إعادة تعيين
          </Button>
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="h-3.5 w-3.5 ml-1" />
            إلغاء
          </Button>
          <Button size="sm" onClick={handleConfirm} disabled={saving}>
            <Check className="h-3.5 w-3.5 ml-1" />
            {saving ? "جاري القص..." : "تأكيد"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
