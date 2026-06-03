import type { Request, Response } from "express";

export const getCurrentUserProfile = async (_req: Request, res: Response) => {
  res.json({ service: "userservice", profile: null });
};
