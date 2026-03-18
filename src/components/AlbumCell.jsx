import { useState } from "react";
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
  const [hovered, setHovered] = useState(false);

  const dimmed  = hasFilter && !matched;
  const glowing = hasFilter &&  matched;

  const byRating = !sort || sort === "Rating";
  const byYear   = sort === "Year";
  const byArtist = sort === "Artist";
  const byAlbum  = sort === "Album";
  const byGenre  = sort === "Genre";

  const white = "white";
  const t = "color 250ms ease";

  return (
    <div
      ref={cardRef}
      data-album-id={album.id}
      onMouseMove={onMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); onMouseLeave(); }}
      onClick={() => onExpand(album.id)}
      className={cn("gcell group bg-[#111111] p-4 flex flex-col justify-between cursor-pointer hover:bg-[#181818] border-b border-r border-[#1c1c1c] overflow-hidden", extraClass)}
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
      {/* ── Cover art background ── */}
      {album.cover && (
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-center pointer-events-none transition-opacity duration-500 opacity-0 group-hover:opacity-[0.25]"
          style={{ backgroundImage: `url(${album.cover})` }}
        />
      )}

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
                <span className="font-mono text-[10px] transition-colors duration-250" style={{ color: hovered ? white : "#383838", transition: t }}>
                  {String(album.seq).padStart(2, "0")}
                </span>
              )}
              {album.latest && !isDefault && (
                <span className="font-mono text-[7px] tracking-widest text-white border border-white/30 px-1 leading-tight">
                  NEW
                </span>
              )}
            </div>
            <span className="font-mono text-[10px]" style={byRating ? tierGlowStyle(album.tier) : { color: hovered ? white : "#383838", transition: t }}>
              {album.tier}
            </span>
          </div>

          <div className="hidden md:block mt-2 flex-1">
            <p
              className="text-[12.5px] font-medium leading-snug line-clamp-2"
              style={byAlbum ? sortGlow() : { color: hovered ? white : "#bfbfbf", transition: t }}
            >
              {album.crowned && <span className="mr-1" style={{ color: hovered ? white : "#666", transition: t }}>♛</span>}
              {album.title}
            </p>
            <p
              className="text-[10.5px] mt-0.5 truncate"
              style={byArtist ? sortGlow() : { color: hovered ? white : "#484848", transition: t }}
            >
              {album.artist}
            </p>
          </div>

          <div className="hidden md:flex items-end justify-between mt-2">
            <span
              className="font-mono text-[10px]"
              style={byYear ? sortGlow() : { color: hovered ? white : "#383838", transition: t }}
            >
              {album.year}
            </span>
            {album.vinyl && <VinylIcon className="transition-colors duration-250" style={{ color: hovered ? white : "#383838" }} />}
          </div>
        </>
      )}

      {/* ── Horizontal layout (mobile + desktop list view) ── */}
      <div className={cn("items-center gap-3", compact ? "flex" : "flex md:hidden")}>
        <span className="font-mono text-[10px] shrink-0 transition-colors duration-150" style={{ color: hovered ? white : "#555", transition: t }}>
          {byGenre ? album.genre : String(album.seq).padStart(2, "0")}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[16px] font-medium truncate leading-snug transition-colors duration-150" style={{ color: hovered ? white : "#bfbfbf", transition: t }}>
            {album.crowned && <span className="mr-1" style={{ color: hovered ? white : "#555", transition: t }}>♛</span>}
            {album.title}
          </p>
          <p className="text-[11px] truncate transition-colors duration-150" style={{ color: hovered ? white : "#484848", transition: t }}>
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
