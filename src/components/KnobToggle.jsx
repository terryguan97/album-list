import { useRef, useLayoutEffect, useEffect } from "react";
import { animate } from "animejs";
import { cn } from "@/lib/utils";

/**
 * Animated rotary-knob toggle button.
 * Rotates clockwise (+80°) when turned on, counter-clockwise (-80°) when off.
 * Tracks absolute rotation to ensure consistent CW/CCW direction regardless
 * of how many times it has been toggled.
 */
export function KnobToggle({ active, onClick, label = "Own Vinyl" }) {
  const knobRef = useRef(null);
  const prevRef = useRef(active);
  // Maintain absolute rotation: off = 375°, on = 455°, etc.
  const rotRef  = useRef(active ? 45 : 375);

  // Set initial rotation via JS (same property as anime.js to avoid conflicts)
  useLayoutEffect(() => {
    if (knobRef.current) {
      knobRef.current.style.transform = `rotate(${rotRef.current}deg)`;
    }
  }, []);

  useEffect(() => {
    if (!knobRef.current) return;
    const wasActive = prevRef.current;
    prevRef.current = active;
    if (active === wasActive) return;

    const from  = rotRef.current;
    const delta = active ? +80 : -80; // CW on, CCW off
    const to    = from + delta;
    rotRef.current = to;

    animate(knobRef.current, {
      rotate:   [from, to],
      duration: 480,
      ease:     "outBack(1.4)",
    });
  }, [active]);

  return (
    <button onClick={onClick} className="flex items-center gap-1.5 group" title={label}>
      <svg
        ref={knobRef}
        width="14" height="14" viewBox="0 0 24 24" fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ willChange: "transform" }}
        className={cn(
          "transition-colors duration-200",
          active ? "text-[#e0e0e0]" : "text-[#888] group-hover:text-[#bbb]"
        )}
      >
        <path d="M8.41826 9.71486C7.43023 10.4735 6.18444 10.3257 5.44765 9.38856C4.74632 8.49652 4.88303 7.23351 5.75977 6.50505C6.66693 5.75131 7.90046 5.85063 8.6789 6.7401C9.45676 7.62891 9.35883 8.86337 8.41826 9.71486Z" fill="currentColor"/>
        <path d="M10.9219 0C11.751 0 12.5801 0 13.4441 0.00959808C13.6134 0.121743 13.7808 0.0879107 13.9292 0.110948C15.2726 0.319523 16.5319 0.76075 17.7275 1.40485C19.1385 2.16503 20.3372 3.17247 21.35 4.41191C22.4508 5.7591 23.2136 7.27438 23.6577 8.95343C23.8287 9.5997 23.9289 10.2583 24 10.9219C24 11.626 24 12.3301 23.9982 13.0749C23.957 13.3993 23.919 13.6833 23.8778 13.9668C23.6971 15.2101 23.2918 16.3824 22.7235 17.4967C22.3736 18.1828 21.961 18.8335 21.4768 19.4363C20.786 20.2962 20.0055 21.0627 19.1169 21.7172C18.4193 22.2308 17.6743 22.6624 16.882 23.014C16.0326 23.3909 15.1546 23.669 14.2397 23.8377C13.9925 23.8833 13.7282 23.8642 13.5 24C12.6553 24 11.8105 24 10.9259 23.995C10.4132 23.9556 9.94724 23.8731 9.48292 23.7819C8.53908 23.5965 7.63931 23.2744 6.77498 22.8604C5.98733 22.4831 5.24697 22.0228 4.56294 21.4764C3.79956 20.8666 3.1134 20.1807 2.5081 19.4125C1.86875 18.6011 1.34787 17.7201 0.938169 16.7736C0.585134 15.9581 0.323412 15.1144 0.162492 14.2382C0.117207 13.9916 0.143 13.7259 0 13.5C0 12.5146 1.86265e-09 11.5293 0.0132504 10.5114C0.105967 10.3306 0.0951126 10.1629 0.11965 10.0047C0.313582 8.75465 0.717098 7.57136 1.2977 6.45439C2.00814 5.08765 2.95449 3.90365 4.12342 2.88982C5.30514 1.86489 6.63354 1.11035 8.10249 0.593933C9.01542 0.272989 9.96079 0.0969967 10.9219 0ZM4.78222 3.77462C3.75836 4.69471 2.91 5.75172 2.2777 6.97821C1.60633 8.28047 1.20844 9.65684 1.08628 11.1209C1.00925 12.044 1.04437 12.9579 1.20597 13.8636C1.52177 15.6336 2.22802 17.2342 3.33043 18.6624C3.96388 19.4831 4.68945 20.2081 5.52075 20.8184C6.59627 21.6079 7.77874 22.1953 9.06999 22.5523C10.4119 22.9233 11.7767 23.0484 13.1596 22.8959C14.0815 22.7943 14.9796 22.5774 15.8504 22.2474C17.1412 21.7582 18.2998 21.049 19.3221 20.1304C20.2015 19.3401 20.9263 18.4189 21.5183 17.3883C22.3727 15.9011 22.8312 14.2994 22.9438 12.5995C23.001 11.7368 22.9282 10.8756 22.7702 10.0207C22.3955 7.9939 21.5073 6.21986 20.1416 4.68911C19.3597 3.81275 18.4485 3.08723 17.4245 2.49821C15.9393 1.6439 14.3406 1.17658 12.642 1.05784C11.6372 0.987606 10.6332 1.07338 9.65016 1.29939C7.83519 1.71665 6.21318 2.52377 4.78222 3.77462Z" fill="currentColor"/>
      </svg>
      <span className={cn(
        "font-mono text-[11px] transition-colors duration-200",
        active ? "text-[#e0e0e0]" : "text-[#888] group-hover:text-[#bbb]"
      )}>
        {label}
      </span>
    </button>
  );
}
