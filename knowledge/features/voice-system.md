# Voice / Text-to-Speech System

## Purpose

Text-to-speech for route directions and AI dispatcher responses, enabling hands-free operation during rides.

## Current Implementation

### TTS Hook

**useTextToSpeech** (src/hooks/useTextToSpeech.ts):
- React hook for speech synthesis
- Provider selection and switching
- Auto-speak toggle
- Volume control

### Providers

| Provider | Description |
|----------|-------------|
| **Gemini** | Default, uses Gemini API for TTS |
| **OpenAI** | tts-1 model, high quality |
| **ElevenLabs** | Premium quality, higher cost |

**Voice Providers** (src/utils/voiceProviders.ts):
- Provider interface abstraction
- Each provider implements speak() method
- Fallback chain if provider fails

### Integration Points

- **Route directions**: TTS reads next stop/directions
- **AI Dispatcher**: Auto-speaks dispatcher responses
- **User toggle**: Volume icon in app header

### Server-Side Support

**server.ts**:
- TTS endpoint for provider API calls
- API key management (server-side only)
- Provider selection configuration

## Architecture

### Data Flow

```
Text Input → useTextToSpeech Hook → Provider Selection → Audio Output
                    ↓
            Volume Toggle → Mute/Unmute
                    ↓
            Auto-Speak → Dispatcher Responses
```

### Key Components

- **useTextToSpeech**: React hook with provider abstraction
- **Voice Providers**: Pluggable TTS implementations
- **Volume Toggle**: UI control in app header
- **Server TTS endpoint**: API key proxy

## Design Rationale

- **Multiple providers**: Quality/cost tradeoff options
- **Provider abstraction**: Easy to add new providers
- **Default Gemini**: Good balance of quality and cost
- **Server-side keys**: API keys never exposed to client
- **Auto-speak optional**: User controls when TTS activates

## Dependencies

- TTS provider APIs (Gemini, OpenAI, ElevenLabs)
- Browser Speech API (fallback)
- Server-side API key management
- Network connectivity

## Business Rules

1. Gemini is default TTS provider
2. Provider can be switched in settings
3. Volume toggle mutes/unmutes globally
4. Auto-speak can be toggled independently
5. TTS failures silently fall back to text-only
6. No audio recording or storage

## Security

- API keys stored server-side only
- No voice data transmitted or stored
- TTS requests proxied through server
- No user voice data collected

## Edge Cases

- **Provider unavailable**: Falls back to next provider
- **Network timeout**: TTS skipped, text shown
- **Browser no support**: Graceful degradation
- **Multiple rapid requests**: Queue management
- **Long text**: Truncation or chunking

## Failure Modes

- Provider API error → fallback to next provider
- Network failure → text-only display
- Browser speech synthesis unavailable → no audio
- Rate limiting → temporary TTS disable
- Invalid API key → server returns error, client shows text

## Testing

- Manual test: Toggle volume → verify audio on/off
- Test provider switching → verify each works
- Test auto-speak → verify dispatcher responses spoken
- Test offline → verify graceful degradation

## Known Limitations

- Quality varies by provider
- No voice customization (pitch, speed, accent)
- No multi-language TTS
- No audio caching
- Provider costs may accumulate
- No speech recognition (output only)

## Future Improvements

- Voice customization (pitch, speed, voice selection)
- Multi-language support
- Audio caching for repeated phrases
- Speech recognition for voice commands
- Offline TTS support
- Volume/voice profiles per context

## Related Source Files

- `src/hooks/useTextToSpeech.ts` — TTS hook
- `server.ts` — TTS endpoint
- `src/utils/voiceProviders.ts` — provider implementations

## Related Knowledge

- [AI Dispatcher](./ai-dispatcher.md) — TTS for dispatcher responses
- [Route System](./route-system.md) — TTS for directions
- [Ride Mode](./route-system.md#ride-mode) — hands-free execution

## Last Updated

2026-07-20 (commit c12bd44)
