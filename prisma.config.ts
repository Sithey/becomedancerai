import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Locally DATABASE_URL lives in .env.local; on Coolify it is already in the process env,
// which dotenv never overrides. It may be unset: `prisma generate` (Docker build) doesn't need it.
config({ path: ".env.local", quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
