import express from "express";
import "express-async-errors";
import { json } from "body-parser";
import cookieParser from "cookie-parser";
import {
  errorHandler,
  isAuthenticated,
  NotFoundError,
} from "@eftickets/common";
import { deleteOrderRouter } from "./routes/delete";
import { indexOrderRouter } from "./routes/index";
import { newOrderRouter } from "./routes/new";
import { showOrderRouter } from "./routes/show";
import { availabilityOrderRouter } from "./routes/availability";
import { updateOrderConcessionsRouter } from "./routes/update-concessions";
import { adminOverviewRouter } from "./routes/admin-overview";
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
app.use(adminOverviewRouter);
app.use(deleteOrderRouter);
app.use(indexOrderRouter);
app.use(newOrderRouter);
app.use(showOrderRouter);
app.use(availabilityOrderRouter);
app.use(updateOrderConcessionsRouter);

app.all("*", async (req, res) => {
  throw new NotFoundError();
});

app.use(errorHandler);

export { app };
