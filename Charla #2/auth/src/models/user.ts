import mongoose from "mongoose";
import { Password } from "../services/password";
import { UserDoc } from "../types/IUser";
import jwt from "jsonwebtoken";

// An interface that describes the properties
// that are requried to create a new User
interface UserAttrs {
  email: string;
  password: string;
}

// An interface that describes the properties
// that a User Model has
interface UserModel extends mongoose.Model<UserDoc> {
  build(attrs: UserAttrs): UserDoc;
}

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      required: true,
      enum: ["user", "moderator", "admin"],
      default: "user",
    },
  },
  {
    toJSON: {
      transform(_doc, ret) {
        const serialized = ret as Record<string, unknown>;
        serialized["id"] = serialized["_id"];
        delete serialized["_id"];
        delete serialized["password"];
        delete serialized["__v"];
      },
    },
  }
);

userSchema.pre("save", async function (done) {
  if (this.isModified("password")) {
    const hashed = await Password.toHash(this.get("password"));
    this.set("password", hashed);
  }
  done();
});

//return JWT token
userSchema.methods.getJwtToken = function (expiresInSeconds = 60 * 60) {
  return jwt.sign(
    {
      id: this.id,
      email: this.email,
      role: this.role || "user",
    },
    process.env.JWT_KEY!,
    {
      expiresIn: expiresInSeconds,
    }
  );
};

userSchema.statics.build = (attrs: UserAttrs) => {
  return new User(attrs);
};

const User = mongoose.model<UserDoc, UserModel>("User", userSchema);

export { User };
