import request from "supertest";
import { app } from "../../app";

const readRefreshCookie = (cookies: string[] = []) =>
  cookies.find((cookie) => cookie.startsWith("refreshToken="));

it("refreshes an authenticated session and rotates refresh token", async () => {
  await request(app)
    .post("/api/users/signup")
    .send({
      email: "refresh@test.com",
      password: "Password1",
    })
    .expect(201);

  const signinResponse = await request(app)
    .post("/api/users/signin")
    .send({
      email: "refresh@test.com",
      password: "Password1",
    })
    .expect(200);

  const signinCookies = signinResponse.get("Set-Cookie") || [];
  const firstRefreshCookie = readRefreshCookie(signinCookies);
  expect(firstRefreshCookie).toBeDefined();

  const refreshResponse = await request(app)
    .post("/api/v1/auth/refresh")
    .set("Cookie", signinCookies)
    .send({})
    .expect(200);

  const refreshCookies = refreshResponse.get("Set-Cookie") || [];
  const secondRefreshCookie = readRefreshCookie(refreshCookies);
  expect(secondRefreshCookie).toBeDefined();
  expect(secondRefreshCookie).not.toEqual(firstRefreshCookie);
});

it("returns 401 when refresh token cookie is missing", async () => {
  await request(app).post("/api/v1/auth/refresh").send({}).expect(401);
});

it("invalidates reused refresh tokens", async () => {
  await request(app)
    .post("/api/users/signup")
    .send({
      email: "reuse@test.com",
      password: "Password1",
    })
    .expect(201);

  const signinResponse = await request(app)
    .post("/api/users/signin")
    .send({
      email: "reuse@test.com",
      password: "Password1",
    })
    .expect(200);

  const signinCookies = signinResponse.get("Set-Cookie") || [];

  await request(app)
    .post("/api/v1/auth/refresh")
    .set("Cookie", signinCookies)
    .send({})
    .expect(200);

  await request(app)
    .post("/api/v1/auth/refresh")
    .set("Cookie", signinCookies)
    .send({})
    .expect(401);
});
