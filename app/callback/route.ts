import { createRemoteJWKSet, jwtVerify } from "jose";
import {
  cookieOptions,
  cookieValue,
  oauthCookieName,
  safeReturnPath,
  sessionCookieName,
  signAuthToken,
  verifyAuthToken,
} from "../auth-session";

const googleKeys = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const baseUrl = process.env.APP_BASE_URL ? new URL(process.env.APP_BASE_URL) : requestUrl;
  const secure = baseUrl.protocol === "https:";
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const responseFor = (destination: string, status = 302) => {
    const response = Response.redirect(new URL(destination, baseUrl), status);
    response.headers.append("Set-Cookie", `${oauthCookieName(secure)}=; ${cookieOptions(secure, 0)}`);
    response.headers.set("Cache-Control", "no-store");
    return response;
  };

  if (!clientId || !clientSecret || !process.env.AUTH_SECRET) {
    return Response.json({ error: "Google sign-in is not configured for this deployment." }, { status: 503 });
  }
  if (requestUrl.searchParams.has("error")) return responseFor("/signin-with-chatgpt?error=access_denied");

  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const stateToken = cookieValue(request.headers.get("cookie"), oauthCookieName(secure));
  if (!code || !state || !stateToken) return responseFor("/signin-with-chatgpt?error=invalid_state");

  try {
    const statePayload = await verifyAuthToken(stateToken);
    if (statePayload.kind !== "oauth" || statePayload.state !== state || typeof statePayload.verifier !== "string") {
      return responseFor("/signin-with-chatgpt?error=invalid_state");
    }

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: new URL("/callback", baseUrl).toString(),
        grant_type: "authorization_code",
        code_verifier: statePayload.verifier,
      }),
    });
    if (!tokenResponse.ok) return responseFor("/signin-with-chatgpt?error=token_exchange");
    const tokens = await tokenResponse.json() as { id_token?: string };
    if (!tokens.id_token) return responseFor("/signin-with-chatgpt?error=missing_identity");

    const { payload } = await jwtVerify(tokens.id_token, googleKeys, {
      algorithms: ["RS256"],
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: clientId,
    });
    if (
      typeof payload.sub !== "string" ||
      typeof payload.email !== "string" ||
      (payload.email_verified !== true && payload.email_verified !== "true") ||
      payload.nonce !== statePayload.nonce
    ) return responseFor("/signin-with-chatgpt?error=invalid_identity");

    const email = payload.email.trim().toLowerCase();
    const name = typeof payload.name === "string" && payload.name.trim() ? payload.name.trim() : email;
    const session = await signAuthToken({
      kind: "session",
      sub: payload.sub,
      email,
      name,
    }, "7d");
    const response = responseFor(safeReturnPath(typeof statePayload.returnTo === "string" ? statePayload.returnTo : "/"));
    response.headers.append("Set-Cookie", `${sessionCookieName(secure)}=${encodeURIComponent(session)}; ${cookieOptions(secure, 604800)}`);
    return response;
  } catch {
    return responseFor("/signin-with-chatgpt?error=invalid_identity");
  }
}
