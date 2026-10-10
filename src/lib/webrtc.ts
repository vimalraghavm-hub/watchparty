import type { WebRTCSignalingMessage, CallStatus, MediaDeviceState } from '../types';

export interface WebRTCOptions {
  isPolite: boolean; // Perfect negotiation role (e.g. host = impolite false, guest = polite true)
  onRemoteStream: (stream: MediaStream | null) => void;
  onStatusChange: (status: CallStatus) => void;
  sendSignal: (signal: Omit<WebRTCSignalingMessage, 'senderId' | 'roomId' | 'timestamp'>) => Promise<void>;
}

export class WebRTCManager {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private options: WebRTCOptions;
  private isMakingOffer = false;
  private ignoreOffer = false;
  private deviceState: MediaDeviceState = {
    audioEnabled: true,
    videoEnabled: false,
    hasAudioPermission: false,
    hasVideoPermission: false,
  };

  constructor(options: WebRTCOptions) {
    this.options = options;
  }

  // Get ICE Server configuration from environment variables
  private getIceServers(): RTCIceServer[] {
    const stunServersEnv = import.meta.env.VITE_STUN_SERVERS || 'stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302';
    const stunUrls = stunServersEnv.split(',').map((s: string) => s.trim()).filter(Boolean);

    const iceServers: RTCIceServer[] = [
      { urls: stunUrls },
    ];

    const turnServer = import.meta.env.VITE_TURN_SERVERS;
    const turnUsername = import.meta.env.VITE_TURN_USERNAME;
    const turnCredential = import.meta.env.VITE_TURN_CREDENTIAL;

    if (turnServer) {
      iceServers.push({
        urls: turnServer.split(',').map((s: string) => s.trim()),
        username: turnUsername || undefined,
        credential: turnCredential || undefined,
      });
    }

    return iceServers;
  }

  // Initialize local audio/video media stream
  public async initLocalStream(enableVideo = false): Promise<MediaStream | null> {
    try {
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: enableVideo ? { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24 } } : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.localStream = stream;

      this.deviceState.hasAudioPermission = true;
      this.deviceState.audioEnabled = true;
      if (enableVideo) {
        this.deviceState.hasVideoPermission = true;
        this.deviceState.videoEnabled = true;
      }

      return stream;
    } catch (err) {
      console.warn('Media devices permission error:', err);
      this.options.onStatusChange('permission_denied');

      // Attempt audio-only fallback if video failed
      if (enableVideo) {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          this.localStream = audioStream;
          this.deviceState.hasAudioPermission = true;
          this.deviceState.audioEnabled = true;
          this.deviceState.videoEnabled = false;
          return audioStream;
        } catch {
          // Audio also failed
        }
      }
      return null;
    }
  }

  // Start PeerConnection with Perfect Negotiation Pattern
  public async connect(): Promise<void> {
    this.options.onStatusChange('connecting');

    const config: RTCConfiguration = {
      iceServers: this.getIceServers(),
    };

    this.peerConnection = new RTCPeerConnection(config);
    this.remoteStream = new MediaStream();
    this.options.onRemoteStream(this.remoteStream);

    // Add local tracks if available
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        if (this.localStream && this.peerConnection) {
          this.peerConnection.addTrack(track, this.localStream);
        }
      });
    }

    // Handle incoming remote tracks
    this.peerConnection.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        if (this.remoteStream && !this.remoteStream.getTracks().some((t) => t.id === track.id)) {
          this.remoteStream.addTrack(track);
        }
      });
      this.options.onRemoteStream(this.remoteStream);
    };

    // Perfect Negotiation: handling negotiationneeded
    this.peerConnection.onnegotiationneeded = async () => {
      try {
        if (!this.peerConnection) return;
        this.isMakingOffer = true;
        await this.peerConnection.setLocalDescription();
        if (this.peerConnection.localDescription) {
          await this.options.sendSignal({
            type: 'offer',
            sdp: this.peerConnection.localDescription,
          });
        }
      } catch (err) {
        console.error('Error handling negotiationneeded:', err);
      } finally {
        this.isMakingOffer = false;
      }
    };

    // Handle ICE candidates
    this.peerConnection.onicecandidate = async (event) => {
      if (event.candidate) {
        await this.options.sendSignal({
          type: 'ice-candidate',
          candidate: event.candidate.toJSON(),
        });
      }
    };

    // Handle Connection State changes
    this.peerConnection.onconnectionstatechange = () => {
      if (!this.peerConnection) return;
      const state = this.peerConnection.connectionState;
      if (state === 'connected') {
        this.options.onStatusChange('connected');
      } else if (state === 'disconnected' || state === 'failed') {
        this.options.onStatusChange('disconnected');
      }
    };
  }

  // Process incoming WebRTC signaling messages using Perfect Negotiation Pattern
  public async handleSignalingMessage(message: WebRTCSignalingMessage): Promise<void> {
    if (!this.peerConnection) return;

    try {
      if (message.type === 'offer' && message.sdp) {
        const offerCollision =
          this.isMakingOffer || this.peerConnection.signalingState !== 'stable';

        this.ignoreOffer = !this.options.isPolite && offerCollision;
        if (this.ignoreOffer) {
          return;
        }

        await this.peerConnection.setRemoteDescription(message.sdp);

        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);

        if (this.peerConnection.localDescription) {
          await this.options.sendSignal({
            type: 'answer',
            sdp: this.peerConnection.localDescription,
          });
        }
      } else if (message.type === 'answer' && message.sdp) {
        if (this.peerConnection.signalingState === 'have-local-offer') {
          await this.peerConnection.setRemoteDescription(message.sdp);
        }
      } else if (message.type === 'ice-candidate' && message.candidate) {
        try {
          await this.peerConnection.addIceCandidate(message.candidate);
        } catch (err) {
          if (!this.ignoreOffer) {
            console.warn('Error adding ICE candidate:', err);
          }
        }
      } else if (message.type === 'call-ended') {
        this.options.onStatusChange('disconnected');
        this.options.onRemoteStream(null);
      }
    } catch (err) {
      console.error('Error handling WebRTC signal:', err);
    }
  }

  // Toggle Microphone (Mute / Unmute)
  public toggleMicrophone(enabled?: boolean): boolean {
    if (!this.localStream) return false;
    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      const newState = enabled !== undefined ? enabled : !audioTrack.enabled;
      audioTrack.enabled = newState;
      this.deviceState.audioEnabled = newState;
      return newState;
    }
    return false;
  }

  // Toggle Camera (On / Off)
  public async toggleCamera(enable?: boolean): Promise<boolean> {
    const shouldEnable = enable !== undefined ? enable : !this.deviceState.videoEnabled;

    if (!shouldEnable) {
      // Turn camera off
      if (this.localStream) {
        const videoTrack = this.localStream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.stop();
          this.localStream.removeTrack(videoTrack);
        }
      }
      this.deviceState.videoEnabled = false;
      return false;
    }

    // Turn camera on
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
      });
      const newVideoTrack = videoStream.getVideoTracks()[0];

      if (this.localStream && newVideoTrack) {
        this.localStream.addTrack(newVideoTrack);

        if (this.peerConnection) {
          const sender = this.peerConnection.getSenders().find((s) => s.track?.kind === 'video');
          if (sender) {
            await sender.replaceTrack(newVideoTrack);
          } else {
            this.peerConnection.addTrack(newVideoTrack, this.localStream);
          }
        }
      }

      this.deviceState.videoEnabled = true;
      this.deviceState.hasVideoPermission = true;
      return true;
    } catch (err) {
      console.warn('Camera enablement failed:', err);
      this.deviceState.videoEnabled = false;
      return false;
    }
  }

  public getDeviceState(): MediaDeviceState {
    return { ...this.deviceState };
  }

  public getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  // Cleanup tracks and close connection
  public close(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    this.options.onRemoteStream(null);
    this.options.onStatusChange('idle');
  }
}
