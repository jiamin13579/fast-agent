const configuredApiBase = process.env.NEXT_PUBLIC_API_BASE;
const configuredWsBase = process.env.NEXT_PUBLIC_WS_BASE;

function defaultApiBase(): string {
  if (typeof window === "undefined") {
    return "http://localhost:8080/api";
  }
  return `${window.location.protocol}//${window.location.hostname}:8080/api`;
}

function defaultWsBase(): string {
  if (typeof window === "undefined") {
    return "ws://localhost:8081";
  }
  return `ws://${window.location.hostname}:8081`;
}

// Rule:
// 1) Use NEXT_PUBLIC_WS_BASE when configured.
// 2) Otherwise use current domain with backend SocketIO port 8081.
export const API_BASE = configuredApiBase || defaultApiBase();
export const WS_BASE = configuredWsBase || defaultWsBase();