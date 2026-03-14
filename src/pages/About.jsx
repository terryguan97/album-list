import SubPageLayout from "@/components/SubPageLayout";

export default function About() {
  return (
    <SubPageLayout>
      <div className="flex flex-col gap-6">
        <h2 className="text-xl font-bold text-white tracking-tight">About</h2>
        <p className="text-[#888] text-sm leading-relaxed">
          This is my personal album tier list — a collection of records I love,
          ranked from S-tier (all-time favorites) to D-tier (still worth knowing about).
        </p>
        <p className="text-[#888] text-sm leading-relaxed">
          Album data is pulled from the Spotify API and stored in Firebase.
          The rankings are entirely subjective and change over time as my taste evolves.
        </p>

        <h3 className="text-white font-bold mt-2">Tier Guide</h3>
        <ul className="flex flex-col gap-3">
          {[
            ["S", "All-time favorites. Essential listening."],
            ["A", "Excellent albums I return to regularly."],
            ["B", "Really good. Solid listens."],
            ["C", "Good albums I enjoy but don't love."],
            ["D", "Worth hearing at least once."],
          ].map(([tier, desc]) => (
            <li key={tier} className="flex items-center gap-3">
              <span className="font-mono text-[10px] text-[#888] border border-[#2a2a2a] px-1 shrink-0">
                {tier}
              </span>
              <span className="text-[#888] text-sm">{desc}</span>
            </li>
          ))}
        </ul>
      </div>
    </SubPageLayout>
  );
}
