import { createRedisClient } from "@repo/redis";
import { config } from "../config/env.config";

export const redis = createRedisClient(config.redisUrl);
