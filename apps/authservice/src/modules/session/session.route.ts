import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
import { asyncHandler } from "../../shared/http";
import { listSessions, revokeSession } from "./session.controller";

const sessionRouter = Router();

sessionRouter.get("/", requireAuth, asyncHandler(listSessions));
sessionRouter.delete("/:sessionId", requireAuth, asyncHandler(revokeSession));

export { sessionRouter };
