// Mints a short-lived Realtime client secret so the API key never reaches the browser.
// Endpoint and shapes checked 2026-11-04 against the openai npm package 7.50.0 type definitions
// (resources/realtime/client-secrets.d.ts): POST /v1/realtime/client_secrets with { session }
// returns { value: "ek_...", expires_at, session }. Default model gpt-realtime-2.1; voice "marin";
// input transcription gpt-4o-mini-transcribe. Prompt and tools are sent by the browser via session.update.

const DEFAULT_REALTIME_MODEL = 'gpt-realtime-2.1';

function unavailable() {
  return Response.json({ error: 'voice_unavailable' }, { status: 503 });
}

// Tells the elder screen which mode it is in without minting a secret.
export async function GET() {
  return Response.json({ provider: process.env.VOICE_PROVIDER === 'fake' ? 'fake' : 'openai' });
}

export async function POST() {
  if (process.env.VOICE_PROVIDER === 'fake') return Response.json({ provider: 'fake' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return unavailable();

  const model = process.env.OPENAI_REALTIME_MODEL || DEFAULT_REALTIME_MODEL;
  try {
    const res = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        session: {
          type: 'realtime',
          model,
          audio: {
            input: { transcription: { model: 'gpt-4o-mini-transcribe' } },
            output: { voice: 'marin' },
          },
        },
      }),
    });
    if (!res.ok) return unavailable();
    const body = (await res.json()) as { value?: string };
    if (!body.value) return unavailable();
    return Response.json({ provider: 'openai', clientSecret: body.value, model });
  } catch {
    return unavailable();
  }
}
