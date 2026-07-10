/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { VoiceProvider, VoiceStyle, ALL_VOICE_PROVIDERS } from '../utils/voiceProviders';

export interface UseTextToSpeechReturn {
  isSpeaking: boolean;
  isLoadingAudio: boolean;
  isSupported: boolean;
  speak: (text: string) => void;
  stop: () => void;
  errorMessage: string | null;
  activeProviderId: string;
  setActiveProviderId: (id: string) => void;
  activeStyleId: VoiceStyle;
  setActiveStyleId: (style: VoiceStyle) => void;
  rate: number;
  setRate: (rate: number) => void;
  pitch: number;
  setPitch: (pitch: number) => void;
  availableProviders: VoiceProvider[];
}

export function useTextToSpeech(): UseTextToSpeechReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Default provider is system browser synthesis, default style is calm
  const [activeProviderId, setActiveProviderId] = useState<string>('browser');
  const [activeStyleId, setActiveStyleId] = useState<VoiceStyle>('calm');

  const [rate, setRate] = useState<number>(0.90);
  const [pitch, setPitch] = useState<number>(1.0);

  const activeProviderRef = useRef<VoiceProvider | null>(null);

  // Sync rate and pitch automatically when style switches
  useEffect(() => {
    switch (activeStyleId) {
      case 'calm':
        setRate(0.90);
        setPitch(1.0);
        break;
      case 'professional':
        setRate(0.98);
        setPitch(1.0);
        break;
      case 'fast':
        setRate(1.25);
        setPitch(1.05);
        break;
      case 'friendly':
        setRate(1.05);
        setPitch(1.10);
        break;
    }
  }, [activeStyleId]);

  // Check general support of at least browser fallback
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsSupported(true);
    } else {
      setIsSupported(false);
      setErrorMessage('Text-to-speech is not fully supported in this browser.');
    }
  }, []);

  // Find and bind current provider
  useEffect(() => {
    const provider = ALL_VOICE_PROVIDERS.find(p => p.id === activeProviderId) || ALL_VOICE_PROVIDERS[0];
    activeProviderRef.current = provider;
  }, [activeProviderId]);

  // Global stop cancels speech across all providers
  const stop = useCallback(() => {
    ALL_VOICE_PROVIDERS.forEach(p => {
      try {
        p.stop();
      } catch (err) {
        console.error(`Error stopping provider ${p.id}:`, err);
      }
    });
    setIsSpeaking(false);
    setIsLoadingAudio(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      ALL_VOICE_PROVIDERS.forEach(p => {
        try {
          p.stop();
        } catch (e) {}
      });
    };
  }, []);

  // Multi-provider speech dispatcher
  const speak = useCallback((text: string) => {
    const provider = activeProviderRef.current || ALL_VOICE_PROVIDERS[0];

    try {
      // Cancel any ongoing speech first to ensure no overlap
      stop();

      if (!text || text.trim() === '') return;

      if (provider.isPremium) {
        setIsLoadingAudio(true);
      }

      provider.speak(
        text,
        activeStyleId,
        { rate, pitch },
        () => {
          setIsSpeaking(true);
          setIsLoadingAudio(false);
          setErrorMessage(null);
        },
        () => {
          setIsSpeaking(false);
          setIsLoadingAudio(false);
        },
        (errorMsg) => {
          setIsLoadingAudio(false);
          // If a premium provider fails (missing key or API failure), fall back to Browser voice!
          if (provider.isPremium) {
            console.log(`Premium voice provider "${provider.name}" failed: ${errorMsg}. Falling back to BrowserVoiceProvider.`);
            setErrorMessage(errorMsg);
            
            const browserProvider = ALL_VOICE_PROVIDERS.find(p => p.id === 'browser');
            if (browserProvider) {
              browserProvider.speak(
                text,
                activeStyleId,
                { rate, pitch },
                () => {
                  setIsSpeaking(true);
                },
                () => {
                  setIsSpeaking(false);
                },
                (browserError) => {
                  setErrorMessage(`Both premium and browser fallback voices failed: ${browserError}`);
                  setIsSpeaking(false);
                }
              );
            } else {
              setIsSpeaking(false);
            }
          } else {
            setErrorMessage(errorMsg);
            setIsSpeaking(false);
          }
        }
      );
    } catch (err: any) {
      console.error('Failed to trigger voice provider speak:', err);
      setErrorMessage(err?.message || 'Failed to initialize selected Voice Provider.');
      setIsSpeaking(false);
      setIsLoadingAudio(false);
    }
  }, [activeStyleId, rate, pitch, stop]);

  return {
    isSpeaking,
    isLoadingAudio,
    isSupported,
    speak,
    stop,
    errorMessage,
    activeProviderId,
    setActiveProviderId,
    activeStyleId,
    setActiveStyleId,
    rate,
    setRate,
    pitch,
    setPitch,
    availableProviders: ALL_VOICE_PROVIDERS
  };
}

