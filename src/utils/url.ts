export function asValidUrl(value: string) {
  const trimmed = value.trim();
  const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    return new URL(normalized).toString();
  } catch {
    return null;
  }
}

export function getHostname(value: string) {
  try {
    return new URL(value).hostname;
  } catch {
    return value;
  }
}
