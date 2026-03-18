import { useRef } from "react";

/**
 * Mouse-follow perspective tilt effect.
 * Automatically disabled on mobile viewports (< 768px).
 *
 * @param {number} rx  - Max rotateX degrees
 * @param {number} ry  - Max rotateY degrees
 * @param {number} sc  - Scale on hover
 * @param {number} perspective - CSS perspective value in px
 * @returns {{ ref, onMouseMove, onMouseLeave }}
 */
export function useTilt(rx = 14, ry = 18, sc = 1.09, perspective = 500) {
  const ref = useRef(null);
  const isMobile = () => window.innerWidth < 768;

  function onMouseMove(e) {
    if (isMobile()) return;
    const el = ref.current;
    if (!el) return;
    const { left, top, width, height } = el.getBoundingClientRect();
    const x  = (e.clientX - left) / width;
    const y  = (e.clientY - top)  / height;
    const rX = (0.5 - y) * rx;
    const rY = (x - 0.5) * ry;
    el.style.transition = "background-color 150ms";
    el.style.transform  = `perspective(${perspective}px) rotateX(${rX}deg) rotateY(${rY}deg) scale(${sc})`;
    el.style.zIndex     = "10";
  }

  function onMouseLeave() {
    if (isMobile()) return;
    const el = ref.current;
    if (!el) return;
    el.style.transition = "transform 500ms cubic-bezier(0.23,1,0.32,1), background-color 150ms";
    el.style.transform  = "";
    el.style.zIndex     = "";
  }

  return { ref, onMouseMove, onMouseLeave };
}
