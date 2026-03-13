export default function About() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-12 flex flex-col gap-6 text-gray-300">
      <h2 className="text-3xl font-black text-white">About</h2>
      <p>
        This is my personal album tier list — a collection of records I love,
        ranked from S-tier (all-time favorites) to D-tier (still worth knowing about).
      </p>
      <p>
        Album data is pulled from the Spotify API and stored in Firebase.
        The rankings are entirely subjective and change over time as my taste evolves.
      </p>
      <h3 className="text-xl font-bold text-white mt-4">Tier Guide</h3>
      <ul className="flex flex-col gap-2 text-sm">
        {[
          ["S", "bg-red-500", "All-time favorites. Essential listening."],
          ["A", "bg-orange-400", "Excellent albums I return to regularly."],
          ["B", "bg-yellow-400 text-gray-900", "Really good. Solid listens."],
          ["C", "bg-green-500", "Good albums I enjoy but don't love."],
          ["D", "bg-blue-500", "Worth hearing at least once."],
        ].map(([tier, color, desc]) => (
          <li key={tier} className="flex items-center gap-3">
            <span className={`${color} w-8 h-8 rounded font-black flex items-center justify-center text-white shrink-0`}>
              {tier}
            </span>
            <span>{desc}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
