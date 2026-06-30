import cors from "cors";
import express from "express";
import multer from "multer";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderAdminPage } from "./adminPage.js";
import { buildFaceMeasurement } from "./services/faceMeasurement.js";
import { buildFitAdvice } from "./services/fitAdvisor.js";
import { ProductStore } from "./services/productStore.js";
import { composeTryOnImage } from "./services/tryOnComposer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const uploadDir = path.join(rootDir, "uploads");
const publicDir = path.join(rootDir, "public");
const productStore = new ProductStore({
  dataPath: path.join(rootDir, "data", "products.json"),
  publicDir
});

const app = express();
const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 8 * 1024 * 1024
  }
});

app.use(cors());
app.use(express.json());
app.use("/static", express.static(publicDir));

app.get("/", (_req, res) => {
  res.type("html").send(`
    <!doctype html>
    <html lang="zh-CN">
      <head>
        <meta charset="utf-8" />
        <title>配镜网 API</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 32px; line-height: 1.7; color: #111827; }
          a { color: #175cd3; }
          code { background: #f2f4f7; padding: 2px 6px; border-radius: 4px; }
        </style>
      </head>
      <body>
        <h1>配镜网 API 正在运行</h1>
        <p>这个地址是后端服务，不是网页商城首页。小程序请用微信开发者工具打开 <code>miniprogram</code> 目录。</p>
        <p>可测试接口：</p>
        <ul>
          <li><a href="/admin">/admin 后台管理</a></li>
          <li><a href="/api/health">/api/health</a></li>
          <li><a href="/api/products">/api/products</a></li>
        </ul>
      </body>
    </html>
  `);
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "peijing-api" });
});

app.get("/admin", (_req, res) => {
  res.type("html").send(renderAdminPage());
});

app.get("/api/products", async (_req, res, next) => {
  try {
    const products = await productStore.list();
    res.json({ items: products });
  } catch (error) {
    next(error);
  }
});

app.get("/api/products/:id", async (req, res, next) => {
  try {
    const product = await productStore.findById(req.params.id);
    if (!product) {
      res.status(404).json({ message: "商品不存在" });
      return;
    }

    res.json({ item: product });
  } catch (error) {
    next(error);
  }
});

app.post(
  "/api/admin/products",
  upload.fields([
    { name: "cover", maxCount: 1 },
    { name: "model", maxCount: 1 }
  ]),
  async (req, res, next) => {
    try {
      const product = await productStore.create({
        fields: req.body,
        files: req.files || {}
      });

      res.status(201).json({ item: product });
    } catch (error) {
      next(error);
    }
  }
);

app.get("/api/admin/products", async (_req, res, next) => {
  try {
    const products = await productStore.list();
    res.json({ items: products });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/admin/products/:id", async (req, res, next) => {
  try {
    const product = await productStore.delete(req.params.id);
    res.json({ item: product });
  } catch (error) {
    next(error);
  }
});

app.post("/api/try-on", upload.single("photo"), async (req, res, next) => {
  try {
    const product = await productStore.findById(req.body.productId);
    if (!product) {
      res.status(404).json({ message: "商品不存在" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ message: "请上传正脸照片" });
      return;
    }

    const pupilDistanceMm = req.body.pupilDistanceMm ? Number(req.body.pupilDistanceMm) : null;
    const measurement = buildFaceMeasurement({
      faceWidthMm: req.body.faceWidthMm,
      pupilDistanceMm,
      measurementMode: req.body.measurementMode,
      faceWidthEdited: req.body.faceWidthEdited === "true"
    });

    const fit = buildFitAdvice({
      frameWidthMm: product.frameWidthMm,
      faceWidthMm: measurement.faceWidthMm,
      pupilDistanceMm
    });

    const headYawDeg = clampNumber(req.body.headYawDeg, -25, 25, 0);
    const renderMode = req.body.renderMode === "flat" ? "flat" : "3d";
    const image = await composeTryOnImage({
      sourcePath: req.file.path,
      product,
      outputDir: path.join(publicDir, "generated"),
      renderMode,
      headYawDeg
    });

    res.json({
      product,
      fit,
      imageUrl: `${req.protocol}://${req.get("host")}${image.publicPath}`,
      render: {
        mode: renderMode,
        headYawDeg
      },
      measurement,
      calibration: {
        faceWidthMm: measurement.faceWidthMm,
        pupilDistanceMm,
        mode: req.body.measurementMode || "manual-estimate"
      }
    });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(error.statusCode || 500).json({
    message: error.statusCode ? error.message : "服务器处理失败",
    detail: process.env.NODE_ENV === "production" ? undefined : error.message
  });
});

const port = Number(process.env.PORT || 32011);
app.listen(port, () => {
  console.log(`Peijing API listening on http://localhost:${port}`);
});

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, number));
}
