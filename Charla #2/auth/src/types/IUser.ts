import mongoose from "mongoose";

export type UserRole = "user" | "moderator" | "admin";
// An interface that describes the properties
// that a User Document has
export interface UserDoc extends mongoose.Document {
  email: string;
  password: string;
  role: UserRole;
  getJwtToken: (expiresInSeconds?: number) => string;
}

export type UserDocMethod = UserDoc;
