import React, { useCallback, useEffect, useMemo, useState, useRef, lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, CheckCircle2, XCircle, ImagePlus, Plus, Trash2, Upload, Smile, Wand2, AlertCircle, Mic, Camera, Video } from "lucide-react";
import type { Media } from "@shared/media";

// Lazy-load the entire symbol library so Three.js bundle is never fetched until needed
const SymbolLibrary3D = lazy(() => import("@/components/symbol-library/SymbolLibrary3D"));
const ImageCropper = lazy(() => import("@/components/ImageCropper"));

export type TaskFormValue = {
  title: string;
  question: string;
  answers: {
    id: string;
    text: string;
    isCorrect: boolean;
    imageUrl?: string;
    media?: Media;
    stickerId?: string;
    stickerVariant?: "full" | "circle" | "rounded" | "diamond";
  }[];
  pointsReward: number;
  difficulty?: string;
  subjectId?: string;
  isPublic?: boolean;
  pointsCost?: number;
  taskMedia?: Media | null;
};

type TaskFormProps = {
  mode: "admin" | "parent";
  token?: string; // optional override (admin passes token prop). Parent falls back to localStorage token
  initialValue: TaskFormValue;
  onSubmit: (value: TaskFormValue) => Promise<void> | void;
  submitting?: boolean;
  subjects?: { id: string; name: string; emoji?: string }[];
  showSubject?: boolean;
  allowDifficulty?: boolean;
  allowPublic?: boolean;
  allowTaskMedia?: boolean;
  submitLabel?: string;
  submitDisabled?: boolean;
  submitHelperText?: string;
  enableDraftPersistence?: boolean;
  draftStorageKey?: string;
};

type UploadState = "idle" | "uploading" | "success" | "error";

type UploadStatus = {
  state: UploadState;
  message?: string;
};

type RecorderTarget =
  | { type: "task" }
  | { type: "answer"; answerIndex: number };

const DEFAULT_ANSWERS: TaskFormValue["answers"] = [
  { id: "1", text: "", isCorrect: true },
  { id: "2", text: "", isCorrect: false },
  { id: "3", text: "", isCorrect: false },
];

type FormFieldErrors = {
  question?: string;
  answers?: string;
  correctAnswer?: string;
};

function hasTextContent(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function hasMediaUrl(value?: Media | null): boolean {
  return !!value?.url;
}

function hasAnswerContent(answer: TaskFormValue["answers"][number]): boolean {
  return hasTextContent(answer.text) || hasTextContent(answer.imageUrl) || hasMediaUrl(answer.media);
}

function hasTaskQuestionContent(form: TaskFormValue): boolean {
  return hasTextContent(form.question) || hasMediaUrl(form.taskMedia);
}

function hasAnyFormContent(form: TaskFormValue): boolean {
  return (
    hasTextContent(form.title) ||
    hasTaskQuestionContent(form) ||
    form.answers.some((answer) => hasAnswerContent(answer))
  );
}

function isLikelyAudio(media?: Media, fallbackUrl?: string): boolean {
  const mime = String(media?.mimeType || "").toLowerCase();
  if (mime.startsWith("audio/")) return true;
  const url = String(fallbackUrl || media?.url || "").toLowerCase();
  return /\.(mp3|wav|ogg|m4a|aac|webm)(\?|$)/.test(url);
}

function isLikelyVideo(media?: Media, fallbackUrl?: string): boolean {
  const mime = String(media?.mimeType || "").toLowerCase();
  if (mime.startsWith("video/")) return true;
  const url = String(fallbackUrl || media?.url || "").toLowerCase();
  return /\.(mp4|webm|mov|mkv)(\?|$)/.test(url);
}

function useAuthHeaders(mode: "admin" | "parent", token?: string) {
  return useMemo(() => {
    const authToken = token || (mode === "parent" ? localStorage.getItem("token") || undefined : undefined);
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
    return headers;
  }, [mode, token]);
}

async function uploadMedia({
  file,
  mode,
  headers,
  purpose,
}: {
  file: File;
  mode: "admin" | "parent";
  headers: Record<string, string>;
  purpose: string;
}): Promise<Media> {
  const presignRes = await fetch(`/api/${mode}/uploads/presign`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      contentType: file.type,
      size: file.size,
      purpose,
      originalName: file.name,
    }),
  });
  const presignJson = await presignRes.json();
  if (!presignRes.ok || presignJson?.success === false) {
    throw new Error(presignJson?.message || "Failed to presign upload");
  }

  const presignData = presignJson.data || presignJson;

  const putHeaders: Record<string, string> = {};
  if (file.type) putHeaders["Content-Type"] = file.type;

  let uploaded = false;
  let uploadError = "Failed to upload object to storage";

  try {
    const putRes = await fetch(presignData.uploadURL, {
      method: "PUT",
      headers: putHeaders,
      body: file,
    });
    if (putRes.ok) {
      uploaded = true;
    } else {
      uploadError = "Failed to upload object to storage";
    }
  } catch {
    uploadError = "Failed to upload object to storage";
  }

  // Mobile webviews can fail direct PUT to object storage due to CORS/network constraints.
  // Parent proxy keeps upload stable by forwarding the same body from server-side.
  if (!uploaded && mode === "parent") {
    const proxyRes = await fetch("/api/parent/uploads/proxy", {
      method: "PUT",
      headers: {
        ...(headers.Authorization ? { Authorization: headers.Authorization } : {}),
        "Content-Type": file.type || "application/octet-stream",
        "x-upload-object-path": String(presignData.objectPath || ""),
      },
      body: file,
    });
    const proxyJson = await proxyRes.json().catch(() => null);
    if (!proxyRes.ok || proxyJson?.success === false) {
      throw new Error(proxyJson?.message || uploadError);
    }
    uploaded = true;
  }

  if (!uploaded) {
    throw new Error(uploadError);
  }

  const finalizeRes = await fetch(`/api/${mode}/uploads/finalize`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      objectPath: presignData.objectPath || presignData.uploadURL,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      originalName: file.name,
      purpose,
    }),
  });
  const finalizeJson = await finalizeRes.json();
  if (!finalizeRes.ok || finalizeJson?.success === false) {
    throw new Error(finalizeJson?.message || "Failed to finalize upload");
  }
  return finalizeJson.data || finalizeJson;
}

async function optimizeImageForUpload(file: File, maxEdge = 1920, quality = 0.86): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  if (file.type.toLowerCase() === "image/gif") return file;

  const shouldTryOptimize = file.size > 2 * 1024 * 1024;
  if (!shouldTryOptimize) return file;

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Image decode failed"));
    };
    img.src = objectUrl;
  });

  const edge = Math.max(image.width, image.height);
  if (edge <= maxEdge && file.size <= 4 * 1024 * 1024) {
    return file;
  }

  const ratio = Math.min(1, maxEdge / Math.max(edge, 1));
  const width = Math.max(1, Math.round(image.width * ratio));
  const height = Math.max(1, Math.round(image.height * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, 0, 0, width, height);

  const outMime = file.type === "image/png" ? "image/png" : "image/jpeg";
  const optimizedBlob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, outMime, outMime === "image/jpeg" ? quality : undefined);
  });
  if (!optimizedBlob) return file;

  const ext = outMime === "image/png" ? "png" : "jpg";
  const baseName = file.name.replace(/\.[^.]+$/, "") || "upload";
  return new File([optimizedBlob], `${baseName}.${ext}`, { type: outMime });
}

type StickerVariant = {
  id: "full" | "circle" | "rounded" | "diamond";
  dataUrl: string;
};

async function generateStickerVariants(sourceUrl: string): Promise<StickerVariant[]> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = sourceUrl;
  });

  const size = 512;

  const renderVariant = ({
    fit,
    anchor,
    background,
  }: {
    fit: "contain" | "cover";
    anchor: "center" | "top";
    background: "transparent" | "soft";
  }) => {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");

    if (background === "soft") {
      const grad = ctx.createLinearGradient(0, 0, size, size);
      grad.addColorStop(0, "#f3f6ff");
      grad.addColorStop(1, "#e9eef7");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
    } else {
      ctx.clearRect(0, 0, size, size);
    }

    const ratio = fit === "cover"
      ? Math.max(size / image.width, size / image.height)
      : Math.min(size / image.width, size / image.height);

    const drawWidth = image.width * ratio;
    const drawHeight = image.height * ratio;
    const dx = (size - drawWidth) / 2;
    const dy = anchor === "top" ? 0 : (size - drawHeight) / 2;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(image, dx, dy, drawWidth, drawHeight);

    return canvas.toDataURL("image/png", 0.95);
  };

  return [
    {
      id: "full",
      dataUrl: renderVariant({ fit: "cover", anchor: "center", background: "transparent" }),
    },
    {
      id: "circle",
      dataUrl: renderVariant({ fit: "contain", anchor: "center", background: "transparent" }),
    },
    {
      id: "rounded",
      dataUrl: renderVariant({ fit: "cover", anchor: "top", background: "transparent" }),
    },
    {
      id: "diamond",
      dataUrl: renderVariant({ fit: "contain", anchor: "center", background: "soft" }),
    },
  ];
}

function dataUrlToFile(dataUrl: string, fileName: string): File {
  const parts = dataUrl.split(",");
  const mime = parts[0].match(/:(.*?);/)?.[1] || "image/png";
  const binary = atob(parts[1]);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], fileName, { type: mime });
}

async function uploadStickerWithFallback({
  file,
  mode,
  headers,
}: {
  file: File;
  mode: "admin" | "parent";
  headers: Record<string, string>;
}) {
  try {
    return await uploadMedia({ file, mode, headers, purpose: "sticker_media" });
  } catch (primaryError: any) {
    try {
      return await uploadMedia({ file, mode, headers, purpose: "answer_media" });
    } catch (fallbackError: any) {
      throw new Error(
        fallbackError?.message || primaryError?.message || "فشل رفع الملصق"
      );
    }
  }
}

export function TaskForm({
  mode,
  token,
  initialValue,
  onSubmit,
  submitting,
  subjects,
  showSubject,
  allowDifficulty = true,
  allowPublic = false,
  allowTaskMedia = true,
  submitLabel,
  submitDisabled = false,
  submitHelperText,
  enableDraftPersistence,
  draftStorageKey,
}: TaskFormProps) {
  const { t } = useTranslation();
  const effectiveSubmitLabel = submitLabel || t("taskForm.saveTask");
  const [form, setForm] = useState<TaskFormValue>({ ...initialValue });
  const [answerUploadStatus, setAnswerUploadStatus] = useState<Record<string, UploadStatus>>({});
  const [uploadingTaskMedia, setUploadingTaskMedia] = useState(false);
  const [taskMediaUploadStatus, setTaskMediaUploadStatus] = useState<UploadStatus>({ state: "idle" });
  const [answerUploadErrors, setAnswerUploadErrors] = useState<Record<string, string>>({});
  const [taskUploadError, setTaskUploadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FormFieldErrors>({});
  const [draftRecovered, setDraftRecovered] = useState(false);
  const [generatingStickerFor, setGeneratingStickerFor] = useState<string | null>(null);
  const [savingStickerFor, setSavingStickerFor] = useState<string | null>(null);
  const [stickerOptions, setStickerOptions] = useState<Record<string, StickerVariant[]>>({});
  const [myStickers, setMyStickers] = useState<any[]>([]);
  const [symbolPickerOpen, setSymbolPickerOpen] = useState(false);
  const [symbolTarget, setSymbolTarget] = useState<"question" | "title" | `answer-${number}`>("question");
  const [uploadCropOpen, setUploadCropOpen] = useState(false);
  const [uploadCropImage, setUploadCropImage] = useState("");
  const [uploadCropTarget, setUploadCropTarget] = useState<
    | {
      type: "task";
      fileName: string;
    }
    | {
      type: "answer";
      fileName: string;
      answerIndex: number;
    }
    | null
  >(null);
  const [recorderOpen, setRecorderOpen] = useState(false);
  const [recorderTarget, setRecorderTarget] = useState<RecorderTarget | null>(null);
  const [recorderMode, setRecorderMode] = useState<"audio" | "video">("audio");
  const [isLiveRecording, setIsLiveRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedPreviewUrl, setRecordedPreviewUrl] = useState("");
  const [recorderError, setRecorderError] = useState<string | null>(null);
  const livePreviewVideoRef = useRef<HTMLVideoElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recorderStreamRef = useRef<MediaStream | null>(null);
  const recorderChunksRef = useRef<Blob[]>([]);
  const taskCameraInputRef = useRef<HTMLInputElement | null>(null);
  const answerCameraInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const questionRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const answersSectionRef = useRef<HTMLDivElement>(null);
  const answerInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const pendingAnswerFocusId = useRef<string | null>(null);

  const shouldPersistDraft = enableDraftPersistence ?? mode === "parent";
  const resolvedDraftStorageKey = draftStorageKey || `task-form-draft:${mode}:${showSubject ? "subject" : "plain"}`;

  const headers = useAuthHeaders(mode, token);

  useEffect(() => {
    setForm({ ...initialValue });
    setAnswerUploadStatus({});
    setTaskMediaUploadStatus({ state: "idle" });
    setAnswerUploadErrors({});
    setTaskUploadError(null);
    setSubmitError(null);
    setFieldErrors({});
    setDraftRecovered(false);
  }, [initialValue]);

  useEffect(() => {
    const loadMyStickers = async () => {
      try {
        const res = await fetch("/api/parent/stickers/my", { headers });
        const json = await res.json();
        if (res.ok && json?.success) {
          setMyStickers(Array.isArray(json.data) ? json.data : []);
        }
      } catch {
        // Keep form usable even if sticker list fails.
      }
    };

    if (mode === "parent" && headers.Authorization) {
      loadMyStickers();
    }
  }, [mode, headers]);

  useEffect(() => {
    if (!shouldPersistDraft) return;

    const initialHasData = hasAnyFormContent(initialValue);
    if (initialHasData) return;

    try {
      const raw = localStorage.getItem(resolvedDraftStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as TaskFormValue;
      if (!parsed || typeof parsed !== "object") return;
      if (!hasAnyFormContent(parsed)) return;

      const safeAnswers = Array.isArray(parsed.answers) && parsed.answers.length >= 2
        ? parsed.answers.map((answer, index) => ({
          id: String(answer?.id || index + 1),
          text: String(answer?.text || ""),
          isCorrect: !!answer?.isCorrect,
          imageUrl: typeof answer?.imageUrl === "string" ? answer.imageUrl : undefined,
          media: answer?.media,
          stickerId: typeof answer?.stickerId === "string" ? answer.stickerId : undefined,
          stickerVariant: ["full", "circle", "rounded", "diamond"].includes(String(answer?.stickerVariant))
            ? (answer?.stickerVariant as "full" | "circle" | "rounded" | "diamond")
            : undefined,
        }))
        : DEFAULT_ANSWERS;

      setForm({
        ...initialValue,
        ...parsed,
        title: String(parsed.title || ""),
        question: String(parsed.question || ""),
        pointsReward: Number(parsed.pointsReward || initialValue.pointsReward || 10),
        answers: safeAnswers,
      });
      setDraftRecovered(true);
    } catch {
      // Ignore invalid local draft content and continue with form defaults.
    }
  }, [initialValue, resolvedDraftStorageKey, shouldPersistDraft]);

  useEffect(() => {
    if (!shouldPersistDraft) return;

    const timer = window.setTimeout(() => {
      try {
        if (!hasAnyFormContent(form)) {
          localStorage.removeItem(resolvedDraftStorageKey);
          return;
        }
        localStorage.setItem(resolvedDraftStorageKey, JSON.stringify(form));
      } catch {
        // Keep form operable even when localStorage quota is exceeded.
      }
    }, 450);

    return () => window.clearTimeout(timer);
  }, [form, resolvedDraftStorageKey, shouldPersistDraft]);

  useEffect(() => {
    if (!shouldPersistDraft) return;

    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasAnyFormContent(form)) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [form, shouldPersistDraft]);

  useEffect(() => {
    const pendingId = pendingAnswerFocusId.current;
    if (!pendingId) return;
    const target = answerInputRefs.current[pendingId];
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    pendingAnswerFocusId.current = null;
  }, [form.answers]);

  const answers = form.answers?.length ? form.answers : DEFAULT_ANSWERS;

  const getStickerVariantLabel = (variantId: StickerVariant["id"]) => {
    if (variantId === "full") return t("taskForm.stickerVariantFill");
    if (variantId === "circle") return t("taskForm.stickerVariantFit");
    if (variantId === "rounded") return t("taskForm.stickerVariantTop");
    return t("taskForm.stickerVariantSoft");
  };

  const setAnswer = (idx: number, updater: (a: TaskFormValue["answers"][number]) => TaskFormValue["answers"][number]) => {
    const updated = [...answers];
    updated[idx] = updater({ ...updated[idx] });
    setForm({ ...form, answers: updated });
    setFieldErrors((prev) => ({ ...prev, answers: undefined, correctAnswer: undefined }));
  };

  const handleToggleCorrect = (idx: number) => {
    const updated = answers.map((a, i) => ({ ...a, isCorrect: i === idx }));
    setForm({ ...form, answers: updated });
    setFieldErrors((prev) => ({ ...prev, correctAnswer: undefined }));
  };

  const handleAddAnswer = () => {
    const nextId = String(answers.length + 1);
    pendingAnswerFocusId.current = nextId;
    setForm({ ...form, answers: [...answers, { id: nextId, text: "", isCorrect: false }] });
    setFieldErrors((prev) => ({ ...prev, answers: undefined }));
  };

  const handleRemoveAnswer = (idx: number) => {
    if (answers.length <= 2) return;
    const updated = answers.filter((_, i) => i !== idx);
    // Ensure one correct remains; default to first item
    if (!updated.some((a) => a.isCorrect)) {
      updated[0].isCorrect = true;
    }
    setForm({ ...form, answers: updated });
    setFieldErrors((prev) => ({ ...prev, answers: undefined, correctAnswer: undefined }));
  };

  const handleAnswerUpload = async (file: File, idx: number): Promise<boolean> => {
    const answerId = answers[idx].id;
    try {
      setAnswerUploadStatus((prev) => ({
        ...prev,
        [answerId]: { state: "uploading", message: "جاري رفع الوسائط..." },
      }));
      setAnswerUploadErrors((prev) => ({ ...prev, [answerId]: "" }));
      const optimizedFile = await optimizeImageForUpload(file, 1600, 0.86);
      const media = await uploadMedia({ file: optimizedFile, mode, headers, purpose: "answer_media" });
      setAnswer(idx, (a) => ({ ...a, imageUrl: media.url, media, stickerId: undefined, stickerVariant: undefined }));
      setAnswerUploadStatus((prev) => ({
        ...prev,
        [answerId]: { state: "success", message: "تم رفع الوسائط بنجاح" },
      }));
      setFieldErrors((prev) => ({ ...prev, answers: undefined }));
      return true;
    } catch (error: any) {
      const message = error?.message || "فشل رفع الوسائط";
      setAnswerUploadErrors((prev) => ({
        ...prev,
        [answerId]: message,
      }));
      setAnswerUploadStatus((prev) => ({
        ...prev,
        [answerId]: { state: "error", message },
      }));
      return false;
    }
  };

  const handleTaskMediaUpload = async (file: File): Promise<boolean> => {
    try {
      setUploadingTaskMedia(true);
      setTaskUploadError(null);
      setTaskMediaUploadStatus({ state: "uploading", message: "جاري رفع وسائط السؤال..." });
      const optimizedFile = await optimizeImageForUpload(file, 1920, 0.86);
      const media = await uploadMedia({ file: optimizedFile, mode, headers, purpose: "task_media" });
      setForm({ ...form, taskMedia: media });
      setTaskMediaUploadStatus({ state: "success", message: "تم رفع وسائط السؤال بنجاح" });
      setFieldErrors((prev) => ({ ...prev, question: undefined }));
      return true;
    } catch (error: any) {
      const message = error?.message || "فشل رفع الوسائط";
      setTaskUploadError(message);
      setTaskMediaUploadStatus({ state: "error", message });
      return false;
    } finally {
      setUploadingTaskMedia(false);
    }
  };

  const stopRecorderTracks = useCallback(() => {
    if (recorderStreamRef.current) {
      recorderStreamRef.current.getTracks().forEach((track) => track.stop());
      recorderStreamRef.current = null;
    }
    if (livePreviewVideoRef.current) {
      livePreviewVideoRef.current.srcObject = null;
    }
  }, []);

  const clearRecordedPreview = useCallback(() => {
    if (recordedPreviewUrl) {
      URL.revokeObjectURL(recordedPreviewUrl);
    }
    setRecordedPreviewUrl("");
    setRecordedBlob(null);
  }, [recordedPreviewUrl]);

  const openLiveRecorder = (target: RecorderTarget) => {
    setRecorderTarget(target);
    setRecorderMode("audio");
    setRecorderError(null);
    clearRecordedPreview();
    setRecorderOpen(true);
  };

  const startLiveRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setRecorderError(t("taskForm.recorderNotSupported"));
      return;
    }

    try {
      setRecorderError(null);
      clearRecordedPreview();

      const wantsVideo = recorderMode === "video";
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: wantsVideo ? { facingMode: "user" } : false,
      });

      recorderStreamRef.current = stream;
      recorderChunksRef.current = [];

      if (wantsVideo && livePreviewVideoRef.current) {
        livePreviewVideoRef.current.srcObject = stream;
        await livePreviewVideoRef.current.play().catch(() => undefined);
      }

      const candidateMimeTypes = wantsVideo
        ? [
          "video/webm;codecs=vp9,opus",
          "video/webm;codecs=vp8,opus",
          "video/webm",
          "video/mp4",
        ]
        : [
          "audio/webm;codecs=opus",
          "audio/webm",
          "audio/mp4",
        ];

      const selectedMimeType = candidateMimeTypes.find((mimeType) => MediaRecorder.isTypeSupported?.(mimeType));
      const mediaRecorder = selectedMimeType
        ? new MediaRecorder(stream, { mimeType: selectedMimeType })
        : new MediaRecorder(stream);

      recorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recorderChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        setIsLiveRecording(false);
        stopRecorderTracks();
        const mimeType = mediaRecorder.mimeType || (wantsVideo ? "video/webm" : "audio/webm");
        const blob = new Blob(recorderChunksRef.current, { type: mimeType });
        recorderChunksRef.current = [];

        if (blob.size === 0) {
          setRecorderError(t("taskForm.emptyRecording"));
          return;
        }

        const previewUrl = URL.createObjectURL(blob);
        setRecordedBlob(blob);
        setRecordedPreviewUrl(previewUrl);
      };

      mediaRecorder.start();
      setIsLiveRecording(true);
    } catch {
      stopRecorderTracks();
      setIsLiveRecording(false);
      setRecorderError(t("taskForm.recorderPermissionDenied"));
    }
  };

  const stopLiveRecording = () => {
    const mediaRecorder = recorderRef.current;
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
  };

  const closeLiveRecorder = () => {
    stopLiveRecording();
    stopRecorderTracks();
    setIsLiveRecording(false);
    setRecorderTarget(null);
    setRecorderError(null);
    clearRecordedPreview();
    setRecorderOpen(false);
  };

  const retakeRecording = () => {
    clearRecordedPreview();
    setRecorderError(null);
  };

  const useRecordedMedia = async () => {
    if (!recordedBlob || !recorderTarget) return;

    const isVideo = String(recordedBlob.type || "").startsWith("video/");
    const mimeType = recordedBlob.type || (isVideo ? "video/webm" : "audio/webm");
    const extension = isVideo ? "webm" : "webm";
    const targetPrefix = recorderTarget.type === "task" ? "question" : "answer";
    const file = new File([recordedBlob], `${targetPrefix}-recording-${Date.now()}.${extension}`, { type: mimeType });

    const uploaded = recorderTarget.type === "task"
      ? await handleTaskMediaUpload(file)
      : await handleAnswerUpload(file, recorderTarget.answerIndex);

    if (uploaded) {
      closeLiveRecorder();
    }
  };

  useEffect(() => {
    return () => {
      stopRecorderTracks();
      if (recordedPreviewUrl) {
        URL.revokeObjectURL(recordedPreviewUrl);
      }
    };
  }, [recordedPreviewUrl, stopRecorderTracks]);

  const handleGenerateStickers = async (idx: number) => {
    const answer = answers[idx];
    if (!answer?.imageUrl) return;
    if (answer.media?.mimeType && !answer.media.mimeType.startsWith("image/")) {
      setAnswerUploadErrors((prev) => ({ ...prev, [answer.id]: "إنشاء الملصق متاح للصور فقط" }));
      return;
    }
    try {
      setGeneratingStickerFor(answer.id);
      const variants = await generateStickerVariants(answer.imageUrl);
      setStickerOptions((prev) => ({ ...prev, [answer.id]: variants }));
    } catch (error) {
      setAnswerUploadErrors((prev) => ({ ...prev, [answer.id]: "فشل إنشاء خيارات الملصق" }));
    } finally {
      setGeneratingStickerFor(null);
    }
  };

  const handleSaveSticker = async (idx: number, variant: StickerVariant) => {
    const answer = answers[idx];
    if (!answer) return;

    try {
      setSavingStickerFor(answer.id);
      setAnswerUploadErrors((prev) => ({ ...prev, [answer.id]: "" }));

      const stickerFile = dataUrlToFile(variant.dataUrl, `${answer.id}-${variant.id}.png`);
      const stickerMedia = await uploadStickerWithFallback({ file: stickerFile, mode, headers });

      const saveRes = await fetch("/api/parent/stickers", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: `${form.title || "Sticker"} - ${getStickerVariantLabel(variant.id)}`,
          sourceImageUrl: answer.imageUrl,
          variant: variant.id,
          stickerMedia,
        }),
      });
      const saveJson = await saveRes.json();
      if (!saveRes.ok || !saveJson?.success) {
        throw new Error(saveJson?.message || "فشل حفظ الملصق");
      }

      const savedSticker = saveJson.data;
      setMyStickers((prev) => [savedSticker, ...prev]);
      setAnswer(idx, (a) => ({
        ...a,
        imageUrl: stickerMedia.url,
        media: stickerMedia,
        stickerId: savedSticker.id,
        stickerVariant: variant.id,
      }));
      setAnswerUploadStatus((prev) => ({
        ...prev,
        [answer.id]: { state: "success", message: "تم حفظ الملصق واختياره" },
      }));
    } catch (error: any) {
      setAnswerUploadErrors((prev) => ({ ...prev, [answer.id]: error?.message || "فشل حفظ الملصق" }));
    } finally {
      setSavingStickerFor(null);
    }
  };

  const handleSaveAnimatedSticker = async (idx: number) => {
    const answer = answers[idx];
    if (!answer?.media || !answer.imageUrl) return;

    try {
      setSavingStickerFor(answer.id);
      setAnswerUploadErrors((prev) => ({ ...prev, [answer.id]: "" }));

      const saveRes = await fetch("/api/parent/stickers", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: `${form.title || "Sticker"} - GIF`,
          sourceImageUrl: answer.imageUrl,
          variant: "full",
          stickerMedia: answer.media,
        }),
      });
      const saveJson = await saveRes.json();
      if (!saveRes.ok || !saveJson?.success) {
        throw new Error(saveJson?.message || "فشل حفظ الملصق المتحرك");
      }

      const savedSticker = saveJson.data;
      setMyStickers((prev) => [savedSticker, ...prev]);
      setAnswer(idx, (a) => ({
        ...a,
        stickerId: savedSticker.id,
        stickerVariant: "full",
      }));
      setAnswerUploadStatus((prev) => ({
        ...prev,
        [answer.id]: { state: "success", message: "تم حفظ GIF كملصق متحرك" },
      }));
    } catch (error: any) {
      setAnswerUploadErrors((prev) => ({ ...prev, [answer.id]: error?.message || "فشل حفظ الملصق المتحرك" }));
    } finally {
      setSavingStickerFor(null);
    }
  };

  const handleUseSavedSticker = (idx: number, stickerId: string) => {
    const sticker = myStickers.find((s) => s.id === stickerId);
    if (!sticker) return;
    setAnswer(idx, (a) => ({
      ...a,
      imageUrl: sticker.stickerMedia?.url,
      media: sticker.stickerMedia,
      stickerId: sticker.id,
      stickerVariant: sticker.variant,
    }));
    setAnswerUploadStatus((prev) => ({
      ...prev,
      [answers[idx].id]: { state: "success", message: "تم اختيار ملصق محفوظ" },
    }));
  };

  const closeUploadCropper = () => {
    if (uploadCropImage.startsWith("blob:")) {
      URL.revokeObjectURL(uploadCropImage);
    }
    setUploadCropOpen(false);
    setUploadCropImage("");
    setUploadCropTarget(null);
  };

  const maybeCropBeforeUpload = (file: File, target: { type: "task" } | { type: "answer"; answerIndex: number }) => {
    const isImage = file.type.startsWith("image/");
    const isAnimatedGif = file.type.toLowerCase() === "image/gif";

    if (isImage && !isAnimatedGif) {
      const objectUrl = URL.createObjectURL(file);
      setUploadCropImage(objectUrl);
      if (target.type === "task") {
        setUploadCropTarget({ type: "task", fileName: file.name });
      } else {
        setUploadCropTarget({ type: "answer", answerIndex: target.answerIndex, fileName: file.name });
      }
      setUploadCropOpen(true);
      return;
    }

    if (target.type === "task") {
      void handleTaskMediaUpload(file);
    } else {
      void handleAnswerUpload(file, target.answerIndex);
    }
  };

  const handleCropCompleteForUpload = async (croppedBlob: Blob) => {
    const currentTarget = uploadCropTarget;
    if (!currentTarget) return;

    const baseName = currentTarget.fileName.replace(/\.[^.]+$/, "") || "cropped";
    const croppedFile = new File([croppedBlob], `${baseName}.jpg`, { type: "image/jpeg" });
    closeUploadCropper();

    if (currentTarget.type === "task") {
      await handleTaskMediaUpload(croppedFile);
      return;
    }

    await handleAnswerUpload(croppedFile, currentTarget.answerIndex);
  };

  const openSymbolPicker = (target: "question" | "title" | `answer-${number}`) => {
    setSymbolTarget(target);
    setSymbolPickerOpen(true);
  };

  const handleSymbolSelect = (symbol: { char: string }) => {
    if (symbolTarget === "question") {
      const el = questionRef.current;
      if (el) {
        const start = el.selectionStart ?? form.question.length;
        const end = el.selectionEnd ?? start;
        const newText = form.question.slice(0, start) + symbol.char + form.question.slice(end);
        setForm({ ...form, question: newText });
        // Restore cursor position after render
        requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = start + symbol.char.length; el.focus(); });
      } else {
        setForm({ ...form, question: form.question + symbol.char });
      }
    } else if (symbolTarget === "title") {
      const el = titleRef.current;
      if (el) {
        const start = el.selectionStart ?? form.title.length;
        const end = el.selectionEnd ?? start;
        const newText = form.title.slice(0, start) + symbol.char + form.title.slice(end);
        setForm({ ...form, title: newText });
        requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = start + symbol.char.length; el.focus(); });
      } else {
        setForm({ ...form, title: form.title + symbol.char });
      }
    } else if (symbolTarget.startsWith("answer-")) {
      const idx = parseInt(symbolTarget.split("-")[1]);
      if (!isNaN(idx) && idx < answers.length) {
        setAnswer(idx, a => ({ ...a, text: a.text + symbol.char }));
      }
    }
    setSymbolPickerOpen(false);
  };

  const focusQuestionField = () => {
    const target = questionRef.current;
    if (!target) return;
    target.focus();
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const focusAnswersSection = () => {
    const firstAnswer = answers.find((answer) => hasAnswerContent(answer));
    const targetInput = firstAnswer ? answerInputRefs.current[firstAnswer.id] : answerInputRefs.current[answers[0]?.id || ""];
    if (targetInput) {
      targetInput.focus();
      targetInput.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    answersSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleTitleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    focusQuestionField();
  };

  const handleAnswerInputKeyDown = (answerIndex: number): React.KeyboardEventHandler<HTMLInputElement> => (event) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    if (answerIndex >= answers.length - 1) {
      handleAddAnswer();
      return;
    }
    const next = answers[answerIndex + 1];
    if (!next) return;
    const target = answerInputRefs.current[next.id];
    target?.focus();
  };

  const validateBeforeSubmit = (): { valid: boolean; sanitizedAnswers: TaskFormValue["answers"] } => {
    const sanitizedAnswers = answers
      .map((answer) => ({
        ...answer,
        text: String(answer.text || "").trim(),
      }))
      .filter((answer) => hasAnswerContent(answer));

    const errors: FormFieldErrors = {};

    if (!hasTaskQuestionContent(form)) {
      errors.question = t("taskForm.requiredQuestionOrMedia");
    }

    if (sanitizedAnswers.length < 2) {
      errors.answers = t("taskForm.requiredTwoAnswers");
    }

    const correctCount = sanitizedAnswers.filter((answer) => answer.isCorrect).length;
    if (correctCount !== 1) {
      errors.correctAnswer = t("taskForm.requiredOneCorrectAnswer");
    }

    if (errors.question || errors.answers || errors.correctAnswer) {
      setFieldErrors(errors);
      if (errors.question) {
        focusQuestionField();
      } else {
        focusAnswersSection();
      }
      return { valid: false, sanitizedAnswers };
    }

    setFieldErrors({});
    return { valid: true, sanitizedAnswers };
  };

  const renderMediaPreview = ({
    media,
    fallbackUrl,
    alt,
    maxHeightClass,
  }: {
    media?: Media;
    fallbackUrl?: string;
    alt: string;
    maxHeightClass: string;
  }) => {
    const resolvedUrl = String(fallbackUrl || media?.url || "");
    if (!resolvedUrl) return null;

    if (isLikelyAudio(media, resolvedUrl)) {
      return (
        <audio
          src={resolvedUrl}
          controls
          preload="metadata"
          className="w-full"
        />
      );
    }

    if (isLikelyVideo(media, resolvedUrl)) {
      return (
        <video
          src={resolvedUrl}
          controls
          preload="metadata"
          className={`w-full ${maxHeightClass} rounded object-contain bg-black/70`}
        />
      );
    }

    return (
      <img
        src={resolvedUrl}
        alt={alt}
        className={`w-full ${maxHeightClass} rounded object-contain bg-black/5`}
      />
    );
  };

  const handleSubmit = async () => {
    const hasActiveUploads =
      uploadingTaskMedia ||
      generatingStickerFor !== null ||
      savingStickerFor !== null ||
      Object.values(answerUploadStatus).some((status) => status.state === "uploading");

    if (hasActiveUploads) {
      setSubmitError(t("taskForm.waitForUploadsBeforeSubmit"));
      return;
    }

    const validation = validateBeforeSubmit();
    if (!validation.valid) {
      setSubmitError(t("taskForm.validationFixHighlighted"));
      return;
    }

    try {
      setSubmitError(null);
      await onSubmit({
        ...form,
        title: String(form.title || "").trim(),
        question: String(form.question || "").trim(),
        answers: validation.sanitizedAnswers,
      });
      if (shouldPersistDraft) {
        localStorage.removeItem(resolvedDraftStorageKey);
      }
      setDraftRecovered(false);
    } catch (error) {
      console.error("Task submission error:", error);
      setSubmitError(t("taskForm.submitFailedRetry"));
    }
  };

  return (
    <div className="space-y-5">
      {draftRecovered && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-100">
          {t("taskForm.draftRecovered")}
        </div>
      )}

      {showSubject && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>{t("taskForm.subject")}</Label>
            <Select
              value={form.subjectId || ""}
              onValueChange={(v) => setForm({ ...form, subjectId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر المادة" />
              </SelectTrigger>
              <SelectContent>
                {(subjects || []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.emoji ? `${s.emoji} ` : ""}{s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t("taskForm.points")}</Label>
              <Input
                type="number"
                value={form.pointsReward}
                onChange={(e) => setForm({ ...form, pointsReward: parseInt(e.target.value) || 0 })}
              />
            </div>
            {allowDifficulty && (
              <div>
                <Label>الصعوبة</Label>
                <Select
                  value={form.difficulty || "medium"}
                  onValueChange={(v) => setForm({ ...form, difficulty: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="الصعوبة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">سهل</SelectItem>
                    <SelectItem value="medium">متوسط</SelectItem>
                    <SelectItem value="hard">صعب</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
      )}

      {!showSubject && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{t("taskForm.points")}</Label>
            <Input
              type="number"
              value={form.pointsReward}
              onChange={(e) => setForm({ ...form, pointsReward: parseInt(e.target.value) || 0 })}
            />
          </div>
          {allowDifficulty && (
            <div>
              <Label>الصعوبة</Label>
              <Select
                value={form.difficulty || "medium"}
                onValueChange={(v) => setForm({ ...form, difficulty: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="الصعوبة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">سهل</SelectItem>
                  <SelectItem value="medium">متوسط</SelectItem>
                  <SelectItem value="hard">صعب</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-1">
          <Label>عنوان المهمة</Label>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs gap-1"
            onClick={() => openSymbolPicker("title")}
          >
            <Smile className="h-3.5 w-3.5" />
            رمز
          </Button>
        </div>
        <Input
          ref={titleRef}
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          onKeyDown={handleTitleKeyDown}
          placeholder="اكتب العنوان"
          enterKeyHint="next"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <Label className={fieldErrors.question ? "text-red-600" : undefined}>السؤال</Label>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs gap-1"
            onClick={() => openSymbolPicker("question")}
          >
            <Smile className="h-3.5 w-3.5" />
            إدراج رمز
          </Button>
        </div>
        <Textarea
          ref={questionRef}
          value={form.question}
          onChange={(e) => {
            setForm({ ...form, question: e.target.value });
            if (fieldErrors.question) {
              setFieldErrors((prev) => ({ ...prev, question: undefined }));
            }
          }}
          placeholder="اكتب السؤال هنا..."
          enterKeyHint="done"
        />
        {fieldErrors.question && (
          <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5" />
            {fieldErrors.question}
          </p>
        )}
      </div>

      {allowTaskMedia && (
        <div>
          <Label>{t("taskForm.taskMediaOptional")}</Label>
          <div className="flex items-center gap-3 flex-wrap">
            <details className={`w-full rounded-lg border bg-muted/20 p-2 ${uploadingTaskMedia ? "pointer-events-none opacity-70" : ""}`}>
              <summary className="cursor-pointer list-none">
                <span className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                  <Upload className="h-4 w-4" />
                  {uploadingTaskMedia ? "جاري الرفع..." : "رفع وسائط"}
                </span>
              </summary>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                <Button asChild variant="outline" size="sm" disabled={uploadingTaskMedia}>
                  <label className="cursor-pointer flex items-center justify-center gap-2">
                    <ImagePlus className="h-4 w-4" />
                    {t("taskForm.addAnswerMedia")}
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,video/*,audio/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) maybeCropBeforeUpload(file, { type: "task" });
                        e.target.value = "";
                      }}
                    />
                  </label>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingTaskMedia}
                  onClick={() => taskCameraInputRef.current?.click()}
                  className="flex items-center justify-center gap-2"
                >
                  <Camera className="h-4 w-4" />
                  {t("taskForm.useCameraCapture")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingTaskMedia}
                  onClick={() => openLiveRecorder({ type: "task" })}
                  className="flex items-center justify-center gap-2"
                >
                  <Video className="h-4 w-4" />
                  {t("taskForm.liveRecordQuestion")}
                </Button>
              </div>
            </details>
            <input
              ref={taskCameraInputRef}
              type="file"
              className="hidden"
              accept="image/*,video/*"
              capture="environment"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) maybeCropBeforeUpload(file, { type: "task" });
                e.target.value = "";
              }}
            />
            {form.taskMedia?.url && (
              <Badge variant="secondary" className="flex items-center gap-2">
                <span>تم الرفع</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => {
                    setForm({ ...form, taskMedia: null });
                    setTaskMediaUploadStatus({ state: "idle" });
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </Badge>
            )}
            {form.taskMedia?.url && (
              <div className="w-full rounded-md border bg-muted/30 p-2">
                {renderMediaPreview({
                  media: form.taskMedia || undefined,
                  alt: "task-media",
                  maxHeightClass: "max-h-52",
                })}
              </div>
            )}
            {taskMediaUploadStatus.state === "uploading" && (
              <Badge variant="outline" className="text-amber-700 border-amber-500">جاري الرفع...</Badge>
            )}
            {taskMediaUploadStatus.state === "success" && form.taskMedia?.url && (
              <Badge variant="outline" className="text-green-700 border-green-500">رفع ناجح</Badge>
            )}
            {taskMediaUploadStatus.state === "error" && (
              <Badge variant="outline" className="text-red-700 border-red-500">فشل الرفع</Badge>
            )}
            {form.taskMedia?.url && isLikelyAudio(form.taskMedia || undefined) && (
              <Badge variant="outline" className="text-blue-700 border-blue-500 flex items-center gap-1">
                <Mic className="h-3.5 w-3.5" />
                {t("taskForm.audioQuestion")}
              </Badge>
            )}
            {taskUploadError && <p className="text-xs text-red-600">{taskUploadError}</p>}
          </div>
        </div>
      )}

      <div className="space-y-3" ref={answersSectionRef}>
        <div className="flex items-center justify-between">
          <Label>الإجابات (الأولى صحيحة افتراضيًا)</Label>
          <Button size="sm" variant="outline" onClick={handleAddAnswer}>
            <Plus className="h-4 w-4 ml-1" />
            إضافة إجابة
          </Button>
        </div>
        {(fieldErrors.answers || fieldErrors.correctAnswer) && (
          <p className="text-xs text-red-600 flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5" />
            {fieldErrors.answers || fieldErrors.correctAnswer}
          </p>
        )}
        <div className="space-y-3">
          {answers.map((answer, idx) => (
            <Card key={answer.id} className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant={answer.isCorrect ? "default" : "outline"}
                  onClick={() => handleToggleCorrect(idx)}
                  className="shrink-0"
                >
                  {answer.isCorrect ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                </Button>
                <Input
                  ref={(node) => {
                    answerInputRefs.current[answer.id] = node;
                  }}
                  value={answer.text}
                  onChange={(e) => setAnswer(idx, (a) => ({ ...a, text: e.target.value }))}
                  onKeyDown={handleAnswerInputKeyDown(idx)}
                  placeholder={`الإجابة ${idx + 1}`}
                  className={answer.isCorrect ? "border-green-500" : ""}
                  enterKeyHint="next"
                />
                <Button
                  size="icon"
                  variant="destructive"
                  disabled={answers.length <= 2}
                  onClick={() => handleRemoveAnswer(idx)}
                  className="shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <details className={`rounded-lg border bg-muted/20 p-2 ${answerUploadStatus[answer.id]?.state === "uploading" ? "pointer-events-none opacity-70" : ""}`}>
                    <summary className="cursor-pointer list-none">
                      <span className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
                        <ImagePlus className="h-4 w-4" />
                        {answerUploadStatus[answer.id]?.state === "uploading" ? "جاري الرفع..." : t("taskForm.addAnswerMedia")}
                      </span>
                    </summary>
                    <div className="mt-2 grid gap-2 sm:grid-cols-3">
                      <Button asChild variant="outline" size="sm" disabled={answerUploadStatus[answer.id]?.state === "uploading"}>
                        <label className="cursor-pointer flex items-center justify-center gap-2">
                          <Upload className="h-4 w-4" />
                          {t("taskForm.addAnswerMedia")}
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*,video/*,audio/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) maybeCropBeforeUpload(file, { type: "answer", answerIndex: idx });
                              e.target.value = "";
                            }}
                          />
                        </label>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        disabled={answerUploadStatus[answer.id]?.state === "uploading"}
                        onClick={() => answerCameraInputRefs.current[answer.id]?.click()}
                      >
                        <Camera className="h-4 w-4" />
                        {t("taskForm.useCameraCapture")}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        disabled={answerUploadStatus[answer.id]?.state === "uploading"}
                        onClick={() => openLiveRecorder({ type: "answer", answerIndex: idx })}
                      >
                        <Video className="h-4 w-4" />
                        {t("taskForm.liveRecordAnswer")}
                      </Button>
                    </div>
                  </details>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => openSymbolPicker(`answer-${idx}`)}
                  >
                    <Smile className="h-4 w-4" />
                    رمز
                  </Button>
                  {answerUploadStatus[answer.id]?.state === "uploading" && (
                    <Badge variant="outline" className="text-amber-700 border-amber-500">جاري رفع الإجابة...</Badge>
                  )}
                  {answerUploadStatus[answer.id]?.state === "success" && answer.imageUrl && (
                    <Badge variant="outline" className="text-green-700 border-green-500">رفع الإجابة ناجح</Badge>
                  )}
                  {answerUploadStatus[answer.id]?.state === "error" && (
                    <Badge variant="outline" className="text-red-700 border-red-500">فشل رفع الإجابة</Badge>
                  )}
                  {answer.stickerId && (
                    <Badge variant="outline" className="text-blue-700 border-blue-500">
                      ملصق مستخدم
                    </Badge>
                  )}
                </div>
                <input
                  ref={(node) => {
                    answerCameraInputRefs.current[answer.id] = node;
                  }}
                  type="file"
                  className="hidden"
                  accept="image/*,video/*"
                  capture="environment"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) maybeCropBeforeUpload(file, { type: "answer", answerIndex: idx });
                    e.target.value = "";
                  }}
                />
                {answer.imageUrl && (
                  <Badge variant="secondary" className="flex items-center gap-2">
                    <span>تم الرفع</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => {
                        setAnswer(idx, (a) => ({ ...a, imageUrl: "", media: undefined, stickerId: undefined, stickerVariant: undefined }));
                        setAnswerUploadStatus((prev) => ({ ...prev, [answer.id]: { state: "idle" } }));
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </Badge>
                )}

                {answer.imageUrl && (
                  <div className="w-full rounded-md border bg-muted/30 p-2">
                    {renderMediaPreview({
                      media: answer.media,
                      fallbackUrl: answer.imageUrl,
                      alt: `answer-${idx + 1}`,
                      maxHeightClass: "max-h-44",
                    })}
                  </div>
                )}

                <details className="rounded-lg border bg-muted/20 p-2">
                  <summary className="cursor-pointer list-none text-sm font-medium">
                    {t("taskForm.stickerOptions")}
                  </summary>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <Select onValueChange={(v) => handleUseSavedSticker(idx, v)}>
                      <SelectTrigger className="w-[180px] h-8">
                        <SelectValue placeholder="ملصقاتي" />
                      </SelectTrigger>
                      <SelectContent>
                        {myStickers.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{`${s.name} - مستخدم من ${s.uniqueParentsUsed || 0} ولي`}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {answer.imageUrl && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        disabled={generatingStickerFor === answer.id}
                        onClick={() => handleGenerateStickers(idx)}
                      >
                        {generatingStickerFor === answer.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                        {t("taskForm.stickerOptions")}
                      </Button>
                    )}
                    {String(answer.media?.mimeType || "").toLowerCase() === "image/gif" && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={savingStickerFor === answer.id}
                        onClick={() => handleSaveAnimatedSticker(idx)}
                      >
                        حفظ GIF كملصق متحرك
                      </Button>
                    )}
                  </div>
                </details>

                {answerUploadErrors[answer.id] && <p className="text-xs text-red-600">{answerUploadErrors[answer.id]}</p>}
              </div>

              {stickerOptions[answer.id]?.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {stickerOptions[answer.id].map((variant) => (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => handleSaveSticker(idx, variant)}
                      disabled={savingStickerFor === answer.id}
                      className="border rounded-md p-1 text-xs hover:bg-muted disabled:opacity-60"
                    >
                      <img src={variant.dataUrl} alt={getStickerVariantLabel(variant.id)} className="w-full h-16 object-cover rounded" />
                      <span className="block mt-1">{getStickerVariantLabel(variant.id)}</span>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>

      {allowPublic && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
          <div>
            <Label>المشاركة العامة</Label>
            <p className="text-xs text-muted-foreground">السماح بظهور المهمة في المتجر العام</p>
          </div>
          <Switch
            checked={!!form.isPublic}
            onCheckedChange={(v) => setForm({ ...form, isPublic: v })}
          />
        </div>
      )}

      {allowPublic && form.isPublic && (
        <div>
          <Label>تكلفة الاستخدام (نقاط)</Label>
          <Input
            type="number"
            value={form.pointsCost || 0}
            onChange={(e) => setForm({ ...form, pointsCost: parseInt(e.target.value) || 0 })}
          />
          <p className="mt-1 text-xs text-muted-foreground">{t("taskForm.publicTaskProfitHint")}</p>
        </div>
      )}

      {submitError && (
        <p className="text-sm text-red-600" role="alert">
          {submitError}
        </p>
      )}
      <Button
        onClick={handleSubmit}
        className="w-full"
        disabled={
          submitting ||
          submitDisabled ||
          uploadingTaskMedia ||
          generatingStickerFor !== null ||
          savingStickerFor !== null ||
          Object.values(answerUploadStatus).some((status) => status.state === "uploading")
        }
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : effectiveSubmitLabel}
      </Button>
      {(uploadingTaskMedia || Object.values(answerUploadStatus).some((status) => status.state === "uploading")) && (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          {t("taskForm.waitForAllMediaUploads")}
        </p>
      )}
      {submitDisabled && submitHelperText && (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          {submitHelperText}
        </p>
      )}

      {symbolPickerOpen && (
        <Suspense fallback={null}>
          <SymbolLibrary3D
            open={symbolPickerOpen}
            onOpenChange={setSymbolPickerOpen}
            onSelect={handleSymbolSelect}
            insertTarget={symbolTarget}
          />
        </Suspense>
      )}

      {uploadCropOpen && (
        <Suspense fallback={null}>
          <ImageCropper
            open={uploadCropOpen}
            onClose={closeUploadCropper}
            imageSrc={uploadCropImage}
            onCropComplete={handleCropCompleteForUpload}
            mode={uploadCropTarget?.type === "answer" ? "sticker" : "cover"}
            title={uploadCropTarget?.type === "answer" ? t("taskForm.stickerCropTitle") : "قص وسائط السؤال"}
          />
        </Suspense>
      )}

      <Dialog
        open={recorderOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeLiveRecorder();
          } else {
            setRecorderOpen(true);
          }
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{t("taskForm.liveRecord")}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={recorderMode === "audio" ? "default" : "outline"}
                disabled={isLiveRecording}
                onClick={() => setRecorderMode("audio")}
              >
                <Mic className="h-4 w-4 me-1" />
                {t("taskForm.recordAudio")}
              </Button>
              <Button
                type="button"
                variant={recorderMode === "video" ? "default" : "outline"}
                disabled={isLiveRecording}
                onClick={() => setRecorderMode("video")}
              >
                <Video className="h-4 w-4 me-1" />
                {t("taskForm.recordVideo")}
              </Button>
            </div>

            {recorderMode === "video" && (
              <div className="rounded-md border bg-black/80 p-2">
                <p className="mb-2 text-xs text-white/80">{t("taskForm.livePreview")}</p>
                <video
                  ref={livePreviewVideoRef}
                  className="w-full max-h-64 rounded object-contain"
                  autoPlay
                  muted
                  playsInline
                />
              </div>
            )}

            {recordedPreviewUrl && (
              <div className="rounded-md border bg-muted/30 p-2">
                <p className="mb-2 text-xs text-muted-foreground">{t("taskForm.recordedPreview")}</p>
                {String(recordedBlob?.type || "").startsWith("video/") ? (
                  <video src={recordedPreviewUrl} controls className="w-full max-h-64 rounded object-contain bg-black/70" />
                ) : (
                  <audio src={recordedPreviewUrl} controls className="w-full" />
                )}
              </div>
            )}

            {isLiveRecording && (
              <Badge variant="outline" className="w-fit text-amber-700 border-amber-500">
                {t("taskForm.recordingInProgress")}
              </Badge>
            )}

            {recorderError && (
              <p className="text-xs text-red-600">{recorderError}</p>
            )}

            <div className="flex flex-wrap gap-2">
              {!isLiveRecording ? (
                <Button type="button" onClick={startLiveRecording}>
                  {t("taskForm.startRecording")}
                </Button>
              ) : (
                <Button type="button" variant="destructive" onClick={stopLiveRecording}>
                  {t("taskForm.stopRecording")}
                </Button>
              )}

              <Button
                type="button"
                variant="outline"
                onClick={retakeRecording}
                disabled={isLiveRecording || !recordedBlob}
              >
                {t("taskForm.retakeRecording")}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={clearRecordedPreview}
                disabled={isLiveRecording || !recordedBlob}
              >
                {t("taskForm.removeRecording")}
              </Button>

              <Button
                type="button"
                onClick={useRecordedMedia}
                disabled={isLiveRecording || !recordedBlob || !recorderTarget}
              >
                {t("taskForm.useThisRecording")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
