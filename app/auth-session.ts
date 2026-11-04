import { SignJWT, jwtVerify } from "jose";

export type OnboardingUser = {
  userId: string;
  email: string;
  displayName: string;
  fullName: string | null;
  isAnonymous?: boolean;
};

const encoder = new TextEncoder();
const guestCookie = (secure: boolean) => secure ? "__Host-cql-guest" : "cql_guest";

async function guestSigningKey(encodedVaultKey: string): Promise<CryptoKey | null> {
  try {
    const raw = Uint8Array.from(atob(encodedVaultKey), (character) => character.charCodeAt(0));
    if (raw.byteLength !== 32) return null;
    const material = await crypto.subtle.importKey("raw", raw, "HKDF", false, ["deriveKey"]);
    return await crypto.subtle.deriveKey(
      { name: "HKDF", hash: "SHA-256", salt: encoder.encode("cql-onboarding-v1"), info: encoder.encode("guest-session-signing") },
      material,
      { name: "HMAC", hash: "SHA-256", length: 256 },
      false,
      ["sign", "verify"],
    );
  } catch {
    return null;
  }
}

export function cookieValue(cookieHeader: string | null, name: string) {
  const prefix = `${name}=`;
  const item = cookieHeader?.split(";").map((part) => part.trim()).find((part) => part.startsWith(prefix));
  if (!item) return null;
  try {
    return decodeURIComponent(item.slice(prefix.length));
  } catch {
    return null;
  }
}

export async function createGuestSession(encodedVaultKey: string, secure: boolean) {
  const key = await guestSigningKey(encodedVaultKey);
  if (!key) return null;
  const id = crypto.randomUUID();
  const token = await new SignJWT({ kind: "guest" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(id)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(key);
  const name = guestCookie(secure);
  const cookie = `${name}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=2592000${secure ? "; Secure" : ""}`;
  return {
    cookie,
    user: { userId: `guest:${id}`, email: "", displayName: "Client", fullName: null, isAnonymous: true } satisfies OnboardingUser,
  };
}

export async function verifyGuestSession(token: string, encodedVaultKey: string): Promise<OnboardingUser | null> {
  const key = await guestSigningKey(encodedVaultKey);
  if (!key) return null;
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    if (payload.kind !== "guest" || typeof payload.sub !== "string") return null;
    return {
      userId: `guest:${payload.sub}`,
      email: "",
      displayName: "Client",
      fullName: null,
      isAnonymous: true,
    };
  } catch {
    return null;
  }
}

export function guestCookieName(secure: boolean) { return guestCookie(secure); }
