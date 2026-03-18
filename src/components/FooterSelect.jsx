import { useState, useEffect, useRef } from "react";
import { animate } from "animejs";
import { cn } from "@/lib/utils";

/**
 * Animated dropdown select used in the footer filter bar.
 * Opens upward with a scale-in animation; closes with scale-out.
 * Clicking outside the dropdown closes it automatically.
 */
export function FooterSelect({ value, onChange, options }) {
  const [visible, setVisible] = useState(false);
  const listRef = useRef(null);
  const wrapRef = useRef(null);

  const open = () => setVisible(true);

  const close = () => {
    if (listRef.current) {
      animate(listRef.current, {
        scaleY:   [1, 0],
        opacity:  [1, 0],
        duration: 140,
        ease:     "inQuart",
      });
      setTimeout(() => setVisible(false), 145);
    } else {
      setVisible(false);
    }
  };

  const toggle = () => (visible ? close() : open());

  // Animate in when list mounts
  useEffect(() => {
    if (visible && listRef.current) {
      animate(listRef.current, {
        scaleY:   [0, 1],
        opacity:  [0, 1],
        duration: 200,
        ease:     "outQuart",
      });
    }
  }, [visible]);

  // Close on outside click
  useEffect(() => {
    if (!visible) return;
    const handler = (e) => { if (!wrapRef.current?.contains(e.target)) close(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [visible]);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={toggle}
        className={cn(
          "font-mono text-[11px] transition-colors duration-150",
          visible ? "text-[#e0e0e0]" : "text-[#888] hover:text-[#bbb]"
        )}
      >
        {selected?.label}
      </button>

      {visible && (
        <div
          ref={listRef}
          className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2"
          style={{
            opacity: 0,
            scaleY: 0,
            transformOrigin: "bottom",
            background: "#0c0c0c",
          }}
        >
          {options.map(({ value: v, label }) => (
            <button
              key={v}
              onClick={() => { onChange(v); close(); }}
              className={cn(
                "w-full text-center font-mono text-[11px] px-5 whitespace-nowrap transition-colors duration-100",
                v === value ? "text-[#e0e0e0]" : "text-[#505050] hover:text-white"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
