import express from "express";
import "express-async-errors";
import { json } from "body-parser";
import cookieParser from "cookie-parser";
import { errorHandler, NotFoundError } from "@eftickets/common";

import { currentUserRouter } from "./routes/current-user";
import { refreshSessionRouter } from "./routes/refresh-session";
import { revokeSessionsRouter } from "./routes/revoke-sessions";
import { signinRouter } from "./routes/signin";
import { signoutRouter } from "./routes/signout";
import { signupRouter } from "./routes/signup";
import { securityMiddleware } from "./middlewares/security";

const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(json({ limit: "20kb" }));
app.use(cookieParser());
app.use(securityMiddleware);
app.use((req, res, next) => {
  res.setHeader("X-API-Version", "v1");
  if (req.originalUrl.startsWith("/api/") && !req.originalUrl.startsWith("/api/v1/")) {
    res.setHeader("Deprecation", "true");
    res.setHeader("Link", '</api/v1>; rel="successor-version"');
  }

  next();
});

app.use(currentUserRouter);
app.use(refreshSessionRouter);
app.use(revokeSessionsRouter);
app.use(signinRouter);
app.use(signoutRouter);
app.use(signupRouter);

app.all("*", async (req, res) => {
  throw new NotFoundError();
});

app.use(errorHandler);

export { app };
