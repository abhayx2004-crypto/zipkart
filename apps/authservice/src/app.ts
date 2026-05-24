import express from "express";
import { httpLogger } from "@repo/logger";
import { authRouter } from "./modules/auth/auth.route";
import { userRouter } from "./modules/user/user.route";
import { sessionRouter } from "./modules/session/session.route";
import { errorHandler } from "./shared/http";

export const createApp = () => {
  const app = express();

  app.use(express.json({ limit: "1mb" }));
  app.use(httpLogger);

  app.get("/", (_req, res) => {
    res.json({ service: "authservice", status: "ok" });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/users", userRouter);
  app.use("/api/sessions", sessionRouter);
  app.use(errorHandler);

  return app;
};
