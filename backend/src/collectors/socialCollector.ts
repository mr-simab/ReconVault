import axios from "axios";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { CollectorResult } from "../models/types";
import { BaseCollector } from "./baseCollector";

export class SocialCollector extends BaseCollector {
  constructor() {
    super("social");
  }

  async collect(target: string): Promise<CollectorResult> {
    const findings = [];
    const relationships = [];

    const github = await this.lookupGithub(target);
    findings.push({
      type: "SOCIAL_GITHUB",
      value: target,
      riskLevel: github.data.exists ? "LOW" : "INFO",
      metadata: github,
      source: `social:github:${github.source}`
    });

    const reddit = await this.lookupReddit(target);
    findings.push({
      type: "SOCIAL_REDDIT",
      value: target,
      riskLevel: reddit.data.exists ? "LOW" : "INFO",
      metadata: reddit,
      source: `social:reddit:${reddit.source}`
    });

    const twitter = await this.lookupTwitter(target);
    findings.push({
      type: "SOCIAL_X",
      value: target,
      riskLevel: "INFO",
      metadata: twitter,
      source: `social:twitter:${twitter.source}`
    });

    if (github.data.exists) {
      relationships.push({
        source: target,
        target: github.data.url,
        relationshipType: "HAS_PROFILE",
        metadata: { platform: "github" }
      });
    }

    return { collector: this.name, findings, relationships, details: { github, reddit, twitter } };
  }

  private async lookupGithub(username: string) {
    try {
      const { data } = await axios.get(`https://api.github.com/users/${username}`, {
        headers: env.githubToken ? { Authorization: `Bearer ${env.githubToken}` } : undefined,
        timeout: 10000
      });
      return this.realResult("github", { exists: true, url: data?.html_url, followers: data?.followers || 0, repos: data?.public_repos || 0 });
    } catch {
      return this.realResult("github", { exists: false, url: null });
    }
  }

  private async lookupReddit(username: string) {
    try {
      const { data } = await axios.get(`https://www.reddit.com/user/${username}/about.json`, { timeout: 10000 });
      const profile = data?.data || {};
      return this.realResult("reddit", { exists: true, url: `https://www.reddit.com/user/${username}`, karma: profile.total_karma || 0 });
    } catch {
      return this.realResult("reddit", { exists: false, url: null });
    }
  }

  private async lookupTwitter(username: string) {
    try {
      const { data } = await axios.get("https://cdn.syndication.twimg.com/widgets/followbutton/info.json", {
        params: { screen_names: username },
        timeout: 10000
      });
      const profile = Array.isArray(data) ? data[0] : null;
      if (profile) {
        return this.realResult("twitter-public-profile", {
          exists: true,
          username: profile.screen_name || username,
          name: profile.name || null,
          followers: profile.followers_count ?? null
        });
      }
      return this.realResult("twitter-public-profile", { exists: false, username });
    } catch (error: any) {
      logger.warn(`social/twitter lookup failed for ${username}: ${error.message}`);
      return this.mockResult("twitter-public-profile", { exists: "unknown", username }, "Public Twitter lookup failed");
    }
  }
}
