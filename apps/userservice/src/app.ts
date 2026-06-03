import express from "express";
import { httpLogger } from "@repo/logger";
import swaggerUi from "swagger-ui-express";
import { config } from "./config/env.config";
import { addressRouter, userAddressRouter } from "./modules/addresses/address.route";
import { roleRouter, userRoleRouter } from "./modules/roles/role.route";
import { sessionRouter, userSessionRouter } from "./modules/sessions/session.route";
import { userRouter } from "./modules/user/user.route";
import { loadOpenApiSpec } from "./openapi/swagger";
import { errorHandler } from "./shared/http";

export const createApp = async () => {
  const app = express();
  const openApiSpec = await loadOpenApiSpec();

  app.use(express.json({ limit: "1mb" }));
  app.use(httpLogger);
  app.use((req, res, next) => {
    if (req.path === "/docs" || req.path.startsWith("/docs/")) {
      next();
      return;
    }

    if (
      config.gatewaySharedSecret &&
      req.get("x-gateway-secret") !== config.gatewaySharedSecret
    ) {
      res.status(403).json({ error: "Requests must be routed through gateway" });
      return;
    }

    next();
  });

  app.get("/", (_req, res) => {
    res.json({ service: "userservice", status: "ok" });
  });
  app.get("/docs/openapi.json", (_req, res) => {
    res.json(openApiSpec);
  });
  app.use(
    "/docs",
    swaggerUi.serve,
    swaggerUi.setup(openApiSpec, {
      explorer: true,
      swaggerOptions: {
        url: "/docs/openapi.json",
      },
    }),
  );

  app.use("/users", userRouter);
  app.use("/users/:userId/addresses", userAddressRouter);
  app.use("/users/:userId/sessions", userSessionRouter);
  app.use("/users/:userId/roles", userRoleRouter);
  app.use("/addresses", addressRouter);
  app.use("/sessions", sessionRouter);
  app.use("/roles", roleRouter);
  app.use(errorHandler);

  return app;
};
