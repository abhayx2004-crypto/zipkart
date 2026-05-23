import { logger } from "@repo/logger";
import { config } from "./config/env.config";
import { createApp } from "./app";

const app = createApp();

const PORT = config.port || 3000;

app.listen(PORT, () => {
  logger.info(`AuthService started on port ${PORT}`);
}  );
