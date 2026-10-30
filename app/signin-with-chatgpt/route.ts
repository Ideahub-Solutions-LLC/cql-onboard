import { createHash, randomBytes, randomUUID } from "node:crypto";
import { cookieOptions, oauthCookieName, safeReturnPath, signAuthToken } from "../auth-session";

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !secret || !process.env.AUTH_SECRET) {
    return Response.json({ error: "Google sign-in is not configured for this deployment." }, { status: 503 });
  }

  const requestUrl = new URL(request.url);
  const baseUrl = process.env.APP_BASE_URL ? new URL(process.env.APP_BASE_URL) : requestUrl;
  const secure = baseUrl.protocol === "https:";
  const returnTo = safeReturnPath(requestUrl.searchParams.get("return_to"));
  const state = randomUUID();
  const nonce = randomUUID();
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const stateToken = await signAuthToken({ kind: "oauth", state, nonce, verifier, returnTo }, "10m");

  const googleUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleUrl.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: new URL("/callback", baseUrl).toString(),
    response_type: "code",
    scope: "openid email profile",
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: "S256",
  }).toString();

  const response = Response.redirect(googleUrl, 302);
  response.headers.append("Set-Cookie", `${oauthCookieName(secure)}=${encodeURIComponent(stateToken)}; ${cookieOptions(secure, 600)}`);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
