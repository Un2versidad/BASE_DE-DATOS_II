import request from "supertest";
import { app } from "../../app";
import mongoose from "mongoose";
import { Ticket } from "../../models/ticket";
import { rabbitWrapper } from "../../rabbit-wrapper";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "fl2on@proton.me";
const adminCookie = () => global.signin(undefined, "admin", ADMIN_EMAIL);

it("returns a 404 if the provided id does not exist", async () => {
  const id = new mongoose.Types.ObjectId().toHexString();
  await request(app)
    .put(`/api/tickets/${id}`)
    .set("Cookie", global.signin())
    .send({
      title: "aslkdfj",
      price: 20,
    })
    .expect(404);
});

it("returns a 401 if the user is not authenticated", async () => {
  const id = new mongoose.Types.ObjectId().toHexString();
  await request(app)
    .put(`/api/tickets/${id}`)
    .send({
      title: "aslkdfj",
      price: 20,
    })
    .expect(401);
});

it("returns a 401 if the user does not own the ticket", async () => {
  const response = await request(app)
    .post("/api/tickets")
    .set("Cookie", adminCookie())
    .send({
      title: "asldkfj",
      price: 20,
    });

  await request(app)
    .put(`/api/tickets/${response.body.id}`)
    .set("Cookie", global.signin())
    .send({
      title: "alskdjflskjdf",
      price: 1000,
    })
    .expect(401);
});

it("allows admin to update a ticket they do not own", async () => {
  const ownerId = new mongoose.Types.ObjectId().toHexString();
  const ticket = Ticket.build({
    title: "asldkfj",
    price: 20,
    userId: ownerId,
  });
  await ticket.save();

  await request(app)
    .put(`/api/tickets/${ticket.id}`)
    .set("Cookie", adminCookie())
    .send({
      title: "admin-updated-title",
      price: 99,
    })
    .expect(200);
});

it("returns a 400 if the user provides an invalid title or price", async () => {
  const cookie = adminCookie();

  const response = await request(app)
    .post("/api/tickets")
    .set("Cookie", cookie)
    .send({
      title: "asldkfj",
      price: 20,
    });

  await request(app)
    .put(`/api/tickets/${response.body.id}`)
    .set("Cookie", cookie)
    .send({
      title: "",
      price: 20,
    })
    .expect(400);

  await request(app)
    .put(`/api/tickets/${response.body.id}`)
    .set("Cookie", cookie)
    .send({
      title: "alskdfjj",
      price: -10,
    })
    .expect(400);
});

it("updates the ticket provided valid inputs", async () => {
  const cookie = adminCookie();

  const response = await request(app)
    .post("/api/tickets")
    .set("Cookie", cookie)
    .send({
      title: "asldkfj",
      price: 20,
    });

  await request(app)
    .put(`/api/tickets/${response.body.id}`)
    .set("Cookie", cookie)
    .send({
      title: "new title",
      price: 100,
    })
    .expect(200);

  const ticketResponse = await request(app)
    .get(`/api/tickets/${response.body.id}`)
    .send();

  expect(ticketResponse.body.title).toEqual("new title");
  expect(ticketResponse.body.price).toEqual(100);
});

it("publishes an event", async () => {
  const cookie = adminCookie();

  const response = await request(app)
    .post("/api/tickets")
    .set("Cookie", cookie)
    .send({
      title: "asldkfj",
      price: 20,
    });

  await request(app)
    .put(`/api/tickets/${response.body.id}`)
    .set("Cookie", cookie)
    .send({
      title: "new title",
      price: 100,
    })
    .expect(200);

  expect(rabbitWrapper.client.publish).toHaveBeenCalled();
});

it("allows updating legacy tickets even if they still carry an orderId flag", async () => {
  const cookie = adminCookie();

  const response = await request(app)
    .post("/api/tickets")
    .set("Cookie", cookie)
    .send({
      title: "asldkfj",
      price: 20,
    });

  const ticket = await Ticket.findById(response.body.id);
  ticket!.set({ orderId: new mongoose.Types.ObjectId().toHexString() });
  await ticket!.save();

  await request(app)
    .put(`/api/tickets/${response.body.id}`)
    .set("Cookie", cookie)
    .send({
      title: "new title",
      price: 100,
    })
    .expect(200);
});
