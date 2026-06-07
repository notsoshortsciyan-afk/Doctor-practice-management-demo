// Vercel serverless entry — wraps the same Express app used locally.
// Used only in production (Vercel). Local dev runs server/src/index.ts directly.
import "dotenv/config";
import serverless from "serverless-http";
import { createApp } from "../server/src/app";

export default serverless(createApp());
