import { useTilt } from "@/hooks/useTilt";
import { tierGlowStyle, sortGlow } from "@/constants/theme";
import { cn } from "@/lib/utils";
import VinylIcon from "@/components/ui/VinylIcon";

/**
 * Standard album card — used in both the desktop grid and mobile list.
 * Desktop: vertical layout (index / title+artist / year+vinyl).
 * Mobile:  horizontal layout (index → title+artist → tier rating).
 */
export function AlbumCell({ album, onExpand, matched, hasFilter, sort, isDefault, compact = false, className: extraClass }) {
  const { ref: cardRef, onMouseMove, onMouseLeave } = useTilt(14, 18, 1.09, 500);

  const dimmed  = hasFilter && !matched;
  const glowing = hasFilter &&  matched;

  const byRating = !sort || sort === "Rating";
  const byYear   = sort === "Year";
  const byArtist = sort === "Artist";
  const byAlbum  = sort === "Album";
  const byGenre  = sort === "Genre";

  return (
    <div
      ref={cardRef}
      data-album-id={album.id}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onClick={() => onExpand(album.id)}
      className={cn("gcell group bg-[#111111] p-4 flex flex-col justify-between cursor-pointer hover:bg-[#181818] border-b border-r border-[#1c1c1c]", extraClass)}
      style={{
        willChange: "transform",
        position: "relative",
        opacity: dimmed ? 0.25 : 1,
        transition: "opacity 300ms ease, box-shadow 300ms ease",
        boxShadow: glowing
          ? "inset 0 0 0 1px rgba(255,255,255,0.07), inset 0 0 24px rgba(255,255,255,0.03)"
          : "none",
      }}
    >
      {/* ── Desktop grid layout (vertical) ── */}
      {!compact && (
        <>
          <div className="hidden md:flex items-start justify-between">
            <div className="flex items-center gap-1.5">
              {byGenre ? (
                <span className="font-mono text-[10px] truncate max-w-[90px]" style={sortGlow()}>
                  {album.genre}
                </span>
              ) : (
                <span className="font-mono text-[10px] text-[#383838] transition-colors duration-250 group-hover:text-white">
                  {String(album.seq).padStart(2, "0")}
                </span>
              )}
              {album.latest && !isDefault && (
                <span className="font-mono text-[7px] tracking-widest text-white border border-white/30 px-1 leading-tight">
                  NEW
                </span>
              )}
            </div>
            <span className="font-mono text-[10px]" style={byRating ? tierGlowStyle(album.tier) : { color: "#383838" }}>
              {album.tier}
            </span>
          </div>

          <div className="hidden md:block mt-2 flex-1">
            <p
              className="text-[12.5px] font-medium leading-snug line-clamp-2 transition-colors duration-250 group-hover:text-white"
              style={byAlbum ? sortGlow() : { color: "#bfbfbf" }}
            >
              {album.crowned && <span className="mr-1 text-[#666] transition-colors duration-250 group-hover:text-white">♛</span>}
              {album.title}
            </p>
            <p
              className="text-[10.5px] mt-0.5 truncate transition-colors duration-250 group-hover:text-white"
              style={byArtist ? sortGlow() : { color: "#484848" }}
            >
              {album.artist}
            </p>
          </div>

          <div className="hidden md:flex items-end justify-between mt-2">
            <span
              className="font-mono text-[10px] transition-colors duration-250 group-hover:text-white"
              style={byYear ? sortGlow() : { color: "#383838" }}
            >
              {album.year}
            </span>
            {album.vinyl && <VinylIcon className="text-[#383838] transition-colors duration-250 group-hover:text-white" />}
          </div>
        </>
      )}

      {/* ── Horizontal layout (mobile + desktop list view) ── */}
      <div className={cn("items-center gap-3", compact ? "flex" : "flex md:hidden")}>
        <span className="font-mono text-[10px] text-[#555] shrink-0 group-hover:text-white transition-colors duration-150">
          {byGenre ? album.genre : String(album.seq).padStart(2, "0")}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[16px] font-medium text-[#bfbfbf] truncate leading-snug group-hover:text-white transition-colors duration-150">
            {album.crowned && <span className="mr-1 text-[#555]">♛</span>}
            {album.title}
          </p>
          <p className="text-[11px] text-[#484848] truncate group-hover:text-white transition-colors duration-150">
            {album.artist}
          </p>
        </div>
        <span className="font-mono text-[12px] shrink-0" style={tierGlowStyle(album.tier)}>
          {album.tier}
        </span>
      </div>
    </div>
  );
}
