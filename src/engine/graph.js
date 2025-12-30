export function buildGraph(normalized) {
  const nodes = [{ id: "entity", label: normalized.name }];
  const links = [];

  normalized.attributes.forEach(attr => {
    nodes.push({ id: attr.source, label: attr.source });
    links.push({ source: "entity", target: attr.source });
  });

  return { nodes, links };
}
