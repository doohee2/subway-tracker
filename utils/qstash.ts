import { Client, Receiver } from "@upstash/qstash";

export function getQstashClient() {
  const token = process.env.QSTASH_TOKEN;
  if (!token) {
    throw new Error("QSTASH_TOKEN is not configured.");
  }

  return new Client({ token });
}

export function getQstashReceiver() {
  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;

  if (!currentSigningKey || !nextSigningKey) {
    throw new Error("QStash signing keys are not configured.");
  }

  return new Receiver({
    currentSigningKey,
    nextSigningKey,
  });
}
