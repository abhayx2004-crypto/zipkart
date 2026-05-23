import pinoHttp from "pino-http";

export const httpLogger = pinoHttp({
  transport:
    process.env.NODE_ENV !== "production"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
          },
        }
      : undefined,
});