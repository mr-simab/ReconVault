import { useEffect, useState } from "react";
import { normalize } from "../engine/normalizer";
import { analyze } from "../engine/analysis";
import { calculateRisk } from "../engine/riskEngine";
import { buildGraph } from "../engine/graph";
import GraphView from "../components/GraphView";
import RiskMeter from "../components/RiskMeter";
import EthicsPanel from "../components/EthicsPanel";
import { Link } from "react-router-dom";

// ✅ Import existing OSINT datasets
import individualData from "../data/individual.json";
import organizationData from "../data/organization.json";

export default function Dashboard() {
  const [entity, setEntity] = useState(null);

  useEffect(() => {
    const runtime = JSON.parse(sessionStorage.getItem("entityData"));
    if (!runtime) return;

    // ✅ Select correct static dataset
    const baseData =
      runtime.group === "Individual"
        ? individualData
        : organizationData;

    // ✅ Merge runtime name/email/domain with static OSINT data
    setEntity({
      ...baseData,
      name: runtime.name || baseData.name,
      email: runtime.email || baseData.email,
      domain: runtime.domain || baseData.domain
    });
  }, []);

  if (!entity) return <p className="text-cyan-300">Loading intelligence…</p>;

  const normalized = normalize(entity);
  const analysis = analyze(normalized);
  const risk = calculateRisk(analysis);
  const graph = buildGraph(normalized);

  return (
    <div className="min-h-screen p-6 space-y-6">
      <h1 className="text-3xl glow-text">{entity.name}</h1>

      <RiskMeter risk={risk} />
      <GraphView graph={graph} />

      {/* 🔍 ENTITY DETAILS (FROM src/data) */}
      <div className="bg-black border border-cyan-500 rounded-xl p-4 glow space-y-4">
        <h2 className="text-xl glow-text">Entity Intelligence</h2>

        <div className="text-cyan-300 space-y-1">
          <p><strong>Entity Type:</strong> {entity.entity}</p>
          {entity.location && <p><strong>Location:</strong> {entity.location}</p>}
          {entity.domain && <p><strong>Domain:</strong> {entity.domain}</p>}
          {entity.email && <p><strong>Email:</strong> {entity.email}</p>}
        </div>

        {entity.education && (
          <div>
            <h3 className="text-cyan-400">Education</h3>
            <ul className="list-disc ml-5 text-white">
              {entity.education.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        )}

        {entity.locations && (
          <div>
            <h3 className="text-cyan-400">Locations</h3>
            <ul className="list-disc ml-5 text-white">
              {entity.locations.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <h3 className="text-cyan-400">OSINT Findings</h3>
          <div className="space-y-3 mt-2">
            {Object.entries(entity.findings).map(([source, items]) => (
              <div key={source}>
                <p className="uppercase text-cyan-300">{source}</p>
                <ul className="list-disc ml-5 text-white">
                  {items.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      <EthicsPanel />

      <div className="flex gap-4">
        <Link to="/" className="border px-3 py-1 glow">Home</Link>
        <Link to="/developer" className="border px-3 py-1 glow">Developer</Link>
      </div>
    </div>
  );
}
