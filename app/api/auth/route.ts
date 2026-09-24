import { NextResponse } from "next/server";

const cookieName = "tg_officer";

export async function POST(req: Request) {
  const { email, password } = await req.json();
  const configuredEmail = process.env.OFFICER_EMAIL || "admin@tribalgrant.local";
  const configuredPassword = process.env.OFFICER_PASSWORD || "Admin@123456";
  if (email !== configuredEmail || password !== configuredPassword) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
  const response = NextResponse.json({ ok: true, email });
  response.cookies.set(cookieName, "authenticated", {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/", maxAge: 60 * 60 * 8,
  });
  return response;
}

export async function GET(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  const authenticated = cookie.includes(`${cookieName}=authenticated`);
  const demoMode = process.env.DEMO_MODE === undefined ? process.env.NODE_ENV !== "production" : process.env.DEMO_MODE !== "false";
  if (authenticated) return NextResponse.json({ authenticated: true, demoMode });
  if (demoMode) {
    const response = NextResponse.json({ authenticated: true, demoMode });
    response.cookies.set(cookieName, "authenticated", {
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
      path: "/", maxAge: 60 * 60 * 8,
    });
    return response;
  }
  return NextResponse.json({ authenticated: false, demoMode });
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(cookieName, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
  return response;
}
