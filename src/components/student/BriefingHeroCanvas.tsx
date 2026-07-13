/**
 * Shared hero backdrop — the "AI Briefing" black canvas + golden mesh illustration.
 * Drop it as the FIRST child of a `relative isolate overflow-hidden` section and
 * render the hero content in a sibling `relative z-10` wrapper. Keeps the dashboard
 * briefing, the assessment calendar and the study-plan heroes visually identical.
 */
export function BriefingHeroCanvas() {
  return (
    <>
      {/* Black base → subtle dark-navy toward the right (benchmark). */}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-[#0a0a0c] via-[#0d0e13] to-[#141a2e]" />
      {/* Golden mesh illustration on the right — flowing arcs + glow. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-24 bottom-[-30%] h-[42rem] w-[42rem] rounded-full bg-[radial-gradient(closest-side,rgba(245,180,0,0.22),transparent)] blur-2xl" />
        <svg className="absolute right-0 top-0 h-full w-2/3 opacity-70" viewBox="0 0 600 400" fill="none" preserveAspectRatio="xMaxYMax slice">
          <defs>
            <linearGradient id="briefing-mesh" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f6b51d" stopOpacity="0" />
              <stop offset="70%" stopColor="#f6b51d" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#ffd24d" stopOpacity="0.9" />
            </linearGradient>
          </defs>
          {[0, 26, 52, 78, 104, 130, 156].map((d) => (
            <path
              key={d}
              d={`M ${620} ${420} q ${-260 - d} ${-120 - d * 0.5} ${-420 - d} ${-360 - d}`}
              stroke="url(#briefing-mesh)"
              strokeWidth="1.2"
              fill="none"
            />
          ))}
        </svg>
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'radial-gradient(rgb(255 255 255 / 0.8) 1px, transparent 1px)', backgroundSize: '24px 24px' }}
        />
      </div>
    </>
  );
}
