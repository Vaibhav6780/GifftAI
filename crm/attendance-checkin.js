// Checks in developer.gifftai@gmail.com right now (REMOTE), using the real current
// server time — mirrors what attendance.repository.ts's check-in path would write.
// Run inside the `api` container so Prisma's cuid()/timestamp generation matches the app.
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

const EMAIL = "developer.gifftai@gmail.com";

(async () => {
  const user = await p.user.findUnique({ where: { email: EMAIL } });
  if (!user) {
    console.error("FAILED: no user with email", EMAIL);
    process.exit(1);
  }
  console.log("User:", JSON.stringify({ id: user.id, email: user.email, status: user.status }));

  const openSession = await p.attendanceSession.findFirst({
    where: { userId: user.id, offlineAt: null },
  });
  if (openSession) {
    console.log("ALREADY CHECKED IN — open session exists, not inserting:", JSON.stringify(openSession, null, 2));
    return;
  }

 const row = await p.attendanceSession.create({
  data: {
    userId: user.id,
    location: "REMOTE",
    onlineAt: new Date("2026-09-12T04:54:00.000Z")
  }
});


  console.log("CHECKED IN:", JSON.stringify(row, null, 2));
})()
  .catch((e) => {
    console.error("FAILED:", e);
    process.exit(1);
  })
  .finally(() => p.$disconnect());
