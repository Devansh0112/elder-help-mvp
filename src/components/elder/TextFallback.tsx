'use client';

import { useState } from 'react';
import styles from './elder.module.css';

export function TextFallback({ onSend, disabled }: { onSend: (text: string) => Promise<void>; disabled?: boolean }) {
  const [text, setText] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    setText('');
    await onSend(t);
  }

  return (
    <form className={styles.textForm} onSubmit={submit}>
      <label htmlFor="maya-text" className={styles.srOnly}>
        Type to Maya
      </label>
      <input
        id="maya-text"
        data-testid="text-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type to Maya"
        autoComplete="off"
      />
      <button type="submit" data-testid="text-send" disabled={disabled}>
        Send
      </button>
    </form>
  );
}
