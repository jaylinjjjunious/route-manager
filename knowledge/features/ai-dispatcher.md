# AI Dispatcher and Safety News

## Purpose

AI-powered dispatcher chat for route advice and job management, plus Bakersfield area safety news aggregation.

## Current Implementation

### AI Dispatcher Chat

Assistant route navigation now opens Dashboard and focuses Today's Route when possible. The retired standalone Route tab is no longer a valid navigation destination, but route advice and route context remain available through shared route state and services.


- **Model**: Gemini 2
- **Capabilities**: Route advice, job management suggestions, natural language interface
- **Component**: AI Operations Assistant bubble. The legacy AIDispatcher component remains in source but is no longer mounted by a standalone Route tab.
- **Integration**: Chat interface with message history

**Use cases:**
- "What's the best order for my stops today?"
- "Should I skip the outlier job?"
- "How's the traffic to the next location?"
- "Add a new job at 123 Main St"

### Safety News

| Field | Description |
|-------|-------------|
| **Endpoint** | POST /api/safety-news |
| **Source** | Google News RSS |
| **Area** | Bakersfield, CA |
| **Auth** | No auth required on Worker variant |

**Safety Levels:**
- `high` — Critical safety alerts
- `watch` — Moderate safety concerns
- `info` — General safety information

**Component**: Safety brief panel in dashboard

### TTS System (Voice)

See [Voice System](./voice-system.md) for full details.

**Quick summary:**
- Text-to-speech for dispatcher responses
- Provider selection: Gemini (default), OpenAI, ElevenLabs
- Auto-speak for AI responses

## Architecture

### Data Flow

```
User Query → Gemini 2 → Response → Chat UI + TTS
                ↓
        Safety News RSS → Classification → Safety Brief
```

### Key Components

- **AI Operations Assistant**: Primary chat interface component
- **Safety Brief Panel**: Real-time safety level display
- **Voice Provider**: TTS integration for responses

## Design Rationale

- **Gemini 2**: Fast, capable, free tier available
- **No auth on Safety News**: Public RSS data, no user-specific content
- **Safety levels**: Quick visual assessment for route planning
- **TTS integration**: Hands-free operation during rides

## Dependencies

- Gemini 2 API key
- Google News RSS feed
- TTS providers (Gemini, OpenAI, ElevenLabs)
- Backend API endpoints

## Business Rules

1. AI Dispatcher requires valid Gemini API key
2. Safety News is publicly accessible (no auth)
3. Safety levels are AI-classified from RSS content
4. Dispatcher responses can trigger job/route actions
5. TTS speaks dispatcher responses by default (can be toggled)
6. Safety brief updates periodically

## Security

- Gemini API key stored server-side
- No user data sent to Gemini (route/job context only)
- Safety News is public data
- TTS audio not stored or transmitted

## Edge Cases

- **API rate limits**: Dispatcher may be temporarily unavailable
- **RSS feed down**: Safety news shows last cached data
- **TTS unavailable**: Dispatcher still works, just no audio
- **Invalid API key**: Clear error message shown
- **Long responses**: Chat auto-scrolls to bottom

## Failure Modes

- Gemini API error → dispatcher shows error, allows retry
- RSS fetch fails → safety brief shows "unavailable"
- TTS provider error → falls back to text-only
- Network timeout → graceful degradation with retry

## Testing

- Manual test: Ask dispatcher about route → verify response
- Test safety news → verify classification levels
- Test TTS toggle → verify audio on/off
- Test error handling (invalid API key)

## Known Limitations

- Dispatcher context limited to current session
- No persistent chat history
- Safety news not user-specific
- TTS quality varies by provider

## Future Improvements

- Persistent chat history
- Proactive dispatcher suggestions
- Safety news personalization
- Voice input for dispatcher
- Multi-language support
- Context-aware responses (time of day, weather)

## Related Source Files

- `src/assistant/tools/navigationTools.ts` — assistant navigation to Dashboard for route requests`r`n- `src/components/AIDispatcher.tsx` — retired legacy route chat component
- `server.ts` — backend API for dispatcher and safety news
- `worker/index.ts` — Worker backend variant
- `src/hooks/useTextToSpeech.ts` — TTS hook
- `src/utils/voiceProviders.ts` — provider implementations

## Related Knowledge

- [Voice System](./voice-system.md) — TTS for dispatcher
- [Route System](./route-system.md) — dispatcher advises on routes
- [Job System](./job-system.md) — dispatcher advises on jobs

## Last Updated

2026-07-22 (routes-page-removed)
