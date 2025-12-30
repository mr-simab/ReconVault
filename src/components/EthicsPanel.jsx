import { ethics } from "../engine/ethics";

export default function EthicsPanel() {
  return (
    <div className="border border-cyan-400 p-3">
      <h3>Ethics & Compliance</h3>
      <p>{ethics.policy}</p>
      <p>{ethics.transparency}</p>
      <p>{ethics.compliance}</p>
    </div>
  );
}
