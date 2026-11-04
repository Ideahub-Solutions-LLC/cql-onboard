import { headers } from "next/headers";
import { env } from "cloudflare:workers";
import { cookieValue, guestCookieName, verifyGuestSession } from "./auth-session";

export type ChatGPTUser = import("./auth-session").OnboardingUser;

const USER_ID_HEADER = "oai-authenticated-user-id";
const USER_EMAIL_HEADER = "oai-authenticated-user-email";
const USER_FULL_NAME_HEADER = "oai-authenticated-user-full-name";
const USER_FULL_NAME_ENCODING_HEADER =
  "oai-authenticated-user-full-name-encoding";
const PERCENT_ENCODED_UTF8 = "percent-encoded-utf-8";
export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  const requestHeaders = await headers();
  // Sites supplies these trusted headers in its hosted runtime and local preview.
  // Only the Sites runtime can supply trusted identity headers. Other runtimes use signed guest sessions.
  if (process.env.VERCEL !== "1" && process.env.VERCEL !== "true") {
    const userId = requestHeaders.get(USER_ID_HEADER);
    const email = requestHeaders.get(USER_EMAIL_HEADER);
    if (userId && email) {
      const encodedFullName = requestHeaders.get(USER_FULL_NAME_HEADER);
      const fullName =
        encodedFullName &&
        requestHeaders.get(USER_FULL_NAME_ENCODING_HEADER) === PERCENT_ENCODED_UTF8
          ? safeDecodeURIComponent(encodedFullName)
          : null;
      return { userId, displayName: fullName ?? email, email, fullName };
    }
  }

  const secure = process.env.VERCEL === "1" || process.env.VERCEL === "true" || requestHeaders.get("x-forwarded-proto") === "https";
  const cookieHeader = requestHeaders.get("cookie");
  const token = cookieValue(cookieHeader, guestCookieName(secure)) ?? cookieValue(cookieHeader, guestCookieName(!secure));
  return token ? verifyGuestSession(token, (env as any).VAULT_KEY || "") : null;
}

function safeDecodeURIComponent(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}
