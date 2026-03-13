import AlbumCard from "../AlbumCard/AlbumCard";

const TIER_COLORS = {
  S: "bg-red-500",
  A: "bg-orange-400",
  B: "bg-yellow-400",
  C: "bg-green-500",
  D: "bg-blue-500",
};

export default function TierRow({ tier, albums }) {
  if (!albums || albums.length === 0) return null;

  return (
    <div className="flex gap-3 mb-3 items-start">
      {/* Tier label */}
      <div
        className={`${TIER_COLORS[tier] ?? "bg-gray-600"} w-16 min-h-16 flex items-center
                    justify-center font-black text-3xl text-white shrink-0 rounded-lg shadow-md`}
      >
        {tier}
      </div>

      {/* Album cards row */}
      <div className="flex flex-wrap gap-3 flex-1 min-h-16 bg-gray-800/50 rounded-lg p-3">
        {albums.map((album) => (
          <AlbumCard key={album.id} album={album} />
        ))}
      </div>
    </div>
  );
}
