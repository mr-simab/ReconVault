export function normalize(raw) {
  return {
    entity: raw.entity,
    name: raw.name,
    attributes: Object.entries(raw.findings).map(([source, data]) => ({
      source,
      data,
      confidence:
        source === "darkweb" ? "High" :
        source === "github" ? "Medium" :
        "Low"
    }))
  };
}
