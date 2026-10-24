/**
 * Central Audio Player and Speech Coordinator for Ramya AI.
 * Prevents overlapping speech, manages speech barge-in interruption,
 * and coordinates auto-listening cycles cleanly.
 */

class CentralAudioPlayer {
  private currentAudio: HTMLAudioElement | null = null;
  private lastAudioUrl: string | null = null;
  private lastSpokenText: string | null = null;
  private isSpeaking: boolean = false;
  private onStateChangeListeners: ((isSpeaking: boolean) => void)[] = [];

  /**
   * Plays synthesized speech audio.
   * Automatically stops any currently playing audio to prevent overlapping speech.
   */
  async playSpeech(
    audioUrl: string,
    text?: string,
    onEnded?: () => void,
    onError?: (err: any) => void
  ): Promise<void> {
    // 1. Halt any ongoing audio immediately
    this.stop();

    this.lastAudioUrl = audioUrl;
    if (text) this.lastSpokenText = text;

    try {
      const audio = new Audio(audioUrl);
      this.currentAudio = audio;
      this.setSpeaking(true);

      audio.onended = () => {
        this.setSpeaking(false);
        this.currentAudio = null;
        if (onEnded) onEnded();
      };

      audio.onerror = (e) => {
        console.warn('[Ramya Audio] Playback error or abort:', e);
        this.setSpeaking(false);
        this.currentAudio = null;
        if (onError) onError(e);
      };

      await audio.play();
    } catch (err) {
      console.warn('[Ramya Audio] Playback caught:', err);
      this.setSpeaking(false);
      this.currentAudio = null;
      if (onError) onError(err);
    }
  }

  /**
   * Immediately stops any active audio playback (Barge-in).
   */
  stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    this.setSpeaking(false);
  }

  /**
   * Replays the most recent spoken audio response.
   */
  replayLast(onEnded?: () => void): void {
    if (this.lastAudioUrl) {
      this.playSpeech(this.lastAudioUrl, this.lastSpokenText || undefined, onEnded);
    }
  }

  getLastSpokenText(): string | null {
    return this.lastSpokenText;
  }

  getLastAudioUrl(): string | null {
    return this.lastAudioUrl;
  }

  getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  private setSpeaking(speaking: boolean) {
    this.isSpeaking = speaking;
    this.onStateChangeListeners.forEach((fn) => fn(speaking));
  }

  onSpeakingChange(listener: (isSpeaking: boolean) => void): () => void {
    this.onStateChangeListeners.push(listener);
    return () => {
      this.onStateChangeListeners = this.onStateChangeListeners.filter((l) => l !== listener);
    };
  }
}

export const audioPlayer = new CentralAudioPlayer();
