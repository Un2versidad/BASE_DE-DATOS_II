import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

declare global {
  var signin: (
    id?: string,
    role?: "user" | "moderator" | "admin",
    email?: string
  ) => string[];
}

jest.mock("../rabbit-wrapper");

process.env.STRIPE_KEY = "sk_test_hnfrAm8rOkryFEnV23jjfFlw";

let mongo: any;
beforeAll(async () => {
  process.env.JWT_KEY = "asdfasdf";
  process.env.ADMIN_EMAIL = "test@test.me";
  process.env.ENTRY_PASS_SECRET = "entry-pass-secret-for-tests";
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

  mongo = await MongoMemoryServer.create();
  const mongoUri = mongo.getUri();

  await mongoose.connect(mongoUri, {});
});

beforeEach(async () => {
  jest.clearAllMocks();
  if (mongoose.connection.db) {
    const collections = await mongoose.connection.db.collections();

    for (let collection of collections) {
      await collection.deleteMany({});
    }
  }
});

afterAll(async () => {
  if (mongo) {
    await mongo.stop();
  }
  await mongoose.connection.close();
});

global.signin = (
  id?: string,
  role: "user" | "moderator" | "admin" = "user",
  email = "test@test.com"
) => {
  // Build a JWT payload.  { id, email }
  const payload = {
    id: id || new mongoose.Types.ObjectId().toHexString(),
    email,
    role,
  };

  // Create the JWT!
  const token = jwt.sign(payload, process.env.JWT_KEY!);

  return [`token=${token}`];
};
