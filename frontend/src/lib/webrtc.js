import { sendOrderMessage, getOrderMessages } from "./api";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" }
  ]
};

export class WebRTCManager {
  constructor(orderId, currentUserType) {
    this.orderId = orderId;
    this.currentUserType = currentUserType;
    this.pc = new RTCPeerConnection(ICE_SERVERS);
    this.localStream = null;
    this.remoteStream = new MediaStream();
    this.onRemoteTrack = null;
    this.processedMessages = new Set();
    this.pollInterval = null;

    this.pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach(track => {
        this.remoteStream.addTrack(track);
      });
      if (this.onRemoteTrack) this.onRemoteTrack(this.remoteStream);
    };

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignalingMessage("ICE", event.candidate);
      }
    };
  }

  async startLocalAudio() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      this.localStream.getTracks().forEach(track => {
        this.pc.addTrack(track, this.localStream);
      });
      return true;
    } catch (err) {
      console.error("Microphone access denied or error:", err);
      return false;
    }
  }

  setMuted(muted) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(t => t.enabled = !muted);
    }
  }

  stopAll() {
    if (this.pollInterval) clearInterval(this.pollInterval);
    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
    }
    if (this.pc) {
      this.pc.close();
    }
  }

  async sendSignalingMessage(type, payload) {
    const data = JSON.stringify({ type, payload, sender: this.currentUserType });
    await sendOrderMessage({
      order_id: this.orderId,
      sender_type: this.currentUserType,
      sender_name: "WebRTC",
      message: `__WEBRTC__:${data}`
    });
  }

  startPolling() {
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.pollInterval = setInterval(async () => {
      try {
        const msgs = await getOrderMessages(this.orderId);
        if (!Array.isArray(msgs)) return;
        
        for (const m of msgs) {
          if (this.processedMessages.has(m.id)) continue;
          this.processedMessages.add(m.id);
          
          if (m.message && m.message.startsWith("__WEBRTC__:")) {
            try {
              const dataStr = m.message.substring(11);
              const data = JSON.parse(dataStr);
              // Ignore our own messages
              if (data.sender === this.currentUserType) continue;

              await this.handleSignalingData(data);
            } catch (e) {
              console.error("Error parsing WebRTC signaling", e);
            }
          }
        }
      } catch (e) {}
    }, 1500);
  }

  async handleSignalingData(data) {
    const { type, payload } = data;
    if (type === "OFFER") {
      await this.pc.setRemoteDescription(new RTCSessionDescription(payload));
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      this.sendSignalingMessage("ANSWER", answer);
    } else if (type === "ANSWER") {
      await this.pc.setRemoteDescription(new RTCSessionDescription(payload));
    } else if (type === "ICE") {
      try {
        await this.pc.addIceCandidate(new RTCIceCandidate(payload));
      } catch (e) {}
    }
  }

  async createOffer() {
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    this.sendSignalingMessage("OFFER", offer);
  }
}
