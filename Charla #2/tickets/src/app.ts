import express from "express";
import "express-async-errors";
import { json } from "body-parser";
//import cookieSession from 'cookie-session';
import cookieParser from "cookie-parser";
import {
  errorHandler,
  NotFoundError,
  isAuthenticated,
} from "@eftickets/common";
import { createTicketRouter } from "./routes/new";
import { showTicketRouter } from "./routes/show";
import { indexTicketRouter } from "./routes/index";
import { updateTicketRouter } from "./routes/update";
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

app.use(isAuthenticated);
app.use(createTicketRouter);
app.use(showTicketRouter);
app.use(indexTicketRouter);
app.use(updateTicketRouter);

app.all("*", async (req, res) => {
  throw new NotFoundError();
});

app.use(errorHandler);

export { app };
