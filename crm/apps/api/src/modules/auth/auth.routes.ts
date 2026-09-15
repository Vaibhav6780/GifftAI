import { Router } from "express";
import { forgotPasswordSchema, loginSchema, resetPasswordSchema } from "@gifftai/shared";
import { authController } from "./auth.controller";
import { validate } from "../../middleware/validate.middleware";
import { authLimiter } from "../../middleware/rateLimit.middleware";
import { requireAuth } from "../../middleware/auth.middleware";

export const authRouter = Router();

authRouter.post("/login", authLimiter, validate(loginSchema), authController.login);
authRouter.post("/refresh", authController.refresh);
authRouter.post("/logout", authController.logout);
authRouter.post(
  "/forgot-password",
  authLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword,
);
authRouter.post("/reset-password", validate(resetPasswordSchema), authController.resetPassword);
authRouter.get("/me", requireAuth, authController.me);
