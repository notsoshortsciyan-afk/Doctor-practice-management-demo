// Vercel serverless entry — wraps the same Express app used locally.
// Used only in production (Vercel). Local dev runs server/src/index.ts directly.
//
// Vercel invokes the default export as a Node (req, res) handler — the same
// signature http.createServer expects — and an Express app instance IS exactly
// such a handler, so we export it directly. (Do NOT wrap it in serverless-http:
// that targets AWS Lambda's (event, context) signature, which Vercel does not
// use; under Vercel it never writes to the real `res`, so every request hangs
// until the function times out.)
import "dotenv/config";
import { createApp } from "../server/src/app";

export default createApp();
