/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type VoiceStyle = 'calm' | 'professional' | 'fast' | 'friendly';

export interface VoiceOptions {
  rate: number;
  pitch: number;
}

export interface VoiceOption {
  id: string;
  name: string;
  description?: string;
  isPremium: boolean;
}

export interface VoiceProvider {
  id: string;
  name: string;
  description: string;
  isPremium: boolean;
  isAvailable(): Promise<boolean>;
  getVoices(): Promise<VoiceOption[]>;
  speak(
    text: string,
    style?: VoiceStyle,
    options?: VoiceOptions,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (err: string) => void
  ): Promise<void>;
  stop(): void;
}

/**
 * Native Browser Web Speech API Voice Provider with chunk queueing and natural pacing
 */
export class BrowserVoiceProvider implements VoiceProvider {
  id = 'browser';
  name = 'System Default Voice';
  description = 'Free, client-side browser text-to-speech synthesis.';
  isPremium = false;

  private speechQueue: string[] = [];
  private currentQueueIndex = 0;
  private isInterrupted = false;
  private activeTimeout: any = null;

  async isAvailable(): Promise<boolean> {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  async getVoices(): Promise<VoiceOption[]> {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
    return window.speechSynthesis.getVoices().map(v => ({
      id: v.name,
      name: `${v.name} (${v.lang})`,
      isPremium: false
    }));
  }

  async speak(
    text: string,
    style: VoiceStyle = 'calm',
    options: VoiceOptions = { rate: 0.90, pitch: 1.0 },
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (err: string) => void
  ): Promise<void> {
    const available = await this.isAvailable();
    if (!available) {
      if (onError) onError('Web Speech API is not supported in this browser.');
      return;
    }

    try {
      this.stop(); // Clear any ongoing queues or active timeouts

      if (!text || text.trim() === '') {
        if (onEnd) onEnd();
        return;
      }

      // Break long narrative briefings into natural, conversational chunks by sentences.
      const sentences = text
        .split(/(?<=[.!?])\s+/)
        .map(s => s.trim())
        .filter(s => s.length > 0);

      if (sentences.length === 0) {
        if (onEnd) onEnd();
        return;
      }

      this.speechQueue = sentences;
      this.currentQueueIndex = 0;
      this.isInterrupted = false;

      // Dispatch start trigger
      if (onStart) onStart();

      const speakChunk = () => {
        if (this.isInterrupted || this.currentQueueIndex >= this.speechQueue.length) {
          if (onEnd) onEnd();
          return;
        }

        const currentText = this.speechQueue[this.currentQueueIndex];
        const utterance = new SpeechSynthesisUtterance(currentText);

        // Retrieve available browser voices
        const voices = window.speechSynthesis.getVoices();

        // High-quality voice search sequence
        const preferredKeywords = [
          'natural',
          'enhanced',
          'google us english',
          'samantha',
          'daniel',
          'alex',
          'google uk english',
          'microsoft'
        ];

        let selectedVoice = null;
        for (const keyword of preferredKeywords) {
          selectedVoice = voices.find(v => 
            v.lang.startsWith('en') && 
            v.name.toLowerCase().includes(keyword)
          );
          if (selectedVoice) break;
        }

        // Standard English fallback
        if (!selectedVoice) {
          selectedVoice = voices.find(v => v.lang.startsWith('en')) || voices[0];
        }

        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }

        // Apply adjustable style properties and user sliders
        utterance.rate = options.rate;
        utterance.pitch = options.pitch;

        utterance.onend = () => {
          this.currentQueueIndex++;
          // Introduce a natural 350ms pause between sentence sections
          this.activeTimeout = setTimeout(() => {
            speakChunk();
          }, 350);
        };

        utterance.onerror = (event) => {
          if (event.error === 'interrupted' || event.error === 'canceled') {
            this.isInterrupted = true;
            return;
          }
          console.warn('Speech synthesis chunk warning:', event.error);
          this.currentQueueIndex++;
          speakChunk();
        };

        window.speechSynthesis.speak(utterance);
      };

      // Fire off first audio segment
      speakChunk();

    } catch (err: any) {
      if (onError) onError(err?.message || 'Failed to start browser voice synthesis.');
      if (onEnd) onEnd();
    }
  }

  stop(): void {
    this.isInterrupted = true;
    if (this.activeTimeout !== null) {
      clearTimeout(this.activeTimeout);
      this.activeTimeout = null;
    }
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } catch (e) {}
    this.speechQueue = [];
    this.currentQueueIndex = 0;
  }
}

/**
 * Base class for Premium AI Voice Providers running server-side APIs
 */
export class PremiumVoiceProvider implements VoiceProvider {
  id: string;
  name: string;
  description: string;
  isPremium = true;
  private audio: HTMLAudioElement | null = null;

  constructor(id: string, name: string, description: string) {
    this.id = id;
    this.name = name;
    this.description = description;
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async getVoices(): Promise<VoiceOption[]> {
    return [
      { id: 'calm', name: 'Calm', isPremium: true, description: 'Warm and relaxed tone' },
      { id: 'professional', name: 'Professional', isPremium: true, description: 'Direct and authoritative delivery' },
      { id: 'friendly', name: 'Friendly', isPremium: true, description: 'Cheerful and encouraging tone' },
      { id: 'fast', name: 'Rapid-Fire', isPremium: true, description: 'Fast-paced informational reading' }
    ];
  }

  async speak(
    text: string,
    style: VoiceStyle = 'calm',
    options: VoiceOptions = { rate: 0.90, pitch: 1.0 },
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (err: string) => void
  ): Promise<void> {
    this.stop();

    try {
      const response = await fetch('/api/dispatcher/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          engine: this.id,
          style
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const msg = errData.message || `Voice generation failed (${response.status})`;
        if (onError) onError(msg);
        return;
      }

      const data = await response.json();
      if (!data.audio) {
        if (onError) onError('No audio data received from server');
        return;
      }

      const audioUrl = `data:${data.mimeType};base64,${data.audio}`;
      this.audio = new Audio(audioUrl);
      
      if (onStart) {
        this.audio.onplay = () => {
          onStart();
        };
      }

      if (onEnd) {
        this.audio.onended = () => {
          onEnd();
        };
      }
      
      this.audio.onerror = () => {
        if (onError) onError('Audio playback failed.');
      };

      await this.audio.play();

    } catch (err: any) {
      console.error(`Premium voice (${this.id}) error:`, err);
      if (onError) onError(err.message || 'Network error during voice generation.');
    }
  }

  stop(): void {
    if (this.audio) {
      try {
        this.audio.pause();
        this.audio.currentTime = 0;
      } catch (e) {
        console.error('Error stopping audio:', e);
      }
      this.audio = null;
    }
  }
}

/**
 * Real Gemini Text-to-Speech Voice Provider
 */
export class FutureGeminiVoiceProvider extends PremiumVoiceProvider {
  constructor() {
    super(
      'gemini_tts',
      'Gemini Voice Engine',
      'Ultra-realistic multimodal narration. (Requires Gemini API Key).'
    );
  }
}

/**
 * Real OpenAI TTS Voice Provider
 */
export class FutureOpenAIVoiceProvider extends PremiumVoiceProvider {
  constructor() {
    super(
      'openai_tts',
      'OpenAI Alloy/Nova',
      'Warm conversational AI voice models. (Requires OpenAI API Key).'
    );
  }
}

/**
 * Real ElevenLabs TTS Voice Provider
 */
export class FutureElevenLabsVoiceProvider extends PremiumVoiceProvider {
  constructor() {
    super(
      'elevenlabs',
      'ElevenLabs Professional',
      'Industrial-grade hyper-realistic cloned voice. (Requires ElevenLabs API Key).'
    );
  }
}

/**
 * Registry of all available voice providers
 */
export const ALL_VOICE_PROVIDERS: VoiceProvider[] = [
  new BrowserVoiceProvider(),
  new FutureGeminiVoiceProvider(),
  new FutureOpenAIVoiceProvider(),
  new FutureElevenLabsVoiceProvider()
];

