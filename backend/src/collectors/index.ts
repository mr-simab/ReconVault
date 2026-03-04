import { BaseCollector } from "./baseCollector";
import { DarkwebCollector } from "./darkwebCollector";
import { DomainCollector } from "./domainCollector";
import { EmailCollector } from "./emailCollector";
import { GeoCollector } from "./geoCollector";
import { IpCollector } from "./ipCollector";
import { MediaCollector } from "./mediaCollector";
import { SocialCollector } from "./socialCollector";
import { WebCollector } from "./webCollector";

export const collectorsRegistry: Record<string, BaseCollector> = {
  domain: new DomainCollector(),
  email: new EmailCollector(),
  ip: new IpCollector(),
  web: new WebCollector(),
  social: new SocialCollector(),
  geo: new GeoCollector(),
  media: new MediaCollector(),
  darkweb: new DarkwebCollector()
};

export const defaultCollectors = ["domain", "email", "ip", "web", "social", "geo"];
