import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { animate, stagger } from "animejs";
import { cn } from "@/lib/utils";
import { ALBUMS } from "@/data/albums";

export default function SubPageLayout({ children }) {
  const location = useLocation();
  const titleRef = useRef(null);
  const navRef = useRef(null);

  const [mobileMenuOpen,    setMobileMenuOpen]    = useState(false);
  const [mobileMenuClosing, setMobileMenuClosing] = useState(false);

  const closeMobileMenu = () => {
    setMobileMenuClosing(true);
    setTimeout(() => { setMobileMenuOpen(false); setMobileMenuClosing(false); }, 180);
  };

  const navLinks = [
    { label: "HOME",      to: "/" },
    { label: "ABOUT",     to: "/about" },
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
      {/* Desktop header */}
      <header className="hidden md:flex h-8 bg-[#0c0c0c] border-b border-[#1a1a1a] items-center justify-between px-4 shrink-0">
        <div ref={titleRef} className="flex items-center gap-2 font-mono text-[11px]">
          <Link to="/" className="text-[#e8e8e8] font-bold tracking-widest hover:text-white transition-colors duration-150">
            Terry's Album List
          </Link>
          <span className="text-[#444]">·</span>
          <span className="text-[#888]">{ALBUMS.length} albums</span>
        </div>

        <nav ref={navRef} className="flex items-center gap-2">
          {navLinks.map(({ label, to }) => {
            const isActive = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={cn(boxBase, isActive && "text-white border-white/40")}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* Mobile header (fixed) */}
      <header className="md:hidden bg-[#0c0c0c] border-b border-[#1a1a1a] fixed top-0 left-0 right-0 z-20">
        <div className="h-12 flex items-center justify-between px-4">
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <Link to="/" className="text-[#e8e8e8] font-bold tracking-widest">
              Terry's Album List
            </Link>
            <span className="text-[#444]">·</span>
            <span className="text-[#888]">{ALBUMS.length} albums</span>
          </div>
          <button
            onClick={() => mobileMenuOpen ? closeMobileMenu() : setMobileMenuOpen(true)}
            className="flex flex-col gap-[5px] p-2 text-[#888] hover:text-white transition-colors"
            aria-label="Menu"
          >
            {mobileMenuOpen ? (
              <span className="font-mono text-[13px] leading-none">✕</span>
            ) : (
              <>
                <span className="block w-5 h-px bg-current" />
                <span className="block w-5 h-px bg-current" />
                <span className="block w-5 h-px bg-current" />
              </>
            )}
          </button>
        </div>
        {mobileMenuOpen && (
          <div className={`flex gap-2 px-4 pb-3 font-mono text-[9px] tracking-widest ${mobileMenuClosing ? "mobile-menu-out" : "mobile-menu-in"}`}>
            {navLinks.map(({ label, to }) => {
              const isActive = location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  onClick={closeMobileMenu}
                  className={cn(
                    "text-[#888] hover:text-white border border-[#2a2a2a] hover:border-white px-1.5 py-0.5 transition-colors duration-150",
                    isActive && "text-white border-white/40"
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        )}
      </header>

      {/* Content — pt-12 on mobile accounts for fixed header */}
      <main className="flex-1 overflow-y-auto no-scrollbar pt-12 md:pt-0">
        <div className="max-w-[800px] mx-auto px-8 py-10">{children}</div>
      </main>
    </div>
  );
}
