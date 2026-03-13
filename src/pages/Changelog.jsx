// Add new entries to the top of this array as you update your list
const CHANGELOG = [
  {
    date: "2026-03-09",
    description: "Initial launch. Imported albums from spreadsheet.",
    items: [
      "Set up Firebase and Spotify integration",
      "Added tier list display",
      "Built search and filter system",
    ],
  },
  // Add more entries here as you make changes, for example:
  // {
  //   date: "2026-04-01",
  //   description: "Spring update",
  //   items: ["Moved In Rainbows from A to S tier", "Added 5 new albums"],
  // },
];

export default function Changelog() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-12 flex flex-col gap-8 text-gray-300">
      <h2 className="text-3xl font-black text-white">Changelog</h2>
      <p className="text-sm text-gray-500">
        A running log of changes to my rankings and additions to the list.
      </p>

      {CHANGELOG.map((entry, i) => (
        <div key={i} className="flex gap-4">
          {/* Timeline line */}
          <div className="flex flex-col items-center gap-1 pt-1">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />
            {i < CHANGELOG.length - 1 && (
              <div className="w-px flex-1 bg-gray-700 mt-1" />
            )}
          </div>

          <div className="flex flex-col gap-2 pb-6">
            <time className="text-xs text-gray-500 font-mono">{entry.date}</time>
            <p className="font-bold text-gray-100">{entry.description}</p>
            <ul className="flex flex-col gap-1">
              {entry.items.map((item, j) => (
                <li key={j} className="text-sm text-gray-400 flex gap-2">
                  <span className="text-gray-600">—</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
}
