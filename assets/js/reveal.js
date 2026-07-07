// SONBIP - scroll reveal (IntersectionObserver). Reduced-motion: instant.
// Honors the no-scroll-listener rule: only observer callbacks, throttled by the browser.
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

export function initReveal(scope = document) {
  const els = scope.querySelectorAll("[data-reveal]");
  if (!els.length) return;
  if (reduce || !("IntersectionObserver" in window)) { els.forEach((e) => e.classList.add("in")); return; }
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
    }
  }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
  els.forEach((e, i) => { e.style.setProperty("--reveal-i", i % 6); io.observe(e); });
}
