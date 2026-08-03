interface LocalAuthBypassEnvironment {
  isDevelopment: boolean;
  enabled: boolean;
  hostname: string;
}

const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

export function isLocalAuthBypassAllowed({
  isDevelopment,
  enabled,
  hostname,
}: LocalAuthBypassEnvironment): boolean {
  return isDevelopment && enabled && LOOPBACK_HOSTNAMES.has(hostname.toLowerCase());
}
