import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { animate, stagger } from "animejs";
import { cn } from "@/lib/utils";
import { ALBUMS } from "@/data/albums";

export default function SubPageLayout({ children }) {
  const location = useLocation();
  const titleRef = useRef(null);
  const navRef = useRef(null);

  const navLinks = [
    { label: "HOME", to: "/" },
    { label: "ABOUT", to: "/about" },
    { label: "CHANGELOG", to: "/changelog" },
  ];

  useEffect(() => {
    if (titleRef.current) {
      animate(titleRef.current, {
        translateX: [-40, 0],
        opacity: [0, 1],
        duration: 500,
        ease: "outQuart",
      });
    }

    const navEl = navRef.current;
    if (navEl) {
      const links = navEl.querySelectorAll("a");
      if (links.length) {
        animate(links, {
          translateX: [40, 0],
          opacity: [0, 1],
          duration: 500,
          ease: "outQuart",
          delay: stagger(60),
        });
      }
    }
  }, []);

  const boxBase =
    "font-mono text-[9px] text-[#888] hover:text-white border border-[#2a2a2a] hover:border-white px-1.5 py-0.5 tracking-widest transition-colors duration-150";

  return (
    <div className="vinyl-flip-in h-screen flex flex-col bg-[#0c0c0c] text-[#e0e0e0] overflow-hidden">
      {/* Header */}
      <header className="h-8 bg-[#0c0c0c] border-b border-[#1a1a1a] flex items-center justify-between px-4 shrink-0">
        {/* Title — same as home */}
        <div ref={titleRef} className="flex items-center gap-2 font-mono text-[11px]">
          <Link to="/" className="text-[#e8e8e8] font-bold tracking-widest hover:text-white transition-colors duration-150">
            Terry's Album List
          </Link>
          <span className="text-[#444]">·</span>
          <span className="text-[#888]">{ALBUMS.length} albums</span>
        </div>

        {/* Nav links */}
        <nav ref={navRef} className="flex items-center gap-1">
          {navLinks.map(({ label, to }) => {
            const isActive = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  boxBase,
                  isActive && "text-white border-white/40"
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto no-scrollbar">
        <div className="max-w-[800px] mx-auto px-8 py-10">{children}</div>
      </main>
    </div>
  );
}
