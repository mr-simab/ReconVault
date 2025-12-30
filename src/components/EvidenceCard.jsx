export default function EvidenceCard({ title, value }) {
  return (
    <div className="bg-slate-900 border border-cyan-500 rounded-xl p-4 glow hover:scale-105 transition">
      <h3 className="text-sm text-cyan-300 glow-text">{title}</h3>
      <p className="text-xl font-bold text-white mt-2">{value}</p>
    </div>
  );
}
