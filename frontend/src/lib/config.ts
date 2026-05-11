const configuredApiBase = process.env.NEXT_PUBLIC_API_BASE;

function defaultApiBase(): string {
  if (typeof window === "undefined") {
    return "http://localhost:8080/api";
  }
  return `${window.location.protocol}//${window.location.hostname}:8080/api`;
}

// Rule:
// 1) Use NEXT_PUBLIC_API_BASE when configured.
// 2) Otherwise use current domain with backend port 8080.
export const API_BASE = configuredApiBase || defaultApiBase();
