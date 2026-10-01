import enUS from './en-US.json';

type LocaleMessages = typeof enUS;

let messages: LocaleMessages = enUS;

export function setLocale(locale: string): void {
  if (locale === 'en-US') {
    messages = enUS;
  }
}

export function translate(key: string, params?: Record<string, string | number>): string {
  const keys = key.split('.');
  let value: unknown = messages;

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = (value as Record<string, unknown>)[k];
    } else {
      console.warn(`Translation key not found: ${key}`);
      return key;
    }
  }

  if (typeof value !== 'string') {
    console.warn(`Translation key is not a string: ${key}`);
    return key;
  }

  if (params) {
    return Object.entries(params).reduce((str, [k, v]) => str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)), value);
  }

  return value;
}

export function getLocale(): string {
  return 'en-US';
}

export { messages as locale };