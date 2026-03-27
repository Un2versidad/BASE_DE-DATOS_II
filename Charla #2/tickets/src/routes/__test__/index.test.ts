import request from "supertest";
import { app } from "../../app";
import { Ticket } from "../../models/ticket";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "test@test.me";
const adminCookie = () => global.signin(undefined, "admin", ADMIN_EMAIL);

const createTicket = () => {
  return request(app).post("/api/tickets").set("Cookie", adminCookie()).send({
    title: "asldkf",
    price: 20,
  });
};

it("can fetch a list of tickets", async () => {
  await createTicket();
  await createTicket();
  await createTicket();

  const response = await request(app).get("/api/tickets").send().expect(200);

  expect(response.body.length).toEqual(3);
});

it("returns paginated envelope on /api/v1/tickets", async () => {
  await createTicket();
  await createTicket();
  await createTicket();

  const response = await request(app)
    .get("/api/v1/tickets?page=1&limit=2&sort=-price")
    .send()
    .expect(200);

  expect(Array.isArray(response.body.data)).toEqual(true);
  expect(response.body.data.length).toEqual(2);
  expect(response.body.pagination.page).toEqual(1);
  expect(response.body.pagination.limit).toEqual(2);
  expect(response.body.pagination.total).toEqual(3);
  expect(response.body.links.self).toContain("/api/v1/tickets?page=1&limit=2");
});

it("keeps cinema titles visible even if a legacy orderId is present", async () => {
  const response = await createTicket();
  const ticket = await Ticket.findById(response.body.id);

  ticket!.set({ orderId: "legacy-order-lock" });
  await ticket!.save();

  const listResponse = await request(app).get("/api/tickets").send().expect(200);

  expect(listResponse.body.length).toEqual(1);
  expect(listResponse.body[0].id).toEqual(response.body.id);
});
