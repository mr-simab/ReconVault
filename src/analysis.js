export function analyze(data) {
  const critical = data.attributes.filter(
    a => a.source.toLowerCase() === "darkweb"
  );

  return {
    exposureCount: data.attributes.length,
    critical
  };
}
