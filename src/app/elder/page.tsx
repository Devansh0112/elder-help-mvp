'use client';

import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react';
import { Captions } from '@/components/elder/Captions';
import { MayaAvatar } from '@/components/elder/MayaAvatar';
import { singleFlight } from '@/components/elder/singleFlight';
import { ReminderBanner } from '@/components/elder/ReminderBanner';
import { TextFallback } from '@/components/elder/TextFallback';
import styles from '@/components/elder/elder.module.css';
import { COPY } from '@/config/copy';
import { household } from '@/config/household';
import type { TranscriptLine } from '@/server/conversations';
import type { ToolResult } from '@/server/tools';
import { getVoiceProvider, type SessionInfo } from '@/voice';
import { createFakeProvider } from '@/voice/fakeProvider';
import type { VoiceEvent, VoiceProvider } from '@/voice/VoiceProvider';

type Status = 'idle' | 'connecting' | 'active' | 'mic_denied' | 'resting';
type Reminder = { name: string; dose: string };

const REMINDER_POLL_MS = 60_000;

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return (await res.json()) as T;
}

export default function ElderPage() {
  const [status, setStatus] = useState<Status>('idle');
  const [speaking, setSpeaking] = useState(false);
  const [lines, setLines] = useState<TranscriptLine[]>([]);
  const [reminder, setReminder] = useState<Reminder | null>(null);
  const [fakeMode, setFakeMode] = useState(false);
  const [hasProvider, setHasProvider] = useState(false);

  const providerRef = useRef<VoiceProvider | null>(null);
  const setProvider = (p: VoiceProvider | null) => {
    providerRef.current = p;
    setHasProvider(p !== null);
  };
  // The conversation row is created on the first caption, so a denied mic leaves no empty conversation.
  const conversationRef = useRef<Promise<number> | null>(null);
  const contextRef = useRef<{ dueMedicine?: string }>({});
  const remindedRef = useRef(new Set<string>());

  const conversationId = () => {
    conversationRef.current ??= postJson<{ id: number }>('/api/conversations').then((r) => r.id);
    return conversationRef.current;
  };

  const endConversation = useCallback(async () => {
    const pending = conversationRef.current;
    conversationRef.current = null;
    if (!pending) return;
    try {
      await postJson(`/api/conversations/${await pending}/end`);
    } catch {
      // The dashboard still shows it as in progress; nothing else to do here.
    }
  }, []);

  const setContext = (ctx: { dueMedicine?: string }) => {
    contextRef.current = ctx;
    providerRef.current?.setContext(ctx);
  };

  const callTool = useCallback(async (name: string, args: unknown): Promise<ToolResult> => {
    try {
      const result = await postJson<ToolResult>(`/api/tools/${encodeURIComponent(name)}`, args ?? null);
      if (name === 'log_medicine' && result.ok) {
        setReminder(null);
        setContext({});
      }
      return result;
    } catch {
      return { ok: false, message: COPY.toolFailed };
    }
  }, []);

  // Builds an event handler bound to one provider, so events from a replaced provider are ignored.
  const handlerFor = (p: VoiceProvider) => (e: VoiceEvent) => {
    if (providerRef.current !== p) return;
    switch (e.type) {
      case 'caption':
        setLines((ls) => [...ls, e.line]);
        void conversationId()
          .then((id) => postJson(`/api/conversations/${id}/lines`, e.line).catch(() => {}))
          .catch(() => {});
        break;
      case 'speaking':
        setSpeaking(e.on);
        break;
      case 'error':
        if (e.reason === 'mic_denied') {
          setProvider(null);
          void p.stop();
          setStatus('mic_denied');
        } else {
          void switchToTextFallback();
        }
        break;
      case 'ended':
        setProvider(null);
        setSpeaking(false);
        setStatus((s) => (s === 'resting' ? 'resting' : 'idle'));
        void endConversation();
        break;
    }
  };

  const switchToTextFallback = async () => {
    const fallback = createFakeProvider({ speakMs: 1200 });
    setProvider(fallback);
    setSpeaking(false);
    setStatus('resting');
    fallback.setContext(contextRef.current);
    await fallback.start({ callTool, onEvent: handlerFor(fallback) });
    return fallback;
  };

  // One connect at a time: a reminder arriving while Talk is connecting joins that session instead of opening a second one.
  const connectRef = useRef<((initialPrompt?: string) => Promise<VoiceProvider>) | null>(null);
  const ensureSession = (initialPrompt?: string): Promise<VoiceProvider> => {
    if (providerRef.current) return Promise.resolve(providerRef.current);
    connectRef.current ??= singleFlight(connect);
    return connectRef.current(initialPrompt);
  };

  const connect = async (initialPrompt?: string): Promise<VoiceProvider> => {
    setStatus('connecting');
    let info: SessionInfo | null = null;
    try {
      info = await postJson<SessionInfo>('/api/session');
    } catch {
      info = null; // 503 voice_unavailable, or the server is unreachable
    }
    if (!info) return switchToTextFallback();

    const p = getVoiceProvider(info);
    setProvider(p);
    p.setContext(contextRef.current);
    setStatus('active');
    await p.start({ callTool, onEvent: handlerFor(p), initialPrompt });
    return p;
  };

  const sendText = async (text: string) => {
    const p = await ensureSession();
    await p.sendText(text);
  };

  const showReminder = (m: Reminder) => {
    remindedRef.current.add(m.name);
    setReminder(m);
    setContext({ dueMedicine: m.name });
    if (!providerRef.current) {
      void ensureSession(`It's time for your ${m.name}, ${m.dose}. Have you taken it?`);
    }
  };
  const onDue = useEffectEvent((m: Reminder) => showReminder(m));

  useEffect(() => {
    fetch('/api/session')
      .then((r) => r.json())
      .then((r: { provider: string }) => setFakeMode(r.provider === 'fake'))
      .catch(() => {});

    const poll = async () => {
      try {
        const due = (await (await fetch('/api/reminders/due')).json()) as Reminder[];
        const next = due.find((m) => !remindedRef.current.has(m.name));
        if (next) onDue({ name: next.name, dose: next.dose });
      } catch {
        // try again next minute
      }
    };
    void poll();
    const timer = setInterval(poll, REMINDER_POLL_MS);

    // Closing the tab mid-conversation still ends it, so the family gets a summary.
    const onHide = () => {
      const pending = conversationRef.current;
      if (!pending) return;
      void pending.then((id) => navigator.sendBeacon(`/api/conversations/${id}/end`));
    };
    window.addEventListener('pagehide', onHide);
    return () => {
      clearInterval(timer);
      window.removeEventListener('pagehide', onHide);
    };
  }, []);

  const inSession = hasProvider || status === 'connecting';
  const showText = fakeMode || status === 'resting';

  const statusText =
    status === 'resting'
      ? COPY.voiceUnavailable
      : status === 'connecting'
        ? 'Connecting to Maya…'
        : status === 'active'
          ? speaking
            ? 'Maya is speaking'
            : 'Maya is listening'
          : `Hello ${household.elderName}`;

  if (status === 'mic_denied') {
    return (
      <div className={styles.fullscreen} role="alert">
        <p>{COPY.micDenied}</p>
        <button
          className={styles.primary}
          onClick={() => {
            setStatus('idle');
            void ensureSession();
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <main className={styles.screen}>
      {reminder && <ReminderBanner name={reminder.name} dose={reminder.dose} />}
      <MayaAvatar speaking={speaking} resting={status === 'resting'} />
      <p className={styles.status}>{statusText}</p>

      {inSession ? (
        <button className={styles.secondary} data-testid="end-button" onClick={() => void providerRef.current?.stop()}>
          End conversation
        </button>
      ) : (
        <button className={styles.primary} data-testid="talk-button" onClick={() => void ensureSession()}>
          Talk to Maya
        </button>
      )}

      <Captions lines={lines} elderName={household.elderName} />
      {showText && <TextFallback onSend={sendText} />}

      <div className={styles.demoTools}>
        <button
          data-testid="trigger-reminder"
          onClick={() => {
            const m = household.medicines[0];
            showReminder({ name: m.name, dose: m.dose });
          }}
        >
          Trigger reminder now
        </button>
      </div>
    </main>
  );
}
