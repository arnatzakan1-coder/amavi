// Next.js calls register() once per server instance on startup.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { bootstrap } = await import("./db/bootstrap");
  try {
    await bootstrap();
  } catch (e) {
    console.error("[amavi] database bootstrap failed:", e);
  }
}
