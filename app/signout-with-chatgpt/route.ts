import { cookieOptions, sessionCookieName } from "../auth-session";

export async function GET(request: Request) {
  const secure = new URL(request.url).protocol === "https:";
  const response = Response.redirect(new URL("/", request.url), 302);
  response.headers.append("Set-Cookie", `${sessionCookieName(secure)}=; ${cookieOptions(secure, 0)}`);
  response.headers.append("Set-Cookie", `${sessionCookieName(!secure)}=; ${cookieOptions(!secure, 0)}`);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
