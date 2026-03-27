import mongoose from "mongoose";

import { app } from "./app";
import { canUseLocalHCaptchaTestKey } from "./services/hcaptcha";

type RequiredEnv<TKeys extends readonly string[]> = {
  [K in TKeys[number]]: string;
};

const requireEnvVars = <TKeys extends readonly string[]>(
  keys: TKeys
): RequiredEnv<TKeys> => {
  const env = {} as RequiredEnv<TKeys>;

  for (const key of keys) {
    const value = process.env[key];
    if (!value) {
      throw new Error(`${key} must be defined!`);
    }

    (env as Record<string, string>)[key] = value;
  }

  return env;
};

const start = async () => {
  try {
    console.log("starting......");
    const env = requireEnvVars(["JWT_KEY", "MONGO_URI", "ADMIN_EMAIL"] as const);
    if (
      process.env.HCAPTCHA_REQUIRED === "true" &&
      !process.env.HCAPTCHA_SECRET_KEY &&
      !canUseLocalHCaptchaTestKey()
    ) {
      throw new Error(
        "HCAPTCHA_SECRET_KEY must be defined when HCAPTCHA_REQUIRED=true"
      );
    }
    if (
      process.env.ACCESS_TOKEN_TTL_SECONDS &&
      Number(process.env.ACCESS_TOKEN_TTL_SECONDS) <= 0
    ) {
      throw new Error("ACCESS_TOKEN_TTL_SECONDS must be a positive number");
    }
    if (
      process.env.REFRESH_TOKEN_TTL_DAYS &&
      Number(process.env.REFRESH_TOKEN_TTL_DAYS) <= 0
    ) {
      throw new Error("REFRESH_TOKEN_TTL_DAYS must be a positive number");
    }

    await mongoose.connect(env.MONGO_URI);
    console.log("Connected to MongoDb!");

    app.listen(3000, () => {
      console.log("Listening on port 3000!!!");
    });
  } catch (error) {
    console.error("[auth] Failed to start service", error);
    process.exit(1);
  }
};

void start();
