import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "GIFFT AI — We build software that moves businesses forward.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0c0c0d",
          color: "#f0eee9",
          padding: 80,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 28 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ width: 12, height: 12, borderRadius: 12, background: "#f06c44" }} />
          </div>
          <span style={{ letterSpacing: -0.5 }}>
            GIFFT <span style={{ color: "#f06c44" }}>AI</span>
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 68, lineHeight: 1.05, letterSpacing: -2, maxWidth: 900 }}>
            We build software that moves{" "}
            <span style={{ color: "#f06c44" }}>businesses</span> forward.
          </div>
          <div style={{ fontSize: 26, color: "#8f8e87", maxWidth: 780 }}>
            25 years of service — web applications, SaaS platforms, AI systems
            and business software built for real-world scale.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
