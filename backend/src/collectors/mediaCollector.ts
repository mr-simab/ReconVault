import axios from "axios";
import FormData from "form-data";
// exifr does not ship strict TS exports in all environments.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const exifr = require("exifr");
import { env } from "../config/env";
import { logger } from "../config/logger";
import { CollectorResult } from "../models/types";
import { BaseCollector } from "./baseCollector";

export class MediaCollector extends BaseCollector {
  constructor() {
    super("media");
  }

  async collect(target: string): Promise<CollectorResult> {
    const exif = await this.extractExif(target);
    const text = await this.extractText(target);
    const face = await this.detectFaces(target);

    return {
      collector: this.name,
      findings: [
        { type: "MEDIA_EXIF", value: target, riskLevel: "INFO", metadata: exif, source: `media:exif:${exif.source}` },
        { type: "MEDIA_TEXT", value: target, riskLevel: "INFO", metadata: text, source: `media:text:${text.source}` },
        { type: "MEDIA_FACE", value: target, riskLevel: "INFO", metadata: face, source: `media:face:${face.source}` }
      ],
      relationships: [],
      details: { exif, text, face }
    };
  }

  private async extractExif(target: string) {
    try {
      const { data } = await axios.get(target, {
        responseType: "arraybuffer",
        timeout: 15000,
        headers: { "user-agent": "ReconVault/1.0 (+https://osintframework.com/)" }
      });
      const metadata = await exifr.parse(Buffer.from(data), true);
      if (!metadata) return this.realResult("exifr", { target, metadataExtracted: false, metadata: null });
      return this.realResult("exifr", { target, metadataExtracted: true, metadata });
    } catch (error: any) {
      logger.warn(`media/exif failed for ${target}: ${error.message}`);
      return this.mockResult("exifr", { target, metadataExtracted: false }, "EXIF extraction failed");
    }
  }

  private async extractText(target: string) {
    const form = new FormData();
    form.append("url", target);
    form.append("language", "eng");
    form.append("isOverlayRequired", "false");
    form.append("OCREngine", "2");
    form.append("apikey", env.ocrSpaceApiKey || "helloworld");

    try {
      const { data } = await axios.post("https://api.ocr.space/parse/image", form, {
        headers: form.getHeaders(),
        timeout: 20000
      });
      const parsed = Array.isArray(data?.ParsedResults) ? data.ParsedResults : [];
      const text = parsed.map((p: any) => p?.ParsedText || "").join("\n").trim();
      return this.realResult("ocr.space", { extracted: true, text, raw: data });
    } catch (error: any) {
      logger.warn(`media/ocr failed for ${target}: ${error.message}`);
      return this.mockResult("ocr.space", { extracted: false, text: "" }, "OCR API failed");
    }
  }

  private async detectFaces(target: string) {
    if (!env.faceppApiKey || !env.faceppApiSecret) {
      logger.warn("FACEPP_API_KEY/FACEPP_API_SECRET missing; face detection fallback enabled");
      return this.mockResult("face++", { detected: false, faceCount: 0 }, "Face++ credentials missing");
    }

    const form = new FormData();
    form.append("api_key", env.faceppApiKey);
    form.append("api_secret", env.faceppApiSecret);
    form.append("image_url", target);
    form.append("return_landmark", "0");

    try {
      const { data } = await axios.post("https://api-us.faceplusplus.com/facepp/v3/detect", form, {
        headers: form.getHeaders(),
        timeout: 15000
      });
      const faces = Array.isArray(data?.faces) ? data.faces : [];
      return this.realResult("face++", { detected: true, faceCount: faces.length, faces });
    } catch (error: any) {
      logger.warn(`media/face detection failed for ${target}: ${error.message}`);
      return this.mockResult("face++", { detected: false, faceCount: 0 }, "Face detection API failed");
    }
  }
}
