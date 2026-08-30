import "dotenv/config";
import express, { type ErrorRequestHandler } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import multer from "multer";
import tokensRouter from "./routes/tokens.js";
import campaignsRouter from "./routes/campaigns.js";
import portfolioRouter from "./routes/portfolio.js";
import platformRouter from "./routes/platform.js";
import uploadRouter from "./routes/upload.js";

const app = express();
// Render puts one reverse proxy in front of this service, which sets
// X-Forwarded-For -- without this, express-rate-limit refuses to trust that
// header (correctly, as a default anti-spoofing guard) and throws on every
// request instead of rate-limiting by real client IP. Trusting exactly one
// hop matches Render's actual topology.
app.set("trust proxy", 1);
app.use(cors());
app.use(express.json());
app.use(rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
}));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/tokens", tokensRouter);
app.use("/campaigns", campaignsRouter);
app.use("/portfolio", portfolioRouter);
app.use("/upload", uploadRouter);
app.use("/", platformRouter);

// Every route handler's own try/catch returns a uniform { error } JSON body
// -- but multer's fileFilter/size-limit rejection and express.json()'s
// malformed-body parsing both throw/next(err) from middleware that runs
// BEFORE any route handler, bypassing those try/catches entirely. Without
// this, both fall through to Express's default HTML error page with the
// wrong status code, which a frontend expecting { error } either can't
// parse or mishandles.
const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    return res.status(status).json({ error: err.message });
  }
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({ error: "malformed request body" });
  }
  res.status(err?.status ?? 500).json({ error: err instanceof Error ? err.message : "internal error" });
};
app.use(errorHandler);

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`duckfun.family api listening on :${port}`);
});
