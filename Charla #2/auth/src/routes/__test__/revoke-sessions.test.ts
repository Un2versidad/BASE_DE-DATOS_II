import request from "supertest";
import { app } from "../../app";
import { User } from "../../models/user";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "fl2on@proton.me";

it("revokes all current user sessions", async () => {
  const cookie = await global.signin();

  const response = await request(app)
    .post("/api/v1/auth/sessions/revoke-all")
    .set("Cookie", cookie)
    .send({})
    .expect(200);

  const setCookie = response.get("Set-Cookie") || [];
  expect(setCookie.join(";")).toContain("refreshToken=");
  expect(setCookie.join(";")).toContain("token=");
});

it("returns 401 when trying to revoke sessions without authentication", async () => {
  await request(app).post("/api/v1/auth/sessions/revoke-all").send({}).expect(401);
});

it("allows admin to revoke sessions for another user", async () => {
  await request(app)
    .post("/api/users/signup")
    .send({
      email: ADMIN_EMAIL,
      password: "Password1",
    })
    .expect(201);

  const adminSignin = await request(app)
    .post("/api/users/signin")
    .send({
      email: ADMIN_EMAIL,
      password: "Password1",
    })
    .expect(200);

  const adminCookie = adminSignin.get("Set-Cookie") || [];

  await request(app)
    .post("/api/users/signup")
    .send({
      email: "target@test.com",
      password: "Password1",
    })
    .expect(201);

  const targetUser = await User.findOne({ email: "target@test.com" });
  expect(targetUser).toBeDefined();

  await request(app)
    .post(`/api/v1/auth/admin/users/${targetUser!.id}/sessions/revoke-all`)
    .set("Cookie", adminCookie)
    .send({ reason: "security incident" })
    .expect(200);
});

it("prevents non-admin users from revoking sessions for another user", async () => {
  const cookie = await global.signin();

  await request(app)
    .post("/api/v1/auth/admin/users/some-user-id/sessions/revoke-all")
    .set("Cookie", cookie)
    .send({ reason: "test" })
    .expect(403);
});
