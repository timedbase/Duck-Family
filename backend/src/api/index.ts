import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
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

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`duckfun.family api listening on :${port}`);
});
