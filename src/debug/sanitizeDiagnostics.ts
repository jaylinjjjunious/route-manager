// Diagnostics never retain request bodies, headers, cookies, or URL queries.
export function safeDiagnosticUrl(value: string): string {
  try {
    const url = new URL(value, window.location.href);
    return `${url.protocol}//${url.host}${url.pathname}`;
  } catch { return '(invalid URL)'; }
}

export function safeDiagnosticText(value: string): string {
  return value
    .replace(/"(?:authorization|cookie|password|access_token|refresh_token|apikey|api_key|service_role_key|secret|proofDataUrl)"\s*:\s*"[^"]*"/gi, '"sensitive":"[redacted]"')
    .replace(/data:[^\s"']+/gi, '[image omitted]')
    .replace(/Bearer\s+[^\s,;]+/gi, 'Bearer [redacted]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)?/g, '[redacted]')
    .replace(/\b(?:sb_(?:secret|publishable)_|sk-)[A-Za-z0-9_-]+/g, '[redacted]')
    .replace(/(?:authorization|cookie|password|access_token|refresh_token|apikey|api_key|service_role_key|secret|proofDataUrl)\s*[=:]\s*[^\s,;]+/gi, '[redacted]')
    .replace(/https?:\/\/[^\s"<>]+/gi, url => safeDiagnosticUrl(url))
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email omitted]')
    .slice(0, 300);
}
