import request from "supertest";
import { app } from "../../app";

it("clears the cookie after signing out", async () => {
  await request(app)
    .post("/api/users/signup")
    .send({
      email: "test@test.com",
      password: "Password1",
    })
    .expect(201);

  await request(app)
    .post("/api/users/signin")
    .send({
      email: "test@test.com",
      password: "Password1",
    })
    .expect(200);

  const response = await request(app)
    .post("/api/users/signout")
    .send({})
    .expect(200);

  const cookie = response.get("Set-Cookie");
  if (!cookie) {
    throw new Error("Expected cookie but got undefined.");
  }

  expect(cookie[0]).toContain("token=");
  expect(cookie[0]).toContain("Path=/");
  expect(cookie[0]).toContain("Expires=Thu, 01 Jan 1970 00:00:00 GMT");
  expect(cookie[0]).toContain("HttpOnly");
  expect(cookie[0]).toContain("SameSite=Lax");
  expect(cookie.join(";")).toContain("refreshToken=");
});

it("supports v1 signout session endpoint", async () => {
  await request(app)
    .post("/api/v1/users")
    .send({
      email: "test-v1@test.com",
      password: "Password1",
    })
    .expect(201);

  await request(app)
    .post("/api/v1/auth/sessions")
    .send({
      email: "test-v1@test.com",
      password: "Password1",
    })
    .expect(200);

  await request(app).delete("/api/v1/auth/sessions/current").expect(200);
});
