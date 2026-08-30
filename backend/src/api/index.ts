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
