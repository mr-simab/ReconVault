import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { collect } from "../engine/collectors";

export default function Home() {
  const [entityType, setEntityType] = useState("Individual");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [domain, setDomain] = useState("");
  const navigate = useNavigate();

  const handleSubmit = () => {
    const data = collect(entityType, { username, email, domain });
    sessionStorage.setItem("entityData", JSON.stringify(data));
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
      <h1 className="text-4xl glow-text">ReconVault</h1>

      <select
        className="border p-2 bg-black"
        value={entityType}
        onChange={(e) => setEntityType(e.target.value)}
      >
        <option>Individual</option>
        <option>Organization</option>
      </select>

      {entityType === "Individual" ? (
        <>
          <input placeholder="Username" onChange={e => setUsername(e.target.value)} />
          <input placeholder="Public Email" onChange={e => setEmail(e.target.value)} />
        </>
      ) : (
        <input placeholder="Domain / Org Name" onChange={e => setDomain(e.target.value)} />
      )}

      <button onClick={handleSubmit} className="bg-cyan-500 px-4 py-2">
        Analyze
      </button>
    </div>
  );
}
