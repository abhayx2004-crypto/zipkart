import { logger } from "@repo/logger";
import { config } from "./config/env.config";
import { createApp } from "./app";

const PORT = config.port || 3001;

const bootstrap = async () => {
  const app = await createApp();

  app.listen(PORT, () => {
    logger.info(`UserService started on port ${PORT}`);
  });
};

bootstrap().catch((error) => {
  logger.error({ error }, "Failed to bootstrap userservice");
  process.exit(1);
});
