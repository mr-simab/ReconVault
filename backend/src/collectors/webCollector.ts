import axios from "axios";
import * as cheerio from "cheerio";
import puppeteer from "puppeteer";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { CollectorResult } from "../models/types";
import { ensureUrl } from "../utils/target";
import { BaseCollector } from "./baseCollector";

export class WebCollector extends BaseCollector {
  constructor() {
    super("web");
  }

  async collect(target: string): Promise<CollectorResult> {
    const url = ensureUrl(target);
    const findings = [];
    const relationships = [];

    const scrape = await this.scrapeHtml(url);
    findings.push({
      type: "WEB_PAGE",
      value: url,
      riskLevel: "INFO",
      metadata: scrape,
      source: `web:scrape:${scrape.source}`
    });

    const dynamic = await this.scrapeDynamic(url);
    findings.push({
      type: "WEB_DYNAMIC",
      value: url,
      riskLevel: "INFO",
      metadata: dynamic,
      source: `web:dynamic:${dynamic.source}`
    });

    const subdomains = await this.lookupSubdomains(target);
    findings.push({
      type: "SUBDOMAINS",
      value: target,
      riskLevel: "LOW",
      metadata: subdomains,
      source: `web:subdomain:${subdomains.source}`
    });

    const technologies = await this.detectTechnology(target);
    findings.push({
      type: "TECH_STACK",
      value: target,
      riskLevel: "LOW",
      metadata: technologies,
      source: `web:tech:${technologies.source}`
    });

    if (Array.isArray(subdomains.data?.subdomains)) {
      for (const sub of subdomains.data.subdomains) {
        relationships.push({
          source: target,
          target: String(sub),
          relationshipType: "HAS_SUBDOMAIN",
          metadata: { source: "crt.sh" }
        });
      }
    }

    return { collector: this.name, findings, relationships, details: { scrape, dynamic, subdomains, technologies } };
  }

  private async scrapeHtml(url: string) {
    try {
      const { data } = await axios.get(url, { timeout: 12000 });
      const $ = cheerio.load(data);
      const title = $("title").text();
      const description = $('meta[name="description"]').attr("content");
      const links = $("a")
        .map((_, el) => $(el).attr("href"))
        .get()
        .filter(Boolean)
        .slice(0, 20);
      return this.realResult("axios+cheerio", { title, description, links });
    } catch (error: any) {
      logger.warn(`web/scrape failed for ${url}: ${error.message}`);
      return this.mockResult("axios+cheerio", { title: "Unknown", description: "", links: [] }, "Scraping failed");
    }
  }

  private async scrapeDynamic(url: string) {
    try {
      const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
      const data = await page.evaluate(() => ({
        title: document.title,
        textSample: (document.body?.innerText || "").slice(0, 400),
        scriptCount: document.scripts.length
      }));
      await browser.close();
      return this.realResult("puppeteer", data);
    } catch (error: any) {
      logger.warn(`web/dynamic failed for ${url}: ${error.message}`);
      return this.mockResult("puppeteer", { title: "Unknown", textSample: "", scriptCount: 0 }, "Dynamic scrape failed");
    }
  }

  private async lookupSubdomains(domain: string) {
    try {
      const { data } = await axios.get("https://crt.sh/", {
        params: { q: `%.${domain}`, output: "json" },
        timeout: 10000
      });
      const list = Array.isArray(data)
        ? Array.from(new Set(data.map((item: any) => item?.name_value).filter(Boolean))).slice(0, 100)
        : [];
      return this.realResult("crt.sh", { subdomains: list });
    } catch (error: any) {
      logger.warn(`web/subdomains failed for ${domain}: ${error.message}`);
      return this.mockResult("crt.sh", { subdomains: [] }, "Subdomain API failed");
    }
  }

  private async detectTechnology(domain: string) {
    if (env.builtWithApiKey) {
      try {
        const { data } = await axios.get("https://api.builtwith.com/v20/api.json", {
          params: { KEY: env.builtWithApiKey, LOOKUP: domain },
          timeout: 10000
        });
        return this.realResult("builtwith", data);
      } catch (error: any) {
        logger.warn(`web/builtwith failed for ${domain}: ${error.message}`);
      }
    }
    logger.warn("BUILTWITH_API_KEY is missing or failed; using lightweight header-based technology detection");
    try {
      const { headers } = await axios.get(ensureUrl(domain), { timeout: 10000 });
      const detected = {
        server: headers["server"] || "unknown",
        poweredBy: headers["x-powered-by"] || "unknown"
      };
      return this.realResult("http-headers", detected);
    } catch (error: any) {
      logger.warn(`web/header-tech failed for ${domain}: ${error.message}`);
      return this.mockResult("builtwith/http-headers", { server: "unknown", poweredBy: "unknown" }, "Tech detection failed");
    }
  }
}
