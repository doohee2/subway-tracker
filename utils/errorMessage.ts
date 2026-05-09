const SHOW_DETAILED_ERROR = process.env.NEXT_PUBLIC_SHOW_DETAILED_ALARM_ERROR === "true";

export interface ClientErrorInfo {
  code: string;
  technicalMessage: string;
}

export function extractClientErrorInfo(error: unknown, fallbackCode = "UNKNOWN_ERROR"): ClientErrorInfo {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code ?? fallbackCode)
      : fallbackCode;

  const technicalMessage =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message?: unknown }).message ?? "")
      : String(error ?? "");

  return { code, technicalMessage };
}

export function createClientError(code: string, message: string): Error & { code: string } {
  const error = new Error(message) as Error & { code: string };
  error.code = code;
  return error;
}

export function formatUserErrorMessage(userMessage: string, code: string, technicalMessage?: string): string {
  if (!SHOW_DETAILED_ERROR) {
    return userMessage;
  }

  const details = [`에러 코드: ${code}`];
  if (technicalMessage) {
    details.push(`원인: ${technicalMessage}`);
  }

  return `${userMessage}\n\n[${details.join(" | ")}]`;
}
