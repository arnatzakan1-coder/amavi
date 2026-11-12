// CLI wrapper: npm run db:seed (data and logic live in src/db/seed.ts)
import "dotenv/config";
import { runSeed } from "../src/db/seed";

runSeed()
  .then((n) => console.log("Seed complete:", n, "notes"))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
