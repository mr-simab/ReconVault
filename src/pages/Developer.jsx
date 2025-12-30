import { Link } from "react-router-dom";

export default function Developer() {
  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl glow-text">ReconVault Developer Notes</h2>
      <p>OSINT Engine · Graph Intelligence · Risk Correlation</p>

      <Link to="/" className="border px-3 py-1">
        Home
      </Link>
    </div>    
  );
}
