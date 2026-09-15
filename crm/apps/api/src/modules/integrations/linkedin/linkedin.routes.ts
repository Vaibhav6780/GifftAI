import { Router } from "express";
import { linkedinOAuth } from "./linkedin.oauth";

/** Public — mounted under /public/oauth/linkedin/callback in public.routes.ts. */
export const linkedinOAuthCallbackRouter = Router();
linkedinOAuthCallbackRouter.get("/", linkedinOAuth.callback);
