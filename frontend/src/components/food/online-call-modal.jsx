import { useState, useEffect, useRef } from "react";
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  User, 
  Bike, 
  ShieldCheck, 
  Sparkles,
  Wifi
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { startActiveCall, getActiveCall, answerActiveCall, endActiveCall } from "@/lib/api";
import { WebRTCManager } from "@/lib/webrtc";
import { cn } from "@/lib/utils";

// Tone synthesizers using Web Audio API for ringing & connect sounds
let activeRingtoneInstance = null;

function stopAllRingtones() {
  if (activeRingtoneInstance) {
    try {
      activeRingtoneInstance();
    } catch (e) {}
    activeRingtoneInstance = null;
  }
}

function startRingtone() {
  stopAllRingtones();
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return () => {};
    const ctx = new AudioContext();
    let isRunning = true;

    const playBeep = () => {
      if (!isRunning || ctx.state === "closed") return;
      try {
        const now = ctx.currentTime;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = "sine";
        osc2.type = "sine";
        osc1.frequency.setValueAtTime(440, now);
        osc2.frequency.setValueAtTime(480, now);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.setValueAtTime(0.12, now + 1.1);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.2);
        osc2.stop(now + 1.2);
      } catch (e) {}
    };

    playBeep();
    const interval = setInterval(playBeep, 3500);

    const stop = () => {
      isRunning = false;
      clearInterval(interval);
      try {
        if (ctx && ctx.state !== "closed") {
          ctx.close().catch(() => {});
        }
      } catch (e) {}
    };

    activeRingtoneInstance = stop;
    return stop;
  } catch (e) {
    return () => {};
  }
}

function playEndCallTone() {
  stopAllRingtones();
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(425, now);
    osc.frequency.setValueAtTime(320, now + 0.15);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);

    setTimeout(() => {
      try {
        if (ctx && ctx.state !== "closed") {
          ctx.close().catch(() => {});
        }
      } catch (e) {}
    }, 500);
  } catch (e) {}
}

export function OnlineCallModal({
  open,
  onOpenChange,
  orderId,
  recipient = { name: "Partner", role: "Driver", photo: "" },
  callerType = "CUSTOMER", // "CUSTOMER" or "DRIVER"
  currentUser = { name: "User" },
  isIncoming = false
}) {
  const [callStatus, setCallStatus] = useState("connecting"); // "connecting", "ringing", "connected", "ended"
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const stopRingRef = useRef(null);
  const callStatusRef = useRef(callStatus);
  const audioRef = useRef(null);
  const webrtcRef = useRef(null);

  useEffect(() => {
    callStatusRef.current = callStatus;
  }, [callStatus]);

  // 1. Initiate or Join Call
  useEffect(() => {
    if (!open || !orderId) {
      stopAllRingtones();
      if (stopRingRef.current) {
        stopRingRef.current();
        stopRingRef.current = null;
      }
      setCallStatus("connecting");
      setSecondsElapsed(0);
      setIsMinimized(false);
      if (webrtcRef.current) {
        webrtcRef.current.stopAll();
        webrtcRef.current = null;
      }
      return;
    }

    if (isIncoming) {
      setCallStatus("ringing");
      stopRingRef.current = startRingtone();
    } else {
      // Caller initiates
      setCallStatus("connecting");
      startActiveCall({
        order_id: orderId,
        caller_type: callerType,
        caller_name: currentUser.name || "User",
        receiver_type: callerType === "CUSTOMER" ? "DRIVER" : "CUSTOMER",
        receiver_name: recipient.name || "Partner"
      }).then(() => {
        setCallStatus("ringing");
        stopRingRef.current = startRingtone();
      }).catch(() => {
        setCallStatus("ringing");
        stopRingRef.current = startRingtone();
      });
    }

    // Call Timeout after 32 seconds if no one answers (កំណត់ពេលដាច់ Call)
    const timeoutTimer = setTimeout(() => {
      if (callStatusRef.current === "ringing" || callStatusRef.current === "connecting") {
        handleEndCall();
      }
    }, 32000);

    // Polling call status every 1.5s for real-time answer / end sync
    const pollInterval = setInterval(async () => {
      try {
        const res = await getActiveCall(orderId);
        if (!res.active) {
          // Call was ended or does not exist in DB -> disconnect immediately
          if (callStatusRef.current !== "ended") {
            handleLocalEnd();
          }
        } else if (res.call) {
          if (res.call.status === "ACCEPTED" && callStatusRef.current !== "connected") {
            stopAllRingtones();
            if (stopRingRef.current) {
              stopRingRef.current();
              stopRingRef.current = null;
            }
            setCallStatus("connected");
            
            // WebRTC Connection Logic (if not already started)
            if (!webrtcRef.current) {
              webrtcRef.current = new WebRTCManager(orderId, callerType);
              webrtcRef.current.onRemoteTrack = (stream) => {
                if (audioRef.current && audioRef.current.srcObject !== stream) {
                  audioRef.current.srcObject = stream;
                }
              };
              
              const micReady = await webrtcRef.current.startLocalAudio();
              if (micReady) {
                webrtcRef.current.startPolling();
                // If caller, send OFFER
                if (!isIncoming) {
                  webrtcRef.current.createOffer();
                }
              } else {
                toast.error("Microphone access denied or error");
              }
            }
          } else if (res.call.status === "ENDED" || res.call.status === "REJECTED") {
            if (callStatusRef.current !== "ended") {
              handleLocalEnd();
            }
          }
        }
      } catch (e) {}
    }, 1500);

    return () => {
      clearTimeout(timeoutTimer);
      clearInterval(pollInterval);
      stopAllRingtones();
      if (stopRingRef.current) {
        stopRingRef.current();
        stopRingRef.current = null;
      }
    };
  }, [open, orderId, isIncoming]);

  // Call Duration Counter
  useEffect(() => {
    if (callStatus !== "connected") return;
    const timer = setInterval(() => {
      setSecondsElapsed(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [callStatus]);

  const secondsElapsedRef = useRef(0);
  const hasLoggedCallRef = useRef(false);

  useEffect(() => {
    secondsElapsedRef.current = secondsElapsed;
  }, [secondsElapsed]);

  const logCallRecord = async (finalDuration) => {
    if (hasLoggedCallRef.current || !orderId) return;
    hasLoggedCallRef.current = true;

    try {
      const { sendOrderMessage } = await import("@/lib/api");
      let msgText = "";
      if (finalDuration > 0) {
        msgText = `📞 Voice Call • ${formatTimer(finalDuration)}`;
      } else {
        msgText = isIncoming ? "📞 Missed Voice Call" : "📞 Cancelled Call";
      }

      await sendOrderMessage({
        order_id: orderId,
        sender_type: callerType,
        sender_name: currentUser.name || "System",
        message: msgText
      });
    } catch (e) {}
  };

  const handleLocalEnd = () => {
    stopAllRingtones();
    if (stopRingRef.current) {
      stopRingRef.current();
      stopRingRef.current = null;
    }
    playEndCallTone();
    setCallStatus("ended");
    setIsMinimized(false);
    
    if (webrtcRef.current) {
      webrtcRef.current.stopAll();
      webrtcRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.srcObject = null;
    }

    // Save call record to chat thread
    const dur = secondsElapsedRef.current;
    if (!isIncoming || dur > 0) {
      logCallRecord(dur);
    }

    setTimeout(() => {
      onOpenChange(false);
    }, 600);
  };

  const handleEndCall = async () => {
    stopAllRingtones();
    if (orderId) {
      endActiveCall(orderId).catch(() => {});
    }
    handleLocalEnd();
  };

  const handleAnswerCall = async () => {
    stopAllRingtones();
    if (stopRingRef.current) {
      stopRingRef.current();
      stopRingRef.current = null;
    }
    if (orderId) {
      answerActiveCall(orderId).catch(() => {});
    }
    setCallStatus("connected");
  };

  const formatTimer = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const isCallActive = (callStatus === "connected" || callStatus === "ringing" || callStatus === "connecting");

  useEffect(() => {
    if (webrtcRef.current) {
      webrtcRef.current.setMuted(isMuted);
    }
  }, [isMuted]);

  return (
    <>
      <audio ref={audioRef} autoPlay playsInline className="hidden" />
      {/* 🟢 TOP FLOATING DYNAMIC ISLAND ACTIVE CALL BAR (When Minimized) */}
      {open && isMinimized && isCallActive && (
        <div 
          onClick={() => setIsMinimized(false)}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-[99999] w-[92vw] max-w-md py-2 px-3 rounded-full bg-zinc-950/95 backdrop-blur-xl border border-emerald-500/40 text-white shadow-2xl shadow-emerald-950/50 flex items-center justify-between gap-2.5 cursor-pointer hover:border-emerald-400 transition-all active:scale-98 animate-in slide-in-from-top-4 duration-300"
        >
          <div className="flex items-center gap-3 min-w-0">
            {/* Avatar with live pulsating ring */}
            <div className="relative shrink-0">
              <div className="size-9 rounded-full ring-2 ring-emerald-500/70 p-0.5 bg-gradient-to-tr from-emerald-500 to-amber-500 overflow-hidden">
                {recipient.photo ? (
                  <img src={recipient.photo} alt={recipient.name} className="size-full rounded-full object-cover" />
                ) : (
                  <div className="size-full rounded-full bg-zinc-800 flex items-center justify-center font-bold text-xs text-white">
                    {recipient.name ? recipient.name.slice(0, 1) : "P"}
                  </div>
                )}
              </div>
              <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-500 ring-2 ring-zinc-950 animate-ping" />
            </div>

            {/* Caller Name & Live Timer */}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h4 className="font-bold text-xs text-white truncate max-w-[130px] sm:max-w-[180px]">
                  {recipient.name || "Partner"}
                </h4>
                <span className="text-[10px] text-emerald-400 font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                  HD
                </span>
              </div>
              <p className="text-[11px] font-mono text-emerald-400 font-semibold flex items-center gap-1">
                <Wifi className="size-3 animate-pulse" />
                {callStatus === "connected" ? formatTimer(secondsElapsed) : "Ringing..."}
              </p>
            </div>
          </div>

          {/* Action buttons on pill */}
          <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
            {/* Mute toggle */}
            {callStatus === "connected" && (
              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className={cn(
                  "size-8.5 rounded-full flex items-center justify-center transition-all cursor-pointer",
                  isMuted ? "bg-red-500 text-white" : "bg-white/10 hover:bg-white/20 text-white"
                )}
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
              </button>
            )}

            {/* Accept Call button (only for receiver during ringing) */}
            {callStatus === "ringing" && isIncoming && (
              <button
                type="button"
                onClick={handleAnswerCall}
                className="size-8.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center transition-all cursor-pointer shadow-md active:scale-95 animate-pulse"
                title="Accept Call"
              >
                <Phone className="size-4" />
              </button>
            )}

            {/* End / Cancel Call */}
            <button
              type="button"
              onClick={handleEndCall}
              className="size-8.5 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-all cursor-pointer shadow-md active:scale-95"
              title={callStatus === "ringing" ? (isIncoming ? "Decline" : "Cancel") : "End Call"}
            >
              <PhoneOff className="size-4" />
            </button>

            {/* Expand button */}
            <button
              type="button"
              onClick={() => setIsMinimized(false)}
              className="size-8.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center transition-all cursor-pointer shadow-md"
              title="View Full Call"
            >
              Full
            </button>
          </div>
        </div>
      )}

      {/* 📱 FULL SCREEN ONLINE CALL MODAL */}
      <Dialog 
        open={open && !isMinimized} 
        onOpenChange={(val) => {
          if (!val) {
            // When closing dialog while call is active, minimize to top island instead of hanging up
            if (isCallActive) {
              setIsMinimized(true);
            } else {
              handleEndCall();
            }
          } else {
            onOpenChange(val);
          }
        }}
      >
        <DialogContent 
          showCloseButton={false}
          className="w-[92vw] max-w-sm p-0 overflow-hidden rounded-[36px] bg-zinc-950 text-white border border-white/15 shadow-2xl z-[120]"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Online Call with {recipient.name}</DialogTitle>
            <DialogDescription>Flame & Crust High Quality In-App Voice Call</DialogDescription>
          </DialogHeader>

          {/* Ambient Top Glow */}
          <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-red-600/30 via-orange-600/10 to-transparent pointer-events-none" />

          {/* Minimize Button in Top-Left */}
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="absolute top-4 left-4 z-20 size-8 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            title="Minimize Call to Top Banner"
          >
            <span className="text-xs font-bold">−</span>
          </button>

          <div className="relative z-10 p-6 flex flex-col items-center justify-between min-h-[460px] select-none">
            {/* Top Status */}
            <div className="text-center space-y-1.5 pt-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-[11px] font-bold text-amber-400">
                <Wifi className="size-3.5 animate-pulse text-emerald-400" />
                <span>Flame Voice HD • End-to-End</span>
              </div>
              <h3 className="text-xl font-black tracking-tight text-white pt-2">
                {recipient.name || "Delivery Partner"}
              </h3>
              <p className="text-xs text-zinc-400 font-semibold">
                {callStatus === "connecting" && "Connecting..."}
                {callStatus === "ringing" && (isIncoming ? "Incoming Call..." : "Ringing...")}
                {callStatus === "connected" && (
                  <span className="text-emerald-400 font-mono font-bold text-sm tracking-wider">
                    {formatTimer(secondsElapsed)}
                  </span>
                )}
                {callStatus === "ended" && "Call Ended"}
              </p>
            </div>

            {/* Central Pulsating Avatar */}
            <div className="relative my-6 flex items-center justify-center">
              {callStatus === "connected" && (
                <>
                  <span className="absolute size-36 rounded-full bg-emerald-500/20 animate-ping opacity-75" />
                  <span className="absolute size-44 rounded-full bg-emerald-500/10 animate-pulse" />
                </>
              )}
              {callStatus === "ringing" && (
                <>
                  <span className="absolute size-36 rounded-full bg-emerald-500/20 animate-ping opacity-75" />
                  <span className="absolute size-44 rounded-full bg-amber-500/15 animate-pulse" />
                </>
              )}

              <div className="relative size-28 rounded-full ring-4 ring-white/20 p-1 bg-gradient-to-tr from-red-600 to-amber-500 shadow-2xl">
                {recipient.photo ? (
                  <img 
                    src={recipient.photo} 
                    alt={recipient.name} 
                    className="size-full rounded-full object-cover shadow-inner" 
                  />
                ) : (
                  <div className="size-full rounded-full bg-zinc-900 text-white flex items-center justify-center">
                    <User className="size-12 text-zinc-400" />
                  </div>
                )}
              </div>
            </div>

            {/* Call Controls Toolbar */}
            <div className="w-full space-y-4">
              {callStatus === "connected" && (
                <div className="flex items-center justify-center gap-6">
                  {/* Mute Mic */}
                  <button
                    type="button"
                    onClick={() => setIsMuted(!isMuted)}
                    className={cn(
                      "size-13 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-md",
                      isMuted 
                        ? "bg-red-500/20 text-red-400 border border-red-500/50" 
                        : "bg-white/10 hover:bg-white/20 text-white border border-white/10"
                    )}
                    title={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted ? <MicOff className="size-5.5" /> : <Mic className="size-5.5" />}
                  </button>

                  {/* Speaker */}
                  <button
                    type="button"
                    onClick={() => setIsSpeaker(!isSpeaker)}
                    className={cn(
                      "size-13 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-md",
                      isSpeaker 
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50" 
                        : "bg-white/10 hover:bg-white/20 text-white border border-white/10"
                    )}
                    title={isSpeaker ? "Speaker On" : "Speaker Off"}
                  >
                    {isSpeaker ? <Volume2 className="size-5.5" /> : <VolumeX className="size-5.5" />}
                  </button>
                </div>
              )}

              {/* Accept / Answer Button ONLY for the RECEIVER (isIncoming === true) */}
              {callStatus === "ringing" && isIncoming && (
                <button
                  type="button"
                  onClick={handleAnswerCall}
                  className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer animate-pulse"
                >
                  <Phone className="size-4.5" />
                  <span>Accept / Answer Call</span>
                </button>
              )}

              {/* End / Decline / Cancel Button */}
              <button
                type="button"
                onClick={handleEndCall}
                className="w-full h-12 rounded-2xl bg-red-600 hover:bg-red-700 active:scale-98 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 transition-all cursor-pointer"
              >
                <PhoneOff className="size-4.5" />
                <span>
                  {callStatus === "ringing" 
                    ? (isIncoming ? "Decline Call" : "Cancel Call") 
                    : "End Call"}
                </span>
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
