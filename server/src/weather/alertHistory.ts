import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { GlobalAlertPayload } from '../types.js';

// A lightweight append-to-disk log, not a database — consistent with this
// project's "no Docker, no DB" approach elsewhere. Survives a server
// restart (unlike the in-memory user store and alert-state tracker),
// giving a freshly-connecting client visibility into alerts that fired
// before it ever opened a socket.
const HISTORY_PATH = join(process.cwd(), '.data', 'alert-history.json');
const MAX_HISTORY = 100;

let history: GlobalAlertPayload[] = [];

export function loadAlertHistory(): GlobalAlertPayload[] {
  if (existsSync(HISTORY_PATH)) {
    try {
      const raw: unknown = JSON.parse(readFileSync(HISTORY_PATH, 'utf-8'));
      history = Array.isArray(raw) ? raw : [];
    } catch (err) {
      console.error('failed to read alert history, starting empty:', err);
      history = [];
    }
  }
  return history;
}

export function appendAlert(alert: GlobalAlertPayload): void {
  history = [alert, ...history].slice(0, MAX_HISTORY);
  try {
    mkdirSync(dirname(HISTORY_PATH), { recursive: true });
    writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2));
  } catch (err) {
    console.error('failed to persist alert history:', err);
  }
}

export function getAlertHistory(): GlobalAlertPayload[] {
  return history;
}
