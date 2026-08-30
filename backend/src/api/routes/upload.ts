import { Router } from "express";
import multer from "multer";
import rateLimit from "express-rate-limit";

const router = Router();

// Uploads spend real Pinata quota under our own account and accept
// unauthenticated input from anyone on the internet — cap it hard.
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many uploads from this IP — try again later." },
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) return cb(new Error("Only image uploads are allowed"));
    cb(null, true);
  },
});

const PINATA_JWT = process.env.PINATA_JWT;

function requirePinata(): string {
  if (!PINATA_JWT) throw new Error("PINATA_JWT is not configured on the server");
  return PINATA_JWT;
}

// multer's fileFilter only sees the client-supplied Content-Type header,
// which is trivially spoofable — sniff the real file signature so an
// attacker can't pin arbitrary files under our Pinata account by relabeling
// them as images.
const IMAGE_SIGNATURES: { mime: string; check: (b: Buffer) => boolean }[] = [
  { mime: "image/png", check: (b) => b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mime: "image/jpeg", check: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/gif", check: (b) => b.length >= 6 && (b.subarray(0, 6).toString("ascii") === "GIF87a" || b.subarray(0, 6).toString("ascii") === "GIF89a") },
  { mime: "image/webp", check: (b) => b.length >= 12 && b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP" },
];

function sniffImageMime(buf: Buffer): string | null {
  return IMAGE_SIGNATURES.find((sig) => sig.check(buf))?.mime ?? null;
}

router.post("/image", uploadLimiter, upload.single("file"), async (req, res) => {
  try {
    const jwt = requirePinata();
    if (!req.file) return res.status(400).json({ error: "no file uploaded (expected multipart field 'file')" });

    const sniffedMime = sniffImageMime(req.file.buffer);
    if (!sniffedMime) return res.status(400).json({ error: "file content doesn't match a supported image format (png/jpeg/gif/webp)" });

    const form = new FormData();
    form.append("file", new Blob([req.file.buffer], { type: sniffedMime }), req.file.originalname);

    const pinataRes = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: { Authorization: `Bearer ${jwt}` },
      body: form,
    });
    if (!pinataRes.ok) {
      const text = await pinataRes.text();
      return res.status(502).json({ error: "pinata upload failed", detail: text });
    }
    const data = (await pinataRes.json()) as { IpfsHash: string };
    res.json({
      cid: data.IpfsHash,
      ipfsUri: `ipfs://${data.IpfsHash}`,
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`,
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.post("/metadata", uploadLimiter, async (req, res) => {
  try {
    const jwt = requirePinata();
    const { name, symbol, description, image } = req.body ?? {};
    if (!name || !symbol) return res.status(400).json({ error: "name and symbol are required" });

    const pinataRes = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
      method: "POST",
      headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        pinataContent: { name, symbol, description: description ?? "", image: image ?? "" },
        pinataMetadata: { name: `${symbol}-metadata` },
      }),
    });
    if (!pinataRes.ok) {
      const text = await pinataRes.text();
      return res.status(502).json({ error: "pinata upload failed", detail: text });
    }
    const data = (await pinataRes.json()) as { IpfsHash: string };
    res.json({
      cid: data.IpfsHash,
      ipfsUri: `ipfs://${data.IpfsHash}`,
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`,
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
