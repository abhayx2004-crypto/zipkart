import express from "express";
import { logger } from "@repo/logger";

const app = express();

app.get("/", (req, res) => {
  res.send("Hello, World!");
}); 

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`AuthService is running on port ${PORT}`);
  logger.info(`AuthService started on port ${PORT}`);
}  );