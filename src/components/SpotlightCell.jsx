import { useState, useEffect, useRef } from "react";
import { animate, stagger } from "animejs";
import { GENRE_BREAKDOWN } from "@/data/uiConstants";
import albumsBgVideo from "@/assets/65390-514139029_tiny.mp4";

/**
 * 2×2 spotlight feature card.
 * s1 (WELCOME): static text card.
 * s2 (COLLECTION): video background with genre breakdown on hover.
 */
export function SpotlightCell({ item, videoRef }) {
  const isCollection = item.id === "s2";
  const cardRef      = useRef(null);
  const contentRef   = useRef(null);
  const genreRef     = useRef(null);
  const [hovered, setHovered] = useState(false);

  // Stagger-animate genre rows in when hovered
  useEffect(() => {
    if (!hovered || !genreRef.current) return;
    const rows = [...genreRef.current.children];
    rows.forEach((r) => { r.style.opacity = "0"; r.style.transform = "translateY(8px)"; });
    animate(rows, {
      opacity:    [0, 1],
      translateY: [8, 0],
      duration:   220,
      ease:       "outQuart",
      delay:      stagger(50),
    });
  }, [hovered]);

  function onMouseMove(e) {
    if (window.innerWidth < 768) return;
    const el      = cardRef.current;
    const content = contentRef.current;
    if (!el) return;
    const { left, top, width, height } = el.getBoundingClientRect();
    const x  = (e.clientX - left) / width;
    const y  = (e.clientY - top)  / height;
    const rx = (0.5 - y) * 16;
    const ry = (x - 0.72) * 22;
    el.style.transition      = "";
    el.style.transformOrigin = "72% center";
    el.style.transform       = `perspective(480px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.06)`;
    el.style.zIndex          = "10";
    if (isCollection && content) {
      // Parallax shift for the content layer
      content.style.transition = "";
      content.style.transform  = `translate(${(x - 0.5) * 20}px, ${(y - 0.5) * 12}px)`;
    }
  }

  function onMouseLeave() {
    const el      = cardRef.current;
    const content = contentRef.current;
    if (!el) return;
    el.style.transition      = "transform 500ms cubic-bezier(0.23,1,0.32,1)";
    el.style.transformOrigin = "";
    el.style.transform       = "";
    el.style.zIndex          = "";
    if (isCollection) {
      setHovered(false);
      if (content) {
        content.style.transition = "transform 500ms cubic-bezier(0.23,1,0.32,1)";
        content.style.transform  = "";
      }
    }
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onMouseEnter={isCollection ? () => setHovered(true) : undefined}
      data-spotlight-id={item.id}
      className="gcell col-span-2 row-span-2 bg-[#0f0f0f] p-6 flex flex-col justify-end
                  relative overflow-hidden cursor-default border-b border-r border-[#1c1c1c]"
      style={{ willChange: "transform", ...item.gridStyle }}
    >
      {/* Background video (collection card only) */}
      {isCollection && (
        <video
          ref={videoRef}
          autoPlay loop muted playsInline
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{ objectPosition: "20% center", willChange: "transform" }}
        >
          <source src={albumsBgVideo} type="video/mp4" />
        </video>
      )}

      {/* Dark gradient overlay */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-[#1c1c1c] via-[#111111] to-[#080808]"
        style={{ opacity: isCollection ? 0.2 : 1 }}
      />

      {/* Card content */}
      <div ref={isCollection ? contentRef : undefined} className="relative z-10">
        <p className="font-mono text-[9px] tracking-[0.25em] text-[#c8c8c8] mb-4 uppercase">
          {item.eyebrow}
        </p>

        {isCollection && hovered ? (
          // Genre breakdown (shown on hover)
          <div ref={genreRef} className="flex flex-col gap-2.5">
            {GENRE_BREAKDOWN.map(([genre, count]) => (
              <div key={genre} className="flex items-baseline justify-between">
                <span className="text-[18px] font-bold text-[#c8c8c8] leading-tight tracking-tight">
                  {genre}
                </span>
                <span className="font-mono text-[14px] text-white">{count}</span>
              </div>
            ))}
          </div>
        ) : (
          <>
            <h2 className="text-[26px] font-bold text-[#c8c8c8] leading-tight whitespace-pre-line tracking-tight">
              {item.title}
            </h2>
            <p className="text-[11px] text-[#c8c8c8] mt-3 leading-relaxed">{item.body}</p>
          </>
        )}
      </div>
    </div>
  );
}
