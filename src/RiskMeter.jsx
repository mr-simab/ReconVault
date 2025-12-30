export default function RiskMeter({ risk }) {
  const colors = {
    Low: "text-green-400",
    Medium: "text-yellow-400",
    High: "text-orange-400",
    Critical: "text-red-500"
  };
  return <div className={`text-2xl ${colors[risk]}`}>Risk: {risk}</div>;
}
