export default function Timeline({ events }) {
  return (
    <div className="border-l-2 border-cyan-500 pl-4 space-y-4">
      {events.map((e, i) => (
        <div key={i} className="relative">
          <div className="absolute -left-[9px] top-1 w-4 h-4 bg-cyan-400 rounded-full glow"></div>
          <p className="text-cyan-300">{e.date}</p>
          <p className="text-white">{e.event}</p>
        </div>
      ))}
    </div>
  );
}
