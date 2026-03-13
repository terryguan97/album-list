import { NavLink } from "react-router-dom";

export default function Header({ search, onSearch }) {
  return (
    <header className="bg-black px-8 flex items-center gap-6 sticky top-0 z-50 overflow-hidden" style={{ height: "72px" }}>
      {/* Logo + decorative shape */}
      <div className="relative flex items-center shrink-0 pr-16">
        <div className="text-white leading-none z-10 relative">
          <div className="text-[10px] font-normal tracking-widest text-white/60 uppercase">Terry's</div>
          <div className="text-2xl font-black tracking-tight">Album</div>
          <div className="text-2xl font-black tracking-tight">List</div>
        </div>
        {/* Decorative white blob */}
        <div
          className="absolute pointer-events-none"
          style={{
            right: "-20px",
            top: "-40px",
            width: "130px",
            height: "130px",
            background: "white",
            borderRadius: "60% 40% 55% 45% / 50% 60% 40% 50%",
          }}
        />
      </div>

      {/* Search bar — centered */}
      <div className="flex-1 max-w-2xl mx-auto">
        <input
          type="search"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search keywords..."
          className="w-full bg-white text-gray-800 placeholder-gray-400 rounded-full px-5 py-2.5 text-sm focus:outline-none shadow-sm"
        />
      </div>

      {/* Nav */}
      <nav className="flex gap-6 text-sm font-medium shrink-0">
        <NavLink
          to="/about"
          className={({ isActive }) =>
            isActive ? "text-white" : "text-gray-400 hover:text-white transition-colors"
          }
        >
          About
        </NavLink>
        <NavLink
          to="/changelog"
          className={({ isActive }) =>
            isActive ? "text-white" : "text-gray-400 hover:text-white transition-colors"
          }
        >
          Changelogs
        </NavLink>
      </nav>
    </header>
  );
}
