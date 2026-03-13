import { useState } from "react";

export default function SearchBar({ onSearch }) {
  const [query, setQuery] = useState("");

  function handleChange(e) {
    setQuery(e.target.value);
    onSearch?.(e.target.value);
  }

  return (
    <input
      type="search"
      value={query}
      onChange={handleChange}
      placeholder="Search albums or artists..."
      className="w-full bg-gray-800 text-gray-100 placeholder-gray-500 border border-gray-700
                 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
    />
  );
}
