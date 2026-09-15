import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "./app";

describe("createApp", () => {
  it("responds to GET /health", async () => {
    const response = await request(createApp()).get("/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, data: { status: "ok" } });
  });

  it("returns a structured 404 for unknown routes", async () => {
    const response = await request(createApp()).get("/api/does-not-exist");
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });

  it("rejects login with malformed input before touching the database", async () => {
    const response = await request(createApp()).post("/api/auth/login").send({ email: "not-an-email" });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("BAD_REQUEST");
  });

  it("does not require auth for the public website contact form", async () => {
    const response = await request(createApp()).post("/public/website/contact").send({ name: "" });
    // Validation fails (empty name), but crucially never 401 — /public bypasses requireAuth.
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("BAD_REQUEST");
  });

  it("does not require auth for the Telegram webhook, but does require the secret token", async () => {
    const response = await request(createApp()).post("/public/webhooks/telegram").send({ update_id: 1 });
    expect(response.status).toBe(401);
  });

  describe.each([
    ["GET", "/api/users"],
    ["POST", "/api/users"],
    ["GET", "/api/roles"],
    ["POST", "/api/roles"],
    ["GET", "/api/departments"],
    ["POST", "/api/departments"],
    ["GET", "/api/permissions"],
    ["GET", "/api/leads"],
    ["POST", "/api/leads"],
    ["GET", "/api/lead-sources"],
    ["GET", "/api/integrations"],
    ["POST", "/api/integrations/telegram/connect"],
  ])("%s %s", (method, path) => {
    it("rejects unauthenticated requests with 401", async () => {
      const app = createApp();
      const response = await (method === "GET" ? request(app).get(path) : request(app).post(path));
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("UNAUTHORIZED");
    });
  });
});
