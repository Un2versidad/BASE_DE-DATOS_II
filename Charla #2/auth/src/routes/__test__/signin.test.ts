import request from "supertest";
import { app } from "../../app";

it("fails when a email that does not exist is supplied", async () => {
  await request(app)
    .post("/api/users/signin")
    .send({
      email: "test@test.com",
      password: "Password1",
    })
    .expect(400);
});

it("fails when an incorrect password is supplied", async () => {
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
      password: "aslkdfjalskdfj",
    })
    .expect(400);
});

it("responds with a cookie when given valid credentials", async () => {
  await request(app)
    .post("/api/users/signup")
    .send({
      email: "test@test.com",
      password: "Password1",
    })
    .expect(201);

  const response = await request(app)
    .post("/api/users/signin")
    .send({
      email: "test@test.com",
      password: "Password1",
    })
    .expect(200);

  expect(response.get("Set-Cookie")).toBeDefined();
  const cookies = response.get("Set-Cookie") || [];
  expect(cookies.join(";")).toContain("refreshToken=");
});

it("supports v1 session endpoint", async () => {
  await request(app)
    .post("/api/v1/users")
    .send({
      email: "test2@test.com",
      password: "Password1",
    })
    .expect(201);

  const response = await request(app)
    .post("/api/v1/auth/sessions")
    .send({
      email: "test2@test.com",
      password: "Password1",
    })
    .expect(200);

  expect(response.get("Set-Cookie")).toBeDefined();
  const cookies = response.get("Set-Cookie") || [];
  expect(cookies.join(";")).toContain("refreshToken=");
});
