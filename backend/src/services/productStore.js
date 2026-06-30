import fs from "node:fs/promises";
import path from "node:path";
import { products as seedProducts } from "../data/products.js";
import { generateTryOnAssetFromCover } from "./tryOnAssetGenerator.js";

const demoModelUrl = "https://mmbizwxaminiprogram-1258344707.cos.ap-guangzhou.myqcloud.com/xr-frame/demo/glasses.glb";

export class ProductStore {
  constructor({ dataPath, publicDir }) {
    this.dataPath = dataPath;
    this.publicDir = publicDir;
  }

  async list() {
    const products = await this.readProducts();
    return products;
  }

  async findById(id) {
    const products = await this.readProducts();
    return products.find((product) => product.id === id) || null;
  }

  async create({ fields, files }) {
    const products = await this.readProducts();
    const id = slugify(fields.id || fields.name || `frame-${Date.now()}`);

    if (products.some((product) => product.id === id)) {
      const error = new Error("商品 ID 已存在");
      error.statusCode = 409;
      throw error;
    }

    const coverFile = firstFile(files.cover);
    if (!coverFile && !fields.coverUrl) {
      const error = new Error("请上传商品封面图或填写 coverUrl");
      error.statusCode = 400;
      throw error;
    }

    const modelFile = firstFile(files.model);
    const tryOnAssetFile = firstFile(files.tryOnAsset);
    const frontImageFile = firstFile(files.frontImage);
    const sideImageFile = firstFile(files.sideImage);
    const coverUrl = coverFile
      ? await this.movePublicFile(coverFile, "frames", id)
      : fields.coverUrl;
    const frontImageUrl = frontImageFile
      ? await this.movePublicFile(frontImageFile, "frames", `${id}-front`)
      : fields.frontImageUrl || coverUrl;
    const sideImageUrl = sideImageFile
      ? await this.movePublicFile(sideImageFile, "frames", `${id}-side`)
      : fields.sideImageUrl || null;
    const tryOnAssetUrl = tryOnAssetFile
      ? await this.movePublicFile(tryOnAssetFile, "tryon-assets", id)
      : fields.tryOnAssetUrl || (frontImageUrl
        ? await generateTryOnAssetFromCover({
          coverPath: path.join(this.publicDir, frontImageUrl.replace("/static/", "")),
          publicDir: this.publicDir,
          productId: id
        })
        : null);
    const modelUrl = modelFile
      ? await this.movePublicFile(modelFile, "models", id)
      : fields.modelUrl || demoModelUrl;

    const product = {
      id,
      name: requiredText(fields.name, "商品名称"),
      price: yuanToCents(fields.price),
      frameWidthMm: requiredNumber(fields.frameWidthMm, "镜架宽度"),
      lensWidthMm: optionalNumber(fields.lensWidthMm, 52),
      bridgeWidthMm: optionalNumber(fields.bridgeWidthMm, 18),
      templeLengthMm: optionalNumber(fields.templeLengthMm, 145),
      color: fields.color || "未设置",
      material: fields.material || "未设置",
      coverUrl,
      frontImageUrl,
      sideImageUrl,
      frameAsset: path.basename(coverUrl),
      tryOnAssetUrl,
      modelUrl,
      modelScale: fields.modelScale || "1 1 1",
      modelPosition: fields.modelPosition || "0 0 0",
      modelRotation: fields.modelRotation || "0 0 0",
      tags: parseTags(fields.tags)
    };

    products.push(product);
    await this.writeProducts(products);

    return product;
  }

  async delete(id) {
    const products = await this.readProducts();
    const product = products.find((item) => item.id === id);
    if (!product) {
      const error = new Error("商品不存在");
      error.statusCode = 404;
      throw error;
    }

    await this.writeProducts(products.filter((item) => item.id !== id));
    await this.removePublicFile(product.coverUrl);
    await this.removePublicFile(product.frontImageUrl);
    await this.removePublicFile(product.sideImageUrl);
    await this.removePublicFile(product.tryOnAssetUrl);
    await this.removePublicFile(product.modelUrl);

    return product;
  }

  async readProducts() {
    await fs.mkdir(path.dirname(this.dataPath), { recursive: true });

    try {
      const raw = await fs.readFile(this.dataPath, "utf8");
      return JSON.parse(raw);
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }

      await this.writeProducts(seedProducts);
      return [...seedProducts];
    }
  }

  async writeProducts(products) {
    await fs.mkdir(path.dirname(this.dataPath), { recursive: true });
    await fs.writeFile(this.dataPath, `${JSON.stringify(products, null, 2)}\n`, "utf8");
  }

  async movePublicFile(file, folder, productId) {
    const ext = safeExt(file.originalname);
    const fileName = `${productId}-${Date.now()}${ext}`;
    const dir = path.join(this.publicDir, folder);
    const outputPath = path.join(dir, fileName);

    await fs.mkdir(dir, { recursive: true });
    await fs.rename(file.path, outputPath);

    return `/static/${folder}/${fileName}`;
  }

  async removePublicFile(publicPath) {
    if (!publicPath || !publicPath.startsWith("/static/")) {
      return;
    }

    const relativePath = publicPath.replace("/static/", "");
    const filePath = path.resolve(this.publicDir, relativePath);
    if (!filePath.startsWith(this.publicDir)) {
      return;
    }

    await fs.rm(filePath, { force: true });
  }
}

function firstFile(value) {
  return Array.isArray(value) ? value[0] : value;
}

function requiredText(value, label) {
  const text = String(value || "").trim();
  if (!text) {
    const error = new Error(`请填写${label}`);
    error.statusCode = 400;
    throw error;
  }

  return text;
}

function requiredNumber(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    const error = new Error(`请填写正确的${label}`);
    error.statusCode = 400;
    throw error;
  }

  return number;
}

function optionalNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function yuanToCents(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    return 0;
  }

  return Math.round(number * 100);
}

function parseTags(value) {
  return String(value || "")
    .split(/[,，\s]+/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function slugify(value) {
  const slug = String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || `frame-${Date.now()}`;
}

function safeExt(fileName) {
  const ext = path.extname(fileName || "").toLowerCase();
  return ext || ".bin";
}
