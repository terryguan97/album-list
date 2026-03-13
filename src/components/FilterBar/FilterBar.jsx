export default function FilterBar({ albums, filters, onChange, count }) {
  const genres = [...new Set(albums.flatMap((a) => a.genre ?? []))].sort();

  return (
    <div className="flex items-center justify-between px-8 py-3 bg-[#f0f0f0] text-sm">
      {/* Album count */}
      <span className="text-gray-400 border-l-2 border-gray-400 pl-2 text-xs">
        {count} Albums listed
      </span>

      {/* Filters */}
      <div className="flex items-center gap-6">
        {/* Genre */}
        <div className="flex items-center gap-1.5">
          <span className="text-gray-400 text-xs">Genre</span>
          <select
            value={filters.genre}
            onChange={(e) => onChange({ ...filters, genre: e.target.value })}
            className="bg-transparent text-gray-700 font-semibold text-sm focus:outline-none cursor-pointer"
          >
            <option value="">All</option>
            {genres.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        {/* Sort by */}
        <div className="flex items-center gap-1.5">
          <span className="text-gray-400 text-xs">Sort by</span>
          <select
            value={filters.sort ?? "title"}
            onChange={(e) => onChange({ ...filters, sort: e.target.value })}
            className="bg-transparent text-gray-700 font-semibold text-sm focus:outline-none cursor-pointer"
          >
            <option value="title">Title</option>
            <option value="artist">Artist</option>
            <option value="year">Year</option>
            <option value="tier">Tier</option>
          </select>
        </div>
      </div>
    </div>
  );
}
