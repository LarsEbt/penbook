import { en } from './en';
import { de } from './de';

export type Locale = 'en' | 'de';
export type LanguageSetting = 'auto' | Locale;
export const LOCALES: Locale[] = ['en', 'de'];
/** English is the source language: every key exists there, and other locales fall back to it. */
const DICTS: Record<Locale, Record<string, string>> = { en, de };
type Params = readonly unknown[] | Record<string, unknown>;

let current: Locale = 'en';
let reverse: Map<string, string> | undefined;
let patterns: { regex: RegExp; order: string[]; en: string }[] = [];

export function getLocale(): Locale { return current; }
export function setLocale(locale: Locale) { current = locale; reverse = undefined; patterns = []; }

/** Map an Obsidian/BCP47 language tag (e.g. "de-AT", "en-gb") to the nearest supported locale; default English. */
export function resolveLocale(tag: string | null | undefined): Locale {
  return (tag ?? '').toLowerCase().startsWith('de') ? 'de' : 'en';
}

/** Obsidian stores its interface language in localStorage ("language"); moment's locale is the fallback. */
export function obsidianLanguage(): string {
  try {
    const stored = window.localStorage.getItem('language');
    if (stored) return stored;
  } catch { /* localStorage can be unavailable */ }
  try {
    const m = (window as unknown as { moment?: { locale?: () => string } }).moment;
    return m?.locale?.() ?? 'en';
  } catch { return 'en'; }
}

export function localeFor(setting: LanguageSetting | string | undefined): Locale {
  // Unknown stored values (hand-edited data.json, a removed language) behave like "auto" instead of breaking the UI.
  return LOCALES.includes(setting as Locale) ? (setting as Locale) : resolveLocale(obsidianLanguage());
}

/** Translate a key. Missing keys fall back to English, then to the key itself. Placeholders are {0}, {1}… or {name}. */
export function t(key: string, params?: Params): string {
  const text = DICTS[current][key] ?? en[key] ?? key;
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = (params as Record<string, unknown>)[name];
    return value === undefined ? match : String(value);
  });
}

/**
 * Look up the English text for a string produced by t() in the current locale. Icon and shortcut-hint logic matches
 * labels by their English text, so it must see the same value whatever the UI language is. Strings with placeholders
 * are matched by pattern, e.g. German "Radiererradius 3" -> "Eraser radius 3".
 */
export function enOf(text: string): string {
  if (current === 'en') return text;
  if (!reverse) {
    reverse = new Map();
    patterns = [];
    for (const [key, value] of Object.entries(DICTS[current])) {
      if (!en[key]) continue;
      if (/\{\w+\}/.test(value)) {
        const order: string[] = [];
        const source = value.split(/(\{\w+\})/).map(part => {
          const m = /^\{(\w+)\}$/.exec(part);
          if (m) { order.push(m[1]); return '(.*?)'; }
          return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }).join('');
        patterns.push({ regex: new RegExp(`^${source}$`), order, en: en[key] });
      } else if (!reverse.has(value)) reverse.set(value, en[key]);
    }
  }
  const exact = reverse.get(text);
  if (exact !== undefined) return exact;
  for (const { regex, order, en: template } of patterns) {
    const match = regex.exec(text);
    if (match) return template.replace(/\{(\w+)\}/g, (whole, name: string) => {
      const index = order.indexOf(name);
      return index < 0 ? whole : match[index + 1];
    });
  }
  return text;
}

/** English text for a key (independent of the current locale). */
export function enText(key: string): string { return en[key] ?? key; }
