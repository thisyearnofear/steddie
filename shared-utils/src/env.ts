export function env(key: string, fallback?: string): string {
  if (typeof process !== "undefined" && process.env && process.env[key] !== undefined) return process.env[key]!;
  if (typeof window !== "undefined" && (window as any).env && (window as any).env[key] !== undefined)
    return (window as any).env[key];
  if (typeof import.meta !== "undefined" && (import.meta as any).env && (import.meta as any).env[key] !== undefined)
    return (import.meta as any).env[key];
  return fallback ?? "";
}