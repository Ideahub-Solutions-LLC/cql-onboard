import { SignJWT, jwtVerify } from "jose";

export type GoogleSessionUser = {
  userId: string;
  email: string;
  displayName: string;
  fullName: string | null;
};

function signingKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || new TextEncoder().encode(secret).length < 32) {
    throw new Error("AUTH_SECRET must contain at least 32 characters.");
  }
  return new TextEncoder().encode(secret);
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

export async function signAuthToken(payload: Record<string, unknown>, expiresIn: string) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(signingKey());
}

export async function verifyAuthToken(token: string) {
  const { payload } = await jwtVerify(token, signingKey(), { algorithms: ["HS256"] });
  return payload;
}

export async function verifyGoogleSession(token: string): Promise<GoogleSessionUser | null> {
  try {
    const payload = await verifyAuthToken(token);
    if (
      payload.kind !== "session" ||
      typeof payload.sub !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.name !== "string"
    ) return null;
    return {
      userId: `google:${payload.sub}`,
      email: payload.email,
      displayName: payload.name,
      fullName: payload.name,
    };
  } catch {
    return null;
  }
}

export function sessionCookieName(secure: boolean) {
  return secure ? "__Host-cql-session" : "cql_session";
}

export function oauthCookieName(secure: boolean) {
  return secure ? "__Host-cql-oauth" : "cql_oauth";
}

export function cookieOptions(secure: boolean, maxAge: number) {
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
}

export function safeReturnPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  try {
    const url = new URL(value, "https://local.invalid");
    if (url.origin !== "https://local.invalid" || ["/callback", "/signin-with-chatgpt", "/signout-with-chatgpt"].includes(url.pathname)) return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}
