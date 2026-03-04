import axios from "axios";
import * as cheerio from "cheerio";
import { logger } from "../config/logger";
import { CollectorResult } from "../models/types";
import { BaseCollector } from "./baseCollector";

export class DarkwebCollector extends BaseCollector {
  constructor() {
    super("darkweb");
  }

  async collect(target: string): Promise<CollectorResult> {
    const darkWebMentions = await this.searchAhmia(target);

    return {
      collector: this.name,
      findings: [
        {
          type: "DARKWEB_MENTION",
          value: target,
          riskLevel: "INFO",
          metadata: darkWebMentions,
          source: `darkweb:mentions:${darkWebMentions.source}`
        }
      ],
      relationships: [],
      details: { darkWebMentions }
    };
  }

  private async searchAhmia(target: string) {
    try {
      const { data } = await axios.get("https://ahmia.fi/search/", { params: { q: target }, timeout: 15000 });
      const $ = cheerio.load(data);
      const mentions = $("a")
        .map((_, el) => $(el).attr("href"))
        .get()
        .filter((href) => typeof href === "string" && href.includes(".onion"))
        .slice(0, 20);

      return this.realResult("ahmia", { target, checked: true, mentions });
    } catch (error: any) {
      logger.warn(`darkweb/ahmia failed for ${target}: ${error.message}`);
      return this.mockResult("ahmia", { target, checked: false, mentions: [] }, "Darkweb search failed");
    }
  }
}
