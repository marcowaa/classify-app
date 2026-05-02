import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Image, Mic, MicOff, X, Loader2, CheckCircle, Volume2, VolumeX, Brush, Eraser } from "lucide-react";

interface HelpChatDialogProps {
  open: boolean;
  onClose: () => void;
  helpRequestId: string | number;
  userType: "parent" | "teacher" | "child";
  token: string;
  taskQuestion?: string;
  taskAnswers?: Array<{ id?: string; text: string; imageUrl?: string }>;
  status?: string;
}

export function HelpChatDialog({ open, onClose, helpRequestId, userType, token, taskQuestion, taskAnswers, status: initialStatus }: HelpChatDialogProps) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isResolved, setIsResolved] = useState(initialStatus === "resolved");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showDrawPad, setShowDrawPad] = useState(false);
  const [isPainting, setIsPainting] = useState(false);
  const [drawColor, setDrawColor] = useState("#111827");
  const [drawThickness, setDrawThickness] = useState(3);
  const [drawHistory, setDrawHistory] = useState<string[]>([]);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevMessageCountRef = useRef<number>(0);
  const notificationAudioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Initialize notification sound
  useEffect(() => {
    // Create a short notification beep using AudioContext
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      const dest = audioCtx.createMediaStreamDestination();
      oscillator.connect(gainNode);
      gainNode.connect(dest);
      // We'll use a simple approach instead - just set a flag
    } catch {}
    return () => {};
  }, []);

  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
      oscillator.frequency.setValueAtTime(600, audioCtx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.3);
    } catch {}
  }, [soundEnabled]);

  const basePath = userType === "parent" ? "/api/parent/help-chat"
    : userType === "teacher" ? "/api/teacher/help-chat"
    : "/api/child/help-chat";

  const authHeaders: Record<string, string> = { Authorization: `Bearer ${token}` };

  const childStatusQuery = useQuery({
    queryKey: ["child-help-status", helpRequestId],
    queryFn: async () => {
      if (userType !== "child") return null;
      const res = await fetch(`/api/child/help-requests/${helpRequestId}/status`, { headers: authHeaders });
      if (!res.ok) return null;
      const json = await res.json();
      return json.data || null;
    },
    enabled: open && userType === "child" && !!helpRequestId,
    refetchInterval: open && userType === "child" ? 5000 : false,
  });

  useEffect(() => {
    if (userType !== "child") return;
    const latestStatus = childStatusQuery.data?.status;
    if (latestStatus === "resolved") {
      setIsResolved(true);
    }
  }, [childStatusQuery.data?.status, userType]);

  // Fetch messages
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["help-chat-messages", helpRequestId],
    queryFn: async () => {
      const res = await fetch(`${basePath}/${helpRequestId}/messages`, { headers: authHeaders });
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
    enabled: open && !!helpRequestId,
    refetchInterval: open ? 5000 : false,
  });

  // Send message
  const sendMessage = useMutation({
    mutationFn: async (body: { messageType: string; content?: string; mediaUrl?: string }) => {
      const res = await fetch(`${basePath}/${helpRequestId}/messages`, {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "فشل الإرسال" }));
        throw new Error(err.message || "فشل الإرسال");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["help-chat-messages", helpRequestId] });
      setMessage("");
      setImageFile(null);
      setImagePreview(null);
      setAudioBlob(null);
    },
  });

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Detect new messages from others and play notification sound
  useEffect(() => {
    if (!messages || messages.length === 0) {
      prevMessageCountRef.current = 0;
      return;
    }
    if (prevMessageCountRef.current > 0 && messages.length > prevMessageCountRef.current) {
      const newMessages = messages.slice(prevMessageCountRef.current);
      const hasOtherMessage = newMessages.some((msg: any) => !isMe(msg.senderType));
      if (hasOtherMessage) {
        playNotificationSound();
      }
    }
    prevMessageCountRef.current = messages.length;
  }, [messages, playNotificationSound]);

  const helperAssigned = userType === "child"
    ? Boolean(childStatusQuery.data?.helperAssigned)
    : true;
  const canChildSend = userType !== "child" || helperAssigned;
  const lockCloseForActiveChildSession = userType === "child" && helperAssigned && !isResolved;

  const handleSendText = () => {
    if (!canChildSend) return;
    if (!message.trim()) return;
    sendMessage.mutate({ messageType: "text", content: message.trim() });
  };

  const compressImageIfNeeded = async (file: File): Promise<File | Blob> => {
    if (!file.type.startsWith("image/") || file.size <= 1.5 * 1024 * 1024) {
      return file;
    }

    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new window.Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Image load failed"));
      };
      img.src = objectUrl;
    });

    const maxSize = 1280;
    const ratio = Math.min(1, maxSize / Math.max(image.width, image.height));
    const targetWidth = Math.max(1, Math.round(image.width * ratio));
    const targetHeight = Math.max(1, Math.round(image.height * ratio));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    if (!blob) return file;
    return blob;
  };

  // Upload media file to server and return URL
  const uploadMedia = async (file: File | Blob, filename?: string): Promise<{ url: string; type: string }> => {
    const fileName = filename || "media";
    const payload = file instanceof File ? await compressImageIfNeeded(file) : file;
    const formData = new FormData();
    formData.append("file", payload, fileName);
    const res = await fetch(`${basePath}/upload-media`, {
      method: "POST",
      headers: authHeaders,
      body: formData,
    });
    if (!res.ok) throw new Error("فشل رفع الملف");
    const json = await res.json();
    return json.data;
  };

  const handleSendImage = async () => {
    if (!canChildSend) return;
    if (!imageFile) return;
    try {
      const { url } = await uploadMedia(imageFile, imageFile.name);
      sendMessage.mutate({ messageType: "image", mediaUrl: url, content: imageFile.name });
    } catch {
      // Upload failed
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      // Microphone access denied
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleSendVoice = async () => {
    if (!canChildSend) return;
    if (!audioBlob) return;
    try {
      const { url } = await uploadMedia(audioBlob, "voice.webm");
      sendMessage.mutate({ messageType: "voice", mediaUrl: url, content: "رسالة صوتية" });
    } catch {
      // Upload failed
    }
  };

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const cssWidth = Math.max(280, Math.min(640, window.innerWidth - 96));
    const cssHeight = 220;
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
    canvas.width = Math.floor(cssWidth * dpr);
    canvas.height = Math.floor(cssHeight * dpr);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cssWidth, cssHeight);
    ctx.lineWidth = drawThickness;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = drawColor;
    setDrawHistory([]);
  }, [drawColor, drawThickness]);

  useEffect(() => {
    if (showDrawPad) {
      initCanvas();
    }
  }, [showDrawPad, initCanvas]);

  const getCanvasPoint = (evt: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = evt.currentTarget.getBoundingClientRect();
    return {
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top,
    };
  };

  const onDrawStart = (evt: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    evt.preventDefault();
    setDrawHistory((prev) => {
      const snapshot = canvas.toDataURL("image/png");
      const merged = [...prev, snapshot];
      return merged.length > 20 ? merged.slice(merged.length - 20) : merged;
    });
    const point = getCanvasPoint(evt);
    setIsPainting(true);
    lastPointRef.current = point;
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    try {
      canvas.setPointerCapture(evt.pointerId);
    } catch {
      // no-op
    }
  };

  const onDrawMove = (evt: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPainting) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    evt.preventDefault();
    const point = getCanvasPoint(evt);
    const prev = lastPointRef.current;
    if (!prev) {
      lastPointRef.current = point;
      return;
    }
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    lastPointRef.current = point;
  };

  const onDrawEnd = (evt?: React.PointerEvent<HTMLCanvasElement>) => {
    if (evt) {
      try {
        evt.currentTarget.releasePointerCapture(evt.pointerId);
      } catch {
        // no-op
      }
    }
    setIsPainting(false);
    lastPointRef.current = null;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const width = parseFloat(canvas.style.width || "0") || 320;
    const height = parseFloat(canvas.style.height || "0") || 220;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    setDrawHistory([]);
  };

  const undoCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || drawHistory.length === 0) return;
    const snapshot = drawHistory[drawHistory.length - 1];
    const img = new window.Image();
    img.onload = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const width = parseFloat(canvas.style.width || "0") || 320;
      const height = parseFloat(canvas.style.height || "0") || 220;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      setDrawHistory((prev) => prev.slice(0, -1));
    };
    img.src = snapshot;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = drawThickness;
  }, [drawColor, drawThickness]);

  const handleSendDrawing = async () => {
    if (!canChildSend) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png", 0.95));
    if (!blob) return;
    try {
      const { url } = await uploadMedia(blob, "drawing.png");
      sendMessage.mutate({ messageType: "image", mediaUrl: url, content: "رسم" });
      setShowDrawPad(false);
    } catch {
      // Upload failed
    }
  };

  // Resolve help request mutation
  const resolveMutation = useMutation({
    mutationFn: async () => {
      const resolveBasePath = userType === "parent" ? "/api/parent" : "/api/teacher";
      const res = await fetch(`${resolveBasePath}/help-requests/${helpRequestId}/resolve`, {
        method: "PUT",
        headers: authHeaders,
      });
      if (!res.ok) throw new Error("فشل إغلاق المحادثة");
      return res.json();
    },
    onSuccess: () => {
      setIsResolved(true);
      queryClient.invalidateQueries({ queryKey: ["help-requests"] });
      queryClient.invalidateQueries({ queryKey: ["parent-help-requests"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-help-requests"] });
    },
  });

  const submitFeedback = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/child/help-requests/${helpRequestId}/feedback`, {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: feedbackRating,
          comment: feedbackComment.trim() || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "فشل إرسال التقييم");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["child-help-status", helpRequestId] });
    },
  });

  const getSenderLabel = (senderType: string) => {
    if (userType === "child") {
      if (senderType === "child") return "🧒 أنت";
      return "🛟 المساعد";
    }

    switch (senderType) {
      case "child": return "🧒 الطفل";
      case "parent": return "👨‍👩‍👧 ولي الأمر";
      case "teacher": return "👨‍🏫 المعلم";
      case "helper": return "🛟 المساعد";
      default: return senderType;
    }
  };

  const isMe = (senderType: string) => senderType === userType;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && lockCloseForActiveChildSession) {
          return;
        }
        if (!nextOpen) {
          onClose();
        }
      }}
    >
      <DialogContent className="w-[calc(100vw-1rem)] max-w-2xl h-[min(92vh,820px)] flex flex-col p-0" dir="rtl">
        <DialogHeader className="p-4 pb-2 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base">💬 محادثة المساعدة</DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => setSoundEnabled(!soundEnabled)}
                title={soundEnabled ? "كتم الصوت" : "تفعيل الصوت"}
              >
                {soundEnabled ? <Volume2 className="h-3.5 w-3.5 text-blue-500" /> : <VolumeX className="h-3.5 w-3.5 text-gray-400" />}
              </Button>
              {isResolved ? (
              <span className="text-xs text-green-600 flex items-center gap-1 font-medium">
                <CheckCircle className="h-4 w-4" /> تم الحل
              </span>
            ) : userType !== "child" ? (
              <Button
                size="sm"
                variant="outline"
                className="text-green-600 border-green-300 hover:bg-green-50 text-xs h-7"
                onClick={() => resolveMutation.mutate()}
                disabled={resolveMutation.isPending}
              >
                {resolveMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin ml-1" /> : <CheckCircle className="h-3 w-3 ml-1" />}
                تم الحل
              </Button>
            ) : null}
            </div>
          </div>
          {taskQuestion && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">📝 {taskQuestion}</p>
          )}
        </DialogHeader>

        {!isResolved && userType === "child" && !helperAssigned && (
          <div className="mx-4 mt-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            ⏳ تم إرسال طلب المساعدة. ستُفتح أدوات الإرسال تلقائياً بعد قبول أحد الأطراف للمساعدة.
          </div>
        )}

        {lockCloseForActiveChildSession && (
          <div className="mx-4 mt-3 rounded-xl border border-blue-300 bg-blue-50 px-3 py-2 text-xs text-blue-900">
            💬 جلسة المساعدة نشطة الآن. يمكن إغلاق النافذة بعد إنهاء الجلسة من المساعد.
          </div>
        )}

        {(taskQuestion || (taskAnswers && taskAnswers.length > 0)) && (
          <div className="mx-4 mt-3 rounded-xl border bg-slate-50/80 p-3 max-h-36 overflow-y-auto">
            {taskQuestion && (
              <p className="text-sm font-semibold text-slate-700 mb-2">📝 {taskQuestion}</p>
            )}
            {taskAnswers && taskAnswers.length > 0 && (
              <div className="space-y-2">
                {taskAnswers.map((ans, idx) => (
                  <div key={ans.id || idx} className="rounded-lg bg-white border p-2">
                    {ans.imageUrl && (
                      <img src={ans.imageUrl} alt="" className="w-full max-h-24 object-contain rounded mb-1" />
                    )}
                    <p className="text-xs text-slate-700">{ans.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
          {isLoading && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {!isLoading && messages.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              لا توجد رسائل بعد. ابدأ المحادثة!
            </div>
          )}
          {messages.map((msg: any) => (
            <div
              key={msg.id}
              className={`flex ${isMe(msg.senderType) ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-3 py-2 ${
                  isMe(msg.senderType)
                    ? "bg-blue-500 text-white rounded-br-md"
                    : "bg-gray-100 dark:bg-gray-800 rounded-bl-md"
                }`}
              >
                <div className={`text-[10px] font-medium mb-1 ${isMe(msg.senderType) ? "text-blue-100" : "text-muted-foreground"}`}>
                  {getSenderLabel(msg.senderType)}
                </div>
                {msg.messageType === "text" && (
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                )}
                {msg.messageType === "image" && msg.mediaUrl && (
                  <img src={msg.mediaUrl} alt="" className="max-w-full rounded-lg max-h-48 object-contain" />
                )}
                {msg.messageType === "voice" && msg.mediaUrl && (
                  <audio controls className="max-w-full" src={msg.mediaUrl} />
                )}
                <div className={`text-[9px] mt-1 ${isMe(msg.senderType) ? "text-blue-200" : "text-muted-foreground"}`}>
                  {new Date(msg.createdAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Image preview */}
        {imagePreview && (
          <div className="px-4 py-2 border-t flex items-center gap-2">
            <img src={imagePreview} alt="" className="h-16 w-16 rounded object-cover" />
            <Button size="sm" variant="ghost" onClick={() => { setImageFile(null); setImagePreview(null); }}>
              <X className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={handleSendImage} disabled={sendMessage.isPending || !canChildSend}>
              إرسال الصورة
            </Button>
          </div>
        )}

        {/* Voice preview */}
        {audioBlob && !isRecording && (
          <div className="px-4 py-2 border-t flex items-center gap-2">
            <audio controls src={URL.createObjectURL(audioBlob)} className="flex-1 h-8" />
            <Button size="sm" variant="ghost" onClick={() => setAudioBlob(null)}>
              <X className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={handleSendVoice} disabled={sendMessage.isPending || !canChildSend}>
              إرسال
            </Button>
          </div>
        )}

        {/* Input area */}
        {isResolved && (
          <div className="px-4 py-3 border-t text-center text-sm text-muted-foreground bg-green-50 dark:bg-green-950/20">
            ✅ تم حل هذا الطلب
          </div>
        )}
        {isResolved && userType === "child" && (
          <div className="px-4 py-3 border-t bg-amber-50/70 dark:bg-amber-950/20 space-y-2">
            {childStatusQuery.data?.feedback ? (
              <div className="text-sm text-muted-foreground">
                شكراً، تم حفظ تقييمك للجلسة ⭐ {childStatusQuery.data.feedback.rating}/5
              </div>
            ) : (
              <>
                <div className="text-sm font-medium">قيّم جودة المساعدة</div>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setFeedbackRating(n)}
                      className={`text-xl ${feedbackRating >= n ? "text-yellow-500" : "text-gray-300"}`}
                      aria-label={`rate-${n}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <Input
                  placeholder="تعليق اختياري"
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                />
                <Button
                  size="sm"
                  onClick={() => submitFeedback.mutate()}
                  disabled={feedbackRating < 1 || submitFeedback.isPending}
                >
                  {submitFeedback.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : null}
                  إرسال التقييم
                </Button>
              </>
            )}
          </div>
        )}
        {!isResolved && <div className="p-3 border-t flex items-center gap-2">
          {/* Image button */}
          <Button
            size="icon"
            variant="ghost"
            className="shrink-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={!canChildSend}
          >
            <Image className="h-4 w-4" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setImageFile(file);
                setImagePreview(URL.createObjectURL(file));
              }
            }}
          />

          {/* Voice button */}
          <Button
            size="icon"
            variant={isRecording ? "destructive" : "ghost"}
            className="shrink-0"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={!canChildSend}
          >
            {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>

          {userType === "child" && (
            <Button
              size="icon"
              variant="ghost"
              className="shrink-0"
              onClick={() => setShowDrawPad((prev) => !prev)}
              title="الرسم"
              disabled={!canChildSend}
            >
              <Brush className="h-4 w-4" />
            </Button>
          )}

          {/* Text input */}
          <Input
            placeholder="اكتب رسالتك..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendText(); } }}
            className="flex-1"
            disabled={isRecording || !canChildSend}
          />

          {/* Send button */}
          <Button
            size="icon"
            onClick={handleSendText}
            disabled={!message.trim() || sendMessage.isPending || !canChildSend}
            className="shrink-0 bg-blue-500 hover:bg-blue-600"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>}

        {!isResolved && showDrawPad && userType === "child" && canChildSend && (
          <div className="border-t p-3 space-y-2 bg-slate-50 dark:bg-slate-900/30">
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium text-muted-foreground">ارسم بإصبعك ثم أرسل الرسم</div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={undoCanvas} disabled={drawHistory.length === 0}>
                  تراجع
                </Button>
                <Button size="sm" variant="outline" onClick={clearCanvas}>
                  <Eraser className="h-3.5 w-3.5 ml-1" />
                  مسح
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowDrawPad(false)}>
                  إلغاء
                </Button>
                <Button size="sm" onClick={handleSendDrawing} disabled={sendMessage.isPending}>
                  {sendMessage.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin ml-1" /> : <Send className="h-3.5 w-3.5 ml-1" />}
                  إرسال الرسم
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {[
                  "#111827",
                  "#dc2626",
                  "#2563eb",
                  "#16a34a",
                  "#9333ea",
                ].map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setDrawColor(color)}
                    className={`w-6 h-6 rounded-full border ${drawColor === color ? "ring-2 ring-offset-1 ring-blue-500" : ""}`}
                    style={{ backgroundColor: color }}
                    aria-label={`color-${color}`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">سُمك القلم</span>
                <input
                  type="range"
                  min={2}
                  max={12}
                  step={1}
                  value={drawThickness}
                  onChange={(e) => setDrawThickness(Number(e.target.value))}
                />
                <span className="font-medium">{drawThickness}</span>
              </div>
            </div>
            <div className="rounded-xl border bg-white overflow-hidden">
              <canvas
                ref={canvasRef}
                className="block touch-none"
                onPointerDown={onDrawStart}
                onPointerMove={onDrawMove}
                onPointerUp={onDrawEnd}
                onPointerLeave={onDrawEnd}
                onPointerCancel={onDrawEnd}
              />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
