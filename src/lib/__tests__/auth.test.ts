// @vitest-environment node
import { describe, test, expect, vi, beforeEach } from "vitest";
import { SignJWT } from "jose";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

const mockCookieStore = {
  set: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

const { createSession, getSession, deleteSession, verifySession } =
  await import("../auth");

const SECRET = new TextEncoder().encode("development-secret-key");

async function makeToken(payload: object, expiresIn = "7d") {
  return new SignJWT(payload as any)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresIn)
    .sign(SECRET);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createSession", () => {
  test("sets auth-token cookie with correct options", async () => {
    await createSession("user-123", "test@example.com");

    expect(mockCookieStore.set).toHaveBeenCalledWith(
      "auth-token",
      expect.any(String),
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      })
    );
  });

  test("JWT payload contains userId and email", async () => {
    await createSession("user-123", "test@example.com");

    const token = mockCookieStore.set.mock.calls[0][1];
    const { jwtVerify } = await import("jose");
    const { payload } = await jwtVerify(token, SECRET);

    expect(payload.userId).toBe("user-123");
    expect(payload.email).toBe("test@example.com");
  });

  test("cookie is not secure in non-production", async () => {
    await createSession("user-123", "test@example.com");

    const { secure } = mockCookieStore.set.mock.calls[0][2];
    expect(secure).toBe(false);
  });

  test("cookie expires in ~7 days", async () => {
    await createSession("user-123", "test@example.com");

    const { expires } = mockCookieStore.set.mock.calls[0][2];
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    expect(expires.getTime()).toBeGreaterThan(Date.now() + sevenDaysMs - 5000);
    expect(expires.getTime()).toBeLessThan(Date.now() + sevenDaysMs + 5000);
  });
});

describe("getSession", () => {
  test("reads from the auth-token cookie", async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    await getSession();
    expect(mockCookieStore.get).toHaveBeenCalledWith("auth-token");
  });

  test("returns null when no cookie", async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    expect(await getSession()).toBeNull();
  });

  test("returns session payload for valid token", async () => {
    const token = await makeToken({
      userId: "user-123",
      email: "test@example.com",
      expiresAt: new Date(),
    });
    mockCookieStore.get.mockReturnValue({ value: token });

    const session = await getSession();
    expect(session?.userId).toBe("user-123");
    expect(session?.email).toBe("test@example.com");
  });

  test("returns null for invalid token", async () => {
    mockCookieStore.get.mockReturnValue({ value: "invalid.token.here" });
    expect(await getSession()).toBeNull();
  });

  test("returns null for expired token", async () => {
    const token = await makeToken(
      { userId: "user-123", email: "test@example.com", expiresAt: new Date() },
      "-1s"
    );
    mockCookieStore.get.mockReturnValue({ value: token });
    expect(await getSession()).toBeNull();
  });
});

describe("deleteSession", () => {
  test("deletes the auth-token cookie", async () => {
    await deleteSession();
    expect(mockCookieStore.delete).toHaveBeenCalledWith("auth-token");
  });
});

describe("verifySession", () => {
  test("returns null when no cookie in request", async () => {
    const request = new NextRequest("http://localhost/");
    expect(await verifySession(request)).toBeNull();
  });

  test("returns session payload for valid token in request", async () => {
    const token = await makeToken({
      userId: "user-123",
      email: "test@example.com",
      expiresAt: new Date(),
    });
    const request = new NextRequest("http://localhost/", {
      headers: { Cookie: `auth-token=${token}` },
    });

    const session = await verifySession(request);
    expect(session?.userId).toBe("user-123");
    expect(session?.email).toBe("test@example.com");
  });

  test("returns null for invalid token in request", async () => {
    const request = new NextRequest("http://localhost/", {
      headers: { Cookie: "auth-token=invalid.token.here" },
    });
    expect(await verifySession(request)).toBeNull();
  });

  test("returns null for expired token in request", async () => {
    const token = await makeToken(
      { userId: "user-123", email: "test@example.com", expiresAt: new Date() },
      "-1s"
    );
    const request = new NextRequest("http://localhost/", {
      headers: { Cookie: `auth-token=${token}` },
    });
    expect(await verifySession(request)).toBeNull();
  });
});
