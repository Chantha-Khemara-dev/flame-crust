import { useState, useEffect, useRef } from "react";
import { 
  Send, 
  MessageSquare, 
  Phone, 
  PhoneCall,
  PhoneOff,
  Image as ImageIcon,
  ZoomIn,
  Paperclip,
  Trash2,
  Ban,
  MoreVertical,
  Copy,
  Eye,
  X, 
  Loader2, 
  Bike, 
  User, 
  CheckCheck, 
  Sparkles,
  Wifi,
  Mic,
  Play,
  Pause,
  Volume2,
  Camera,
  SwitchCamera
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getOrderMessages, sendOrderMessage, markOrderMessagesRead, reportOrderChatTyping, checkOrderChatTyping, deleteOrderMessage } from "@/lib/api";
import { uploadImageToCloudinary, uploadAudioToCloudinary } from "@/lib/cloudinary";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function playChatChimeSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    
    // Pleasant dual-tone chime (F#5 to B5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(739.99, now);
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(987.77, now + 0.12);
    gain2.gain.setValueAtTime(0.25, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.5);
  } catch (e) {}
}

export function showChatNotificationToast({ senderName, message, photo, onReply }) {
  playChatChimeSound();
  try {
    if ("vibrate" in navigator) navigator.vibrate([100, 50, 100]);
  } catch (e) {}

  toast.custom((t) => (
    <div 
      onClick={() => {
        toast.dismiss(t);
        if (onReply) onReply();
      }}
      className="w-[330px] sm:w-[360px] max-w-[92vw] bg-white dark:bg-zinc-900 border-2 border-red-500/40 dark:border-red-500/30 shadow-2xl rounded-2xl p-3.5 flex items-center gap-3.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800/80 transition-all select-none"
    >
      <div className="relative shrink-0">
        {photo ? (
          <img src={photo} alt={senderName} className="size-11 rounded-full object-cover border-2 border-red-500/60 shadow-xs" />
        ) : (
          <div className="size-11 rounded-full bg-gradient-to-tr from-amber-500 to-red-600 text-white flex items-center justify-center font-bold shadow-xs">
            <MessageSquare className="size-5" />
          </div>
        )}
        <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-900" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <h5 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-zinc-100 truncate">{senderName || "Customer"}</h5>
          <span className="text-[10px] text-red-600 dark:text-red-400 font-bold whitespace-nowrap shrink-0">Just now</span>
        </div>
        <p className="text-xs text-slate-600 dark:text-zinc-300 truncate font-medium">
          {message?.startsWith("[VOICE]:") ? "🎤 Voice Note (Voice Message)" : message?.startsWith("[IMG]:") ? "📷 Photo Attachment" : message}
        </p>
      </div>

      <div className="shrink-0">
        <span className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-full shadow-xs whitespace-nowrap inline-block">
          Reply
        </span>
      </div>
    </div>
  ), { duration: 5000, position: "top-center" });
}

export function VoiceMessagePlayer({ audioUrl, duration: givenDuration, isMe, msgId }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(Number(givenDuration) || 0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef(null);

  // Stop playback when another voice note starts playing anywhere in the app
  useEffect(() => {
    const handleOtherPlay = (e) => {
      if (e.detail?.id !== msgId && audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    };
    window.addEventListener("flame-voice-play", handleOtherPlay);
    return () => window.removeEventListener("flame-voice-play", handleOtherPlay);
  }, [msgId]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const initAudio = () => {
    if (!audioRef.current) {
      const audio = new Audio(audioUrl);
      audio.playbackRate = playbackRate;
      audio.onloadedmetadata = () => {
        if (audio.duration && !isNaN(audio.duration) && audio.duration !== Infinity) {
          setDuration(audio.duration);
        }
        setIsLoading(false);
      };
      audio.ontimeupdate = () => {
        setCurrentTime(audio.currentTime);
      };
      audio.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };
      audio.onerror = () => {
        setIsLoading(false);
        setIsPlaying(false);
      };
      audioRef.current = audio;
    }
    return audioRef.current;
  };

  const togglePlay = () => {
    const audio = initAudio();
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      window.dispatchEvent(new CustomEvent("flame-voice-play", { detail: { id: msgId } }));
      setIsLoading(true);
      audio.play().then(() => {
        setIsLoading(false);
        setIsPlaying(true);
      }).catch(() => {
        setIsLoading(false);
        setIsPlaying(false);
      });
    }
  };

  const cycleSpeed = (e) => {
    e.stopPropagation();
    const nextSpeed = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
    setPlaybackRate(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const handleSeek = (e) => {
    const audio = initAudio();
    const rect = e.currentTarget.getBoundingClientRect();
    const clickPos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetTime = clickPos * (duration || 1);
    audio.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bars = [40, 70, 45, 90, 60, 30, 85, 100, 75, 50, 65, 95, 40, 80, 55, 90, 70, 35, 60, 80];

  return (
    <div className={cn(
      "flex items-center gap-2.5 p-2 rounded-2xl min-w-[210px] sm:min-w-[240px] select-none",
      isMe ? "text-primary-foreground" : "text-foreground"
    )}>
      <button
        type="button"
        onClick={togglePlay}
        className={cn(
          "size-9 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-90 shadow-xs cursor-pointer",
          isMe 
            ? "bg-white text-primary hover:bg-white/90" 
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        )}
      >
        {isLoading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : isPlaying ? (
          <Pause className="size-4 fill-current" />
        ) : (
          <Play className="size-4 fill-current ml-0.5" />
        )}
      </button>

      <div className="flex-1 flex flex-col justify-center min-w-0">
        <div 
          onClick={handleSeek}
          className="h-6 flex items-center gap-[2.5px] cursor-pointer group py-1"
          title="Click to seek"
        >
          {bars.map((h, idx) => {
            const barProgress = (idx / bars.length) * 100;
            const isPassed = barProgress <= progressPercent;
            return (
              <div
                key={idx}
                style={{ height: `${Math.max(25, h)}%` }}
                className={cn(
                  "w-[3px] rounded-full transition-colors duration-150",
                  isPassed 
                    ? (isMe ? "bg-white" : "bg-primary") 
                    : (isMe ? "bg-white/35 group-hover:bg-white/50" : "bg-muted-foreground/30 group-hover:bg-muted-foreground/50")
                )}
              />
            );
          })}
        </div>

        <div className="flex items-center justify-between text-[10px] font-medium opacity-85 leading-tight mt-0.5">
          <span>{isPlaying ? formatTime(currentTime) : formatTime(duration)}</span>
          <button
            type="button"
            onClick={cycleSpeed}
            className={cn(
              "px-1.5 py-0.2 rounded-full font-bold text-[9px] transition-all cursor-pointer",
              isMe 
                ? "bg-white/20 hover:bg-white/30 text-white" 
                : "bg-secondary hover:bg-secondary/80 text-foreground"
            )}
            title="Playback speed"
          >
            {playbackRate}x
          </button>
        </div>
      </div>
    </div>
  );
}


export function OrderChatModal({ 
  open, 
  onOpenChange, 
  orderId, 
  orderNumber,
  currentUser = { type: "CUSTOMER", name: "Customer" }, 
  recipient = { name: "Driver", role: "Courier Partner", phone: "" } 
}) {
  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [otherTyping, setOtherTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const prevCountRef = useRef(0);
  const typingTimeoutRef = useRef(null);

  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewModalUrl, setPreviewModalUrl] = useState(null);
  const fileInputRef = useRef(null);

  // Camera capture states & refs (ថតរូប)
  const isMobile = typeof navigator !== "undefined" && (
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || "") ||
    (navigator.maxTouchPoints > 1 && /Macintosh/i.test(navigator.userAgent || ""))
  );
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState("environment"); // "environment" (rear) or "user" (front)
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const videoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const cameraInputRef = useRef(null);

  const stopCameraStream = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(t => t.stop());
      cameraStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startCamera = async (facing = cameraFacingMode) => {
    setCameraLoading(true);
    setCameraError(null);
    stopCameraStream();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Browser does not support direct webcam access");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        videoRef.current.setAttribute("webkit-playsinline", "true");
        await videoRef.current.play().catch(() => {});
      }
      setCameraLoading(false);
    } catch (err) {
      console.warn("Camera stream error:", err);
      setCameraError(err.message || "Cannot access camera");
      setCameraLoading(false);
    }
  };

  useEffect(() => {
    if (isCameraOpen) {
      startCamera(cameraFacingMode);
    } else {
      stopCameraStream();
    }
    return () => {
      stopCameraStream();
    };
  }, [isCameraOpen, cameraFacingMode]);

  useEffect(() => {
    if (!open && isCameraOpen) {
      setIsCameraOpen(false);
      stopCameraStream();
    }
  }, [open]);

  const handleCapturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      toast.error("កាមេរ៉ាមិនទាន់រួចរាល់នៅឡើយទេ (Camera not ready)");
      return;
    }

    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");

      if (cameraFacingMode === "user") {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (!blob) {
          toast.error("បរាជ័យក្នុងការថតរូប (Failed to capture)");
          return;
        }
        const file = new File([blob], `photo_${Date.now()}.jpg`, { type: "image/jpeg" });
        setSelectedImageFile(file);
        const localUrl = URL.createObjectURL(file);
        setImagePreviewUrl(localUrl);

        try {
          if ("vibrate" in navigator) navigator.vibrate(60);
        } catch (e) {}

        setIsCameraOpen(false);
        stopCameraStream();
        toast.success("បានថតរូបជោគជ័យ! (Photo captured)");
      }, "image/jpeg", 0.92);
    } catch (e) {
      toast.error("កំហុសក្នុងការថតរូប (Capture error)");
    }
  };

  const handleToggleFacingMode = () => {
    const nextMode = cameraFacingMode === "environment" ? "user" : "environment";
    setCameraFacingMode(nextMode);
  };

  const handleOpenNativeCamera = () => {
    setIsCameraOpen(false);
    stopCameraStream();
    cameraInputRef.current?.click();
  };

  // Voice Chat / Voice Note ("void chat") states & refs
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [uploadingVoice, setUploadingVoice] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordIntervalRef = useRef(null);
  const cancelRecordingRef = useRef(false);
  const recordSecondsRef = useRef(0);

  // Clean up recording stream on modal close or unmount
  useEffect(() => {
    return () => {
      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(t => t.stop());
        audioStreamRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!open && isRecording) {
      handleCancelRecording();
    }
  }, [open]);

  const handleStartRecording = async () => {
    if (sending || uploadingImage || uploadingVoice || isRecording) return;

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error("Audio recording is not supported in this browser");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      audioChunksRef.current = [];
      cancelRecordingRef.current = false;

      let mimeType = "";
      if (typeof MediaRecorder !== "undefined") {
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          mimeType = "audio/webm;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/webm")) {
          mimeType = "audio/webm";
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
          mimeType = "audio/mp4";
        }
      }

      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach(t => t.stop());
          audioStreamRef.current = null;
        }

        if (cancelRecordingRef.current) {
          audioChunksRef.current = [];
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || "audio/webm" });
        audioChunksRef.current = [];

        if (audioBlob.size === 0) return;

        await handleSendVoiceMessage(audioBlob, recordSecondsRef.current);
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordSeconds(0);
      recordSecondsRef.current = 0;

      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
      recordIntervalRef.current = setInterval(() => {
        setRecordSeconds(prev => {
          recordSecondsRef.current = prev + 1;
          return prev + 1;
        });
      }, 1000);

    } catch (err) {
      console.error("Microphone access error:", err);
      toast.error("Please allow microphone access to record voice messages");
    }
  };

  const handleCancelRecording = () => {
    cancelRecordingRef.current = true;
    if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(t => t.stop());
      audioStreamRef.current = null;
    }
    setIsRecording(false);
    setRecordSeconds(0);
    toast.info("Voice recording cancelled");
  };

  const handleStopAndSendRecording = () => {
    if (recordSeconds < 1) {
      toast.error("Voice note is too short");
      handleCancelRecording();
      return;
    }
    cancelRecordingRef.current = false;
    if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
    setIsRecording(false);
  };

  const handleSendVoiceMessage = async (audioBlob, durationSecs) => {
    if (!audioBlob || !orderId) return;

    setUploadingVoice(true);
    const estDuration = Math.max(1, durationSecs || 1);

    try {
      const audioUrl = await uploadAudioToCloudinary(audioBlob);
      const voicePayload = `[VOICE]:${audioUrl}|${estDuration}`;

      // Optimistic message
      const optimisticMsg = {
        id: Date.now(),
        order_id: orderId,
        sender_type: currentUser.type,
        sender_name: currentUser.name,
        message: voicePayload,
        created_at: new Date().toISOString(),
        pending: true
      };
      setMessages(prev => [...prev, optimisticMsg]);
      scrollToBottom();

      await sendOrderMessage({
        order_id: orderId,
        sender_type: currentUser.type,
        sender_name: currentUser.name,
        sender_id: currentUser.id || null,
        message: voicePayload
      });
      await fetchMessages();
    } catch (err) {
      toast.error("Failed to send voice note");
    } finally {
      setUploadingVoice(false);
      setRecordSeconds(0);
    }
  };

  const cannedReplies = currentUser.type === "CUSTOMER" 
    ? [
        "👋 Hi! How long until delivery?",
        "🏠 I am waiting downstairs.",
        "🚪 Please leave it at the gate/door.",
        "📞 Please call me when you arrive."
      ]
    : [
        "🛵 I have picked up your order and am on the way!",
        "📍 Almost there, arriving in ~5 mins.",
        "🚦 Facing some traffic, will arrive shortly.",
        "🚪 I am outside your location!"
      ];

  const fetchMessages = async () => {
    if (!orderId) return;
    try {
      const data = await getOrderMessages(orderId);
      let list = Array.isArray(data) ? data : [];
      list = list.filter(m => !(m.message && m.message.startsWith("__WEBRTC__:")));
      setMessages(list);

      // Auto mark messages as read
      markOrderMessagesRead(orderId, currentUser.type);

      // Play soft sound or scroll if new message arrives
      if (list.length > prevCountRef.current) {
        if (prevCountRef.current > 0) {
          const lastMsg = list[list.length - 1];
          if (lastMsg.sender_type !== currentUser.type) {
            playChatChimeSound();
            try {
              if ("vibrate" in navigator) navigator.vibrate(100);
            } catch (e) {}
          }
        }
        prevCountRef.current = list.length;
        scrollToBottom();
      }
    } catch (err) {
      console.error("Failed to load chat messages", err);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  useEffect(() => {
    if (!open || !orderId) return;
    setLoading(true);
    fetchMessages();
    markOrderMessagesRead(orderId, currentUser.type);

    const interval = setInterval(async () => {
      fetchMessages();
      try {
        const typeRes = await checkOrderChatTyping(orderId, currentUser.type);
        setOtherTyping(Boolean(typeRes?.isTyping));
      } catch (e) {}
    }, 2000);

    return () => clearInterval(interval);
  }, [open, orderId, currentUser.type]);

  const handleInputChange = (val) => {
    setInputMsg(val);
    if (!orderId) return;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    reportOrderChatTyping(orderId, currentUser.type);
    typingTimeoutRef.current = setTimeout(() => {
      // debounce next typing report
    }, 1200);
  };

  const handleFileSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if image (including iOS HEIC/HEIF and empty type fallbacks)
    const isImage = (file.type && file.type.startsWith("image/")) || 
                    /\.(jpe?g|png|webp|gif|heic|heif|bmp)$/i.test(file.name || "") ||
                    !file.type; // On some iOS versions file.type is empty for camera captures

    if (!isImage) {
      toast.error("សូមជ្រើសរើស file រូបភាព (Please select an image file)");
      return;
    }
    setSelectedImageFile(file);
    const localUrl = URL.createObjectURL(file);
    setImagePreviewUrl(localUrl);
  };

  const clearSelectedImage = () => {
    setSelectedImageFile(null);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const handleSend = async (textToSend) => {
    const msg = (textToSend || inputMsg).trim();
    if ((!msg && !selectedImageFile) || !orderId || sending || uploadingImage) return;

    setSending(true);
    let finalMsg = msg;

    if (selectedImageFile) {
      setUploadingImage(true);
      try {
        const imgUrl = await uploadImageToCloudinary(selectedImageFile);
        finalMsg = finalMsg ? `[IMG]:${imgUrl}\n${finalMsg}` : `[IMG]:${imgUrl}`;
      } catch (e) {
        toast.error("Failed to upload image. Please try again.");
        setSending(false);
        setUploadingImage(false);
        return;
      }
      clearSelectedImage();
      setUploadingImage(false);
    }

    setInputMsg("");

    // Optimistic UI update
    const optimisticMsg = {
      id: Date.now(),
      order_id: orderId,
      sender_type: currentUser.type,
      sender_name: currentUser.name,
      message: finalMsg,
      created_at: new Date().toISOString(),
      pending: true
    };
    setMessages(prev => [...prev, optimisticMsg]);
    scrollToBottom();

    try {
      await sendOrderMessage({
        order_id: orderId,
        sender_type: currentUser.type,
        sender_name: currentUser.name,
        sender_id: currentUser.id || null,
        message: finalMsg
      });
      await fetchMessages();
    } catch (err) {
      toast.error("Failed to send message");
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
    } finally {
      setSending(false);
    }
  };

  const handleUnsendMessage = async (msgId) => {
    if (!msgId) return;
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, message: "[DELETED]" } : m));
    try {
      await deleteOrderMessage(msgId, currentUser.type);
      toast.success("Message removed");
      fetchMessages();
    } catch (e) {
      toast.error("Failed to remove message");
    }
  };

  const handleCopyMessage = (text) => {
    if (!text || text.startsWith("[VOICE]:")) return;
    const cleanText = text.startsWith("[IMG]:") ? text.replace("[IMG]:", "").trim() : text;
    navigator.clipboard?.writeText(cleanText);
    toast.success("Copied to clipboard");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        showCloseButton={false}
        className="w-[94vw] max-w-md h-[78vh] sm:h-[620px] max-h-[80vh] mt-12 sm:mt-0 p-0 overflow-hidden rounded-[28px] bg-card border border-border/70 shadow-2xl flex flex-col z-[100]"
      >
        {/* Header */}
        <DialogHeader className="p-4 border-b border-border/60 bg-secondary/30 shrink-0 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3 min-w-0">
            {recipient.photo ? (
              <img 
                src={recipient.photo} 
                alt={recipient.name} 
                className="size-10.5 rounded-full object-cover border-2 border-primary/40 shrink-0"
              />
            ) : (
              <div className="size-10.5 rounded-full bg-gradient-to-tr from-amber-500 to-orange-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                {recipient.role?.toLowerCase().includes("driver") || currentUser.type === "CUSTOMER" ? (
                  <Bike className="size-5.5" />
                ) : (
                  <User className="size-5.5" />
                )}
              </div>
            )}
            <div className="min-w-0 text-left">
              <DialogTitle className="font-bold text-sm sm:text-base text-foreground truncate flex items-center gap-1.5">
                {recipient.name || "Live Chat"}
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground truncate">
                {recipient.role || "Delivery Chat"} {orderNumber ? `• Order #${orderNumber}` : ""}
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {recipient.phone && (
              <a
                href={`tel:${recipient.phone}`}
                className="size-9 rounded-full bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center transition-colors"
                title="Cellular Phone Call"
              >
                <Phone className="size-4" />
              </a>
            )}
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="size-9 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="size-4.5" />
            </button>
          </div>
        </DialogHeader>

        {/* Message Thread */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 custom-scrollbar bg-background/50">
          {loading && messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
              <Loader2 className="size-6 animate-spin text-primary" />
              <span className="text-xs">Connecting to live chat...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 text-muted-foreground space-y-2">
              <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-1">
                <MessageSquare className="size-6" />
              </div>
              <p className="font-bold text-sm text-foreground">Direct Message</p>
              <p className="text-xs max-w-[240px]">
                Send a message directly regarding your ongoing delivery.
              </p>
            </div>
          ) : (
            messages.map((m) => {
              const isMe = m.sender_type === currentUser.type;
              const isCallMsg = typeof m.message === "string" && (m.message.startsWith("📞") || m.message.includes("Voice Call"));

              if (isCallMsg) {
                const isMissed = m.message.toLowerCase().includes("missed") || m.message.toLowerCase().includes("cancelled");
                return (
                  <div key={m.id} className="flex justify-center my-2 animate-in fade-in-50 duration-150">
                    <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-secondary/80 border border-border/70 shadow-xs backdrop-blur-xs text-xs">
                      <div className={cn(
                        "size-7 rounded-full flex items-center justify-center shrink-0",
                        isMissed ? "bg-red-500/15 text-red-500" : "bg-emerald-500/15 text-emerald-500"
                      )}>
                        {isMissed ? <PhoneOff className="size-3.5" /> : <PhoneCall className="size-3.5" />}
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="font-bold text-foreground text-[11px] leading-tight flex items-center gap-1.5">
                          {m.message.replace("📞", "").trim()}
                        </span>
                        <span className="text-[9px] text-muted-foreground">
                          {m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div 
                  key={m.id} 
                  className={cn(
                    "flex gap-2 max-w-[85%] animate-in fade-in-50 duration-150",
                    isMe ? "ml-auto flex-row-reverse items-end" : "mr-auto flex-row items-end"
                  )}
                >
                  {!isMe && (
                    <div className="size-6.5 rounded-full overflow-hidden bg-primary/15 shrink-0 mb-1 border border-border/50">
                      {recipient.photo ? (
                        <img src={recipient.photo} alt="" className="size-full object-cover" />
                      ) : (
                        <div className="size-full flex items-center justify-center text-primary text-[10px] font-bold">
                          {recipient.name?.[0] || "P"}
                        </div>
                      )}
                    </div>
                  )}

                  <div className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                    <div className="flex items-center gap-1 mb-0.5 px-1">
                      <span className="text-[10px] font-semibold text-muted-foreground">
                        {isMe ? "You" : m.sender_name || (m.sender_type === "DRIVER" ? "Driver" : "Customer")}
                      </span>
                      <span className="text-[9px] text-muted-foreground/60">
                        {m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                      </span>
                    </div>

                    {/* Message Bubble Content (Unsent / Photo / Text with 3-Dots Menu) */}
                    {m.message === "[DELETED]" ? (
                      <div 
                        className={cn(
                          "px-3.5 py-2 rounded-2xl text-xs italic text-muted-foreground/80 bg-secondary/40 border border-border/40 flex items-center gap-1.5 shadow-2xs select-none",
                          isMe ? "rounded-tr-xs" : "rounded-tl-xs"
                        )}
                      >
                        <Ban className="size-3.5 text-muted-foreground/60 shrink-0" />
                        <span>This message was removed</span>
                      </div>
                    ) : (
                      <div className={cn("relative group/msg flex items-center gap-1", isMe ? "flex-row" : "flex-row-reverse")}>
                        {/* 3-Dots Action Menu (ត្រេ៣ / ចុច៣) */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="size-7 rounded-full bg-secondary/60 hover:bg-secondary text-muted-foreground/80 hover:text-foreground border border-border/40 flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-2xs active:scale-95"
                              title="More options"
                            >
                              <MoreVertical className="size-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align={isMe ? "end" : "start"} className="min-w-[140px] rounded-xl z-[120] bg-card border border-border shadow-xl">
                            {!m.message.startsWith("[IMG]:") && !m.message.startsWith("[VOICE]:") && (
                              <DropdownMenuItem 
                                onClick={() => handleCopyMessage(m.message)}
                                className="gap-2 text-xs font-medium cursor-pointer"
                              >
                                <Copy className="size-3.5 text-muted-foreground" />
                                <span>Copy Text</span>
                              </DropdownMenuItem>
                            )}

                            {m.message.startsWith("[IMG]:") && (
                              <DropdownMenuItem 
                                onClick={() => {
                                  const imgUrl = m.message.replace("[IMG]:", "").trim().split("\n")[0];
                                  setPreviewModalUrl(imgUrl);
                                }}
                                className="gap-2 text-xs font-medium cursor-pointer"
                              >
                                <Eye className="size-3.5 text-muted-foreground" />
                                <span>View Photo</span>
                              </DropdownMenuItem>
                            )}

                            {m.message.startsWith("[VOICE]:") && (
                              <DropdownMenuItem 
                                onClick={() => {
                                  const raw = m.message.replace("[VOICE]:", "").trim();
                                  const [audioUrl] = raw.split("|");
                                  window.open(audioUrl, "_blank");
                                }}
                                className="gap-2 text-xs font-medium cursor-pointer"
                              >
                                <Volume2 className="size-3.5 text-muted-foreground" />
                                <span>Open Audio</span>
                              </DropdownMenuItem>
                            )}

                            {isMe && (
                              <DropdownMenuItem 
                                onClick={() => handleUnsendMessage(m.id)}
                                className="gap-2 text-xs font-medium text-red-500 focus:text-red-500 focus:bg-red-500/10 cursor-pointer"
                              >
                                <Trash2 className="size-3.5" />
                                <span>Remove</span>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <div 
                          className={cn(
                            "rounded-2xl text-xs sm:text-sm leading-relaxed break-words shadow-xs overflow-hidden",
                            isMe 
                              ? "bg-primary text-primary-foreground rounded-tr-xs" 
                              : "bg-secondary text-foreground border border-border/50 rounded-tl-xs",
                            m.message.startsWith("[IMG]:") || m.message.startsWith("[VOICE]:") ? "p-1.5" : "px-3.5 py-2.5"
                          )}
                        >
                          {m.message.startsWith("[IMG]:") ? (
                            (() => {
                              const parts = m.message.replace("[IMG]:", "").trim().split("\n");
                              const imgUrl = parts[0];
                              const caption = parts.slice(1).join("\n").trim();
                              return (
                                <div className="space-y-1.5">
                                  <div 
                                    className="relative group rounded-xl overflow-hidden cursor-pointer max-w-[240px] bg-black/10"
                                    onClick={() => setPreviewModalUrl(imgUrl)}
                                  >
                                    <img 
                                      src={imgUrl} 
                                      alt="Attached Photo" 
                                      className="w-full max-h-56 object-cover rounded-xl transition-transform duration-200 group-hover:scale-103" 
                                      loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                      <ZoomIn className="size-5" />
                                    </div>
                                  </div>
                                  {caption && (
                                    <p className="px-2 py-0.5 text-xs font-medium leading-normal">{caption}</p>
                                  )}
                                </div>
                              );
                            })()
                          ) : m.message.startsWith("[VOICE]:") ? (
                            (() => {
                              const raw = m.message.replace("[VOICE]:", "").trim();
                              const [audioUrl, durationStr] = raw.split("|");
                              return (
                                <VoiceMessagePlayer
                                  audioUrl={audioUrl}
                                  duration={durationStr ? Number(durationStr) : 0}
                                  isMe={isMe}
                                  msgId={m.id}
                                />
                              );
                            })()
                          ) : (
                            m.message
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* Live Typing Indicator */}
          {otherTyping && (
            <div className="flex items-center gap-2 mr-auto animate-in fade-in duration-200 pt-1">
              <div className="size-6.5 rounded-full overflow-hidden bg-primary/15 shrink-0 border border-border/50">
                {recipient.photo ? (
                  <img src={recipient.photo} alt="" className="size-full object-cover" />
                ) : (
                  <div className="size-full flex items-center justify-center text-primary text-[10px] font-bold">
                    {recipient.name?.[0] || "P"}
                  </div>
                )}
              </div>
              <div className="px-3.5 py-2 rounded-2xl bg-secondary/90 text-foreground border border-border/60 rounded-tl-xs flex items-center gap-1.5 shadow-xs">
                <span className="size-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                <span className="size-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                <span className="size-1.5 rounded-full bg-primary animate-bounce" />
                <span className="text-[10px] text-muted-foreground ml-1 font-medium">{recipient.name || "Partner"} is typing...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-3 pt-2 pb-1 flex gap-1.5 overflow-x-auto no-scrollbar border-t border-border/40 bg-card/70 shrink-0">
          {cannedReplies.map((reply, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSend(reply)}
              disabled={sending || uploadingImage}
              className="text-[11px] whitespace-nowrap bg-secondary/80 hover:bg-secondary text-foreground px-3 py-1 rounded-full border border-border/60 font-medium transition-all active:scale-95 shrink-0 cursor-pointer"
            >
              {reply}
            </button>
          ))}
        </div>

        {/* Selected Image Thumbnail Preview before send */}
        {imagePreviewUrl && (
          <div className="px-3.5 py-2 bg-secondary/40 border-t border-border/50 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div className="relative size-14 rounded-xl overflow-hidden border border-border/70 shadow-xs shrink-0 bg-background">
              <img src={imagePreviewUrl} alt="Upload preview" className="size-full object-cover" />
              {uploadingImage && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <Loader2 className="size-4 animate-spin text-white" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">
                {selectedImageFile?.name || "Photo attachment"}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {uploadingImage ? "Uploading photo..." : "Ready to send. Add a caption below."}
              </p>
            </div>
            {!uploadingImage && (
              <button
                type="button"
                onClick={clearSelectedImage}
                className="size-7 rounded-full bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                title="Remove photo"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Input Bar or Voice Recording Bar */}
        {isRecording ? (
          <div className="p-3 border-t border-border/60 bg-card flex items-center gap-3 shrink-0 animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div className="flex items-center gap-2 text-red-500 shrink-0">
              <span className="size-2.5 rounded-full bg-red-500 animate-ping" />
              <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                Recording
                <span className="font-mono text-red-500 dark:text-red-400 font-bold text-sm">
                  {Math.floor(recordSeconds / 60)}:{(recordSeconds % 60).toString().padStart(2, "0")}
                </span>
              </span>
            </div>

            {/* Sound wave visual animation */}
            <div className="flex-1 flex items-center justify-center gap-1 h-7 overflow-hidden px-2">
              {[40, 75, 95, 60, 30, 85, 100, 45, 90, 60, 35, 80, 55, 95, 70, 30].map((h, i) => (
                <span
                  key={i}
                  className="w-1 bg-red-500/70 rounded-full animate-pulse"
                  style={{
                    height: `${h}%`,
                    animationDuration: `${0.5 + (i % 4) * 0.2}s`
                  }}
                />
              ))}
            </div>

            {/* Cancel Recording Button */}
            <button
              type="button"
              onClick={handleCancelRecording}
              className="size-10 rounded-full bg-secondary hover:bg-red-500/15 hover:text-red-500 text-muted-foreground flex items-center justify-center transition-colors shrink-0 cursor-pointer"
              title="Cancel recording"
            >
              <Trash2 className="size-4.5" />
            </button>

            {/* Stop & Send Recording Button */}
            <button
              type="button"
              onClick={handleStopAndSendRecording}
              className="size-10 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center transition-colors shrink-0 cursor-pointer shadow-md shadow-primary/20 active:scale-95"
              title="Send voice note"
            >
              <Send className="size-4.5" />
            </button>
          </div>
        ) : (
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }} 
            className="p-3 border-t border-border/60 bg-card flex items-center gap-2 shrink-0"
          >
            {/* Hidden File Input */}
            <input 
              id="chat-gallery-input"
              type="file" 
              accept="image/*" 
              ref={fileInputRef} 
              onChange={handleFileSelected} 
              className="sr-only" 
            />

            {/* Hidden Native Camera Input (សម្រាប់ iPhone / Mobile ថតផ្ទាល់) */}
            <input 
              id="chat-camera-capture-input"
              type="file" 
              accept="image/*" 
              capture="environment"
              ref={cameraInputRef} 
              onChange={handleFileSelected} 
              onClick={(e) => { e.target.value = ""; }}
              className="sr-only" 
            />

            {/* Photo / Image Attachment Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending || uploadingImage || uploadingVoice}
              className="size-10 rounded-full bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-primary flex items-center justify-center transition-colors shrink-0 cursor-pointer active:scale-95"
              title="ជ្រើសរូបភាពពីឯកសារ (Attach Photo)"
            >
              <ImageIcon className="size-4.5" />
            </button>

            {/* Take Photo / Camera Button (ថតរូប) */}
            {isMobile ? (
              <label
                htmlFor="chat-camera-capture-input"
                role="button"
                tabIndex={0}
                className={cn(
                  "size-10 rounded-full bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-amber-500 dark:hover:text-amber-400 flex items-center justify-center transition-colors shrink-0 cursor-pointer active:scale-95 select-none",
                  (sending || uploadingImage || uploadingVoice) && "opacity-50 pointer-events-none"
                )}
                title="ថតរូបផ្ទាល់ (Take Photo with Camera)"
              >
                <Camera className="size-4.5" />
              </label>
            ) : (
              <button
                type="button"
                onClick={() => setIsCameraOpen(true)}
                disabled={sending || uploadingImage || uploadingVoice}
                className="size-10 rounded-full bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-amber-500 dark:hover:text-amber-400 flex items-center justify-center transition-colors shrink-0 cursor-pointer active:scale-95"
                title="ថតរូប (Take Photo / Camera)"
              >
                <Camera className="size-4.5" />
              </button>
            )}

            {/* Voice Chat / Voice Note ("void chat") Button */}
            <button
              type="button"
              onClick={handleStartRecording}
              disabled={sending || uploadingImage || uploadingVoice}
              className="size-10 rounded-full bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-emerald-500 flex items-center justify-center transition-colors shrink-0 cursor-pointer active:scale-95"
              title="Voice Chat (Record Voice Note)"
            >
              {uploadingVoice ? (
                <Loader2 className="size-4.5 animate-spin text-primary" />
              ) : (
                <Mic className="size-4.5" />
              )}
            </button>

            <Input 
              value={inputMsg}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={uploadingVoice ? "Sending voice note..." : selectedImageFile ? "Add a caption (optional)..." : "Type a message..."}
              disabled={uploadingVoice}
              className="rounded-full bg-secondary/40 border-border/70 text-xs sm:text-sm h-11 px-4 flex-1 focus-visible:ring-primary"
            />
            <Button 
              type="submit" 
              disabled={(!inputMsg.trim() && !selectedImageFile) || sending || uploadingImage || uploadingVoice}
              className="size-11 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 shadow-md shadow-primary/20 cursor-pointer active:scale-95"
            >
              {sending || uploadingImage || uploadingVoice ? <Loader2 className="size-4.5 animate-spin" /> : <Send className="size-4.5" />}
            </Button>
          </form>
        )}

        {/* Live Camera Viewfinder Modal (ថតរូបផ្ទាល់) */}
        <Dialog open={isCameraOpen} onOpenChange={(v) => {
          if (!v) {
            setIsCameraOpen(false);
            stopCameraStream();
          }
        }}>
          <DialogContent 
            showCloseButton={false}
            className="max-w-md p-0 overflow-hidden bg-zinc-950 border-zinc-800 text-white rounded-3xl z-[130] shadow-2xl"
          >
            <DialogHeader className="p-4 pb-2 flex flex-row items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center">
                  <Camera className="size-4" />
                </div>
                <div>
                  <DialogTitle className="text-sm font-bold text-white">ថតរូប (Take Photo)</DialogTitle>
                  <DialogDescription className="text-[11px] text-zinc-400">
                    {cameraFacingMode === "environment" ? "កាមេរ៉ាក្រោយ (Rear Camera)" : "កាមេរ៉ាមុខ (Front Camera)"}
                  </DialogDescription>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCameraOpen(false);
                  stopCameraStream();
                }}
                className="size-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-zinc-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </DialogHeader>

            {/* Viewfinder Frame */}
            <div className="relative aspect-[4/3] sm:aspect-square bg-black flex items-center justify-center overflow-hidden">
              {cameraLoading ? (
                <div className="flex flex-col items-center gap-2 text-zinc-400 text-xs">
                  <Loader2 className="size-7 animate-spin text-primary" />
                  <span>កំពុងបើកកាមេរ៉ា...</span>
                </div>
              ) : cameraError ? (
                <div className="p-6 text-center space-y-3">
                  <div className="size-12 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center mx-auto">
                    <Camera className="size-6" />
                  </div>
                  <p className="text-xs text-zinc-300">មិនអាចបើក Web Camera បានទេ ({cameraError})</p>
                  <label
                    htmlFor="chat-camera-capture-input"
                    role="button"
                    onClick={() => {
                      setIsCameraOpen(false);
                      stopCameraStream();
                    }}
                    className="inline-flex items-center justify-center bg-primary hover:bg-primary/90 text-white text-xs h-9 px-4 rounded-xl gap-2 font-medium cursor-pointer active:scale-95"
                  >
                    <Camera className="size-3.5" />
                    ប្រើប្រាស់ម៉ាស៊ីនថតទូរស័ព្ទ (Phone Camera)
                  </label>
                </div>
              ) : (
                <>
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    webkit-playsinline="true"
                    className={cn(
                      "size-full object-cover",
                      cameraFacingMode === "user" && "-scale-x-100"
                    )}
                  />
                  {/* Viewfinder crosshairs */}
                  <div className="absolute inset-5 border border-white/20 rounded-2xl pointer-events-none flex flex-col justify-between p-3">
                    <div className="flex justify-between">
                      <span className="size-4 border-t-2 border-l-2 border-white/80 rounded-tl-sm" />
                      <span className="size-4 border-t-2 border-r-2 border-white/80 rounded-tr-sm" />
                    </div>
                    <div className="flex justify-between">
                      <span className="size-4 border-b-2 border-l-2 border-white/80 rounded-bl-sm" />
                      <span className="size-4 border-b-2 border-r-2 border-white/80 rounded-br-sm" />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Bottom Camera Controls */}
            <div className="p-4 bg-zinc-950 border-t border-white/10 flex items-center justify-around">
              {/* Native device camera fallback */}
              <label
                htmlFor="chat-camera-capture-input"
                role="button"
                onClick={() => {
                  setIsCameraOpen(false);
                  stopCameraStream();
                }}
                className="flex flex-col items-center gap-1 text-[10px] text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="ប្រើប្រាស់ម៉ាស៊ីនថតប្រព័ន្ធទូរស័ព្ទ"
              >
                <div className="size-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">
                  <ImageIcon className="size-4" />
                </div>
                <span>Phone App</span>
              </label>

              {/* Shutter Button (ប៊ូតុងចុចថត) */}
              <button
                type="button"
                onClick={handleCapturePhoto}
                disabled={cameraLoading || Boolean(cameraError)}
                className="size-16 rounded-full border-4 border-white/80 flex items-center justify-center p-1 bg-white/10 hover:bg-white/20 active:scale-95 transition-transform cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                title="ចុចថតរូប (Snap Photo)"
              >
                <div className="size-full rounded-full bg-white shadow-lg flex items-center justify-center">
                  <div className="size-3.5 rounded-full bg-red-600 animate-pulse" />
                </div>
              </button>

              {/* Flip Camera Toggle */}
              <button
                type="button"
                onClick={handleToggleFacingMode}
                disabled={cameraLoading || Boolean(cameraError)}
                className="flex flex-col items-center gap-1 text-[10px] text-zinc-400 hover:text-white transition-colors cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                title="ប្តូរកាមេរ៉ាមុខ/ក្រោយ"
              >
                <div className="size-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">
                  <SwitchCamera className="size-4.5" />
                </div>
                <span>ប្តូរមុខ/ក្រោយ</span>
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Fullscreen Photo Lightbox Modal */}
        <Dialog open={Boolean(previewModalUrl)} onOpenChange={(v) => !v && setPreviewModalUrl(null)}>
          <DialogContent 
            showCloseButton={true}
            className="max-w-3xl p-2 bg-black/95 border-none text-white flex flex-col items-center justify-center rounded-2xl z-[120]"
          >
            <DialogHeader className="sr-only">
              <DialogTitle>Photo Preview</DialogTitle>
              <DialogDescription>Full Size Photo Attachment</DialogDescription>
            </DialogHeader>
            {previewModalUrl && (
              <img 
                src={previewModalUrl} 
                alt="Full preview" 
                className="max-h-[80vh] w-auto rounded-xl object-contain shadow-2xl" 
              />
            )}
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
