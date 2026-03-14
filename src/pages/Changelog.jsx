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

import SubPageLayout from "@/components/SubPageLayout";

export default function Changelog() {
  return (
    <SubPageLayout>
      <div className="flex flex-col gap-6">
        <h2 className="text-xl font-bold text-white tracking-tight">Changelog</h2>
        <p className="text-sm text-[#888]">
          A running log of changes to my rankings and additions to the list.
        </p>

        <div className="flex flex-col gap-0">
          {CHANGELOG.map((entry, i) => (
            <div key={i} className="flex gap-4">
              {/* Timeline indicator */}
              <div className="flex flex-col items-center pt-1.5">
                <div className="w-1 h-1 bg-[#444] shrink-0" />
                {i < CHANGELOG.length - 1 && (
                  <div className="w-px flex-1 bg-[#1e1e1e] mt-1" />
                )}
              </div>

              <div className="flex flex-col gap-1.5 pb-6">
                <time className="font-mono text-[10px] text-[#888]">{entry.date}</time>
                <p className="text-sm text-white">{entry.description}</p>
                <ul className="flex flex-col gap-1">
                  {entry.items.map((item, j) => (
                    <li key={j} className="text-sm text-[#888] flex gap-2">
                      <span className="text-[#444]">—</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SubPageLayout>
  );
}
