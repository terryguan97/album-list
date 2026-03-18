import { useState } from "react";
import { useTilt } from "@/hooks/useTilt";
import { tierGlowStyle, sortGlow } from "@/constants/theme";
import VinylIcon from "@/components/ui/VinylIcon";

/**
 * Expanded 2×2 album card — shown when a card is clicked.
 * Displays full album info with tilt effect and a "click to close" hint.
 */
export function AlbumExpandedCell({ album, onCollapse, sort, coverArts = false }) {
  const { ref: cardRef, onMouseMove, onMouseLeave: tiltLeave } = useTilt(10, 14, 1.03, 700);
  const [hovered, setHovered] = useState(false);

  const byRating = !sort || sort === "Rating";
  const byYear   = sort === "Year";
  const byArtist = sort === "Artist";
  const byAlbum  = sort === "Album";
  const byGenre  = sort === "Genre";

  const textOpacity = coverArts ? (hovered ? 1 : 0) : 1;

  return (
    <div
      ref={cardRef}
      data-album-id={album.id}
      onMouseMove={onMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); tiltLeave(); }}
      onClick={onCollapse}
      className="gcell col-span-2 row-span-2 bg-[#161616] p-6 flex flex-col justify-between
                  cursor-pointer hover:bg-[#1c1c1c] relative overflow-hidden border-b border-r border-[#1c1c1c]"
      style={{ willChange: "transform" }}
    >
      {/* Cover art background */}
      {album.cover && (
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-center pointer-events-none opacity-[1]"
          style={{ backgroundImage: `url(${album.cover})` }}
        />
      )}

      {/* Dark overlay — always on when coverArts is off, fades in on hover when coverArts is on */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-br from-[#161616]/60 to-[#161616]/80 pointer-events-none transition-opacity duration-300"
        style={{ opacity: coverArts ? (hovered ? 1 : 0) : 1 }}
      />

      <div className="relative z-10 flex items-start justify-between"
           style={{ opacity: textOpacity, transition: "opacity 300ms ease" }}>
        <span className="font-mono text-[13px] text-white">{String(album.seq).padStart(2, "0")}</span>
        <span className="font-mono text-[13px]" style={byRating ? tierGlowStyle(album.tier) : { color: "white" }}>
          {album.tier}
        </span>
      </div>

      <div className="relative z-10 flex-1 flex flex-col justify-center mt-4"
           style={{ opacity: textOpacity, transition: "opacity 300ms ease" }}>
        {album.latest && (
          <span className="font-mono text-[8px] tracking-widest text-white border border-white/30 px-1 leading-tight self-start mb-2">
            NEW
          </span>
        )}
        <div className="flex items-center gap-2">
          <p className="text-[22px] font-bold leading-tight tracking-tight"
             style={byAlbum ? sortGlow() : { color: "white" }}>
            {album.crowned && <span className="mr-2">♛</span>}
            {album.title}
          </p>
          {album.vinyl && <VinylIcon className="text-white shrink-0" />}
        </div>
        <p className="text-[13px] mt-1.5" style={byArtist ? sortGlow() : { color: "white" }}>
          {album.artist}
        </p>
        <p className="font-mono text-[10px] mt-3 tracking-widest uppercase"
           style={byGenre ? sortGlow() : { color: "rgba(255,255,255,0.6)" }}>
          {album.genre}
        </p>
      </div>

      <div className="relative z-10 flex items-center justify-between mt-4"
           style={{ opacity: textOpacity, transition: "opacity 300ms ease" }}>
        <span className="font-mono text-[13px]" style={byYear ? sortGlow() : { color: "white" }}>
          {album.year}
        </span>
        <span className="font-mono text-[11px] text-white/40 tracking-widest">CLICK TO CLOSE</span>
      </div>
    </div>
  );
}
