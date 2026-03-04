import axios from "axios";
import { logger } from "../config/logger";
import { CollectorResult } from "../models/types";
import { BaseCollector } from "./baseCollector";

export class GeoCollector extends BaseCollector {
  constructor() {
    super("geo");
  }

  async collect(target: string): Promise<CollectorResult> {
    const findings = [];

    const geocode = await this.forwardGeocode(target);
    findings.push({
      type: "GEO_GEOCODE",
      value: target,
      riskLevel: "INFO",
      metadata: geocode,
      source: `geo:geocode:${geocode.source}`
    });

    const reverse = await this.reverseGeocode(geocode.data?.lat, geocode.data?.lon);
    findings.push({
      type: "GEO_REVERSE",
      value: `${geocode.data?.lat || ""},${geocode.data?.lon || ""}`,
      riskLevel: "INFO",
      metadata: reverse,
      source: `geo:reverse:${reverse.source}`
    });

    const nearby = await this.nearbyPlaces(geocode.data?.lat, geocode.data?.lon);
    findings.push({
      type: "GEO_NEARBY",
      value: target,
      riskLevel: "LOW",
      metadata: nearby,
      source: `geo:nearby:${nearby.source}`
    });

    return { collector: this.name, findings, relationships: [], details: { geocode, reverse, nearby } };
  }

  private async forwardGeocode(query: string) {
    try {
      const { data } = await axios.get("https://nominatim.openstreetmap.org/search", {
        params: { q: query, format: "json", limit: 1 },
        headers: { "user-agent": "ReconVault/1.0" },
        timeout: 10000
      });
      const first = Array.isArray(data) && data[0] ? data[0] : null;
      if (!first) throw new Error("No geocoding result");
      return this.realResult("nominatim", { lat: Number(first.lat), lon: Number(first.lon), displayName: first.display_name });
    } catch (error: any) {
      logger.warn(`geo/geocode failed for ${query}: ${error.message}`);
      return this.mockResult("nominatim", { lat: null, lon: null, displayName: "Unknown" }, "Geocoding failed");
    }
  }

  private async reverseGeocode(lat?: number, lon?: number) {
    if (typeof lat !== "number" || typeof lon !== "number") {
      return this.mockResult("nominatim", { address: null }, "Missing coordinates for reverse geocoding");
    }
    try {
      const { data } = await axios.get("https://nominatim.openstreetmap.org/reverse", {
        params: { lat, lon, format: "json" },
        headers: { "user-agent": "ReconVault/1.0" },
        timeout: 10000
      });
      return this.realResult("nominatim", data);
    } catch (error: any) {
      logger.warn(`geo/reverse failed for ${lat},${lon}: ${error.message}`);
      return this.mockResult("nominatim", { address: null }, "Reverse geocoding failed");
    }
  }

  private async nearbyPlaces(lat?: number, lon?: number) {
    if (typeof lat !== "number" || typeof lon !== "number") {
      return this.mockResult("overpass", { businesses: [] }, "Missing coordinates for nearby lookup");
    }
    const query = `
      [out:json][timeout:20];
      (
        node["shop"](around:1000,${lat},${lon});
        node["amenity"="restaurant"](around:1000,${lat},${lon});
      );
      out body 20;
    `;
    try {
      const { data } = await axios.post("https://overpass-api.de/api/interpreter", query, {
        headers: { "content-type": "text/plain" },
        timeout: 15000
      });
      return this.realResult("overpass", { businesses: data?.elements || [] });
    } catch (error: any) {
      logger.warn(`geo/overpass failed for ${lat},${lon}: ${error.message}`);
      return this.mockResult("overpass", { businesses: [] }, "Overpass API failed");
    }
  }
}
