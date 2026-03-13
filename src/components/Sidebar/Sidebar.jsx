import { useAlbums } from "../../context/AlbumsContext";

export default function Sidebar() {
  const { albums } = useAlbums();

  const tierCounts = ["S", "A", "B", "C", "D"].reduce((acc, tier) => {
    acc[tier] = albums.filter((a) => a.tier === tier).length;
    return acc;
  }, {});

  const topArtists = Object.entries(
    albums.reduce((acc, a) => {
      acc[a.artist] = (acc[a.artist] ?? 0) + 1;
      return acc;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <aside className="w-48 shrink-0 flex flex-col gap-6 text-sm">
      {/* Stats */}
      <div>
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
          Stats
        </h3>
        <p className="text-gray-300">{albums.length} albums total</p>
      </div>

      {/* Tier breakdown */}
      <div>
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
          By Tier
        </h3>
        <ul className="flex flex-col gap-1">
          {Object.entries(tierCounts).map(([tier, count]) => (
            <li key={tier} className="flex justify-between text-gray-300">
              <span className="font-bold">{tier}</span>
              <span>{count}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Top artists */}
      {topArtists.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Top Artists
          </h3>
          <ul className="flex flex-col gap-1">
            {topArtists.map(([artist, count]) => (
              <li key={artist} className="flex justify-between text-gray-300 gap-2">
                <span className="truncate">{artist}</span>
                <span className="text-gray-500 shrink-0">{count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
