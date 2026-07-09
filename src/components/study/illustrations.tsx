/**
 * Branded inline-SVG illustrations for the Study Plan. Self-contained (no external
 * assets), theme-consistent (navy #1e3a8a / orange #f37021 + sky / violet / emerald
 * accents). `RoadmapJourney` reads on the dark navy hero; `CalibrationScope` reads
 * on light. Purely decorative — always aria-hidden.
 */

/** The winding road to the summit — the roadmap-as-journey. For dark backgrounds. */
export function RoadmapJourney({ className }: { className?: string }) {
  const road = 'M18,168 C70,158 44,120 96,116 C140,113 150,86 176,74 C196,64 206,58 214,52';
  return (
    <svg viewBox="0 0 260 180" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <linearGradient id="rj-road" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#31456f" />
          <stop offset="1" stopColor="#5b76b8" />
        </linearGradient>
        <linearGradient id="rj-flag" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffb877" />
          <stop offset="1" stopColor="#f37021" />
        </linearGradient>
        <radialGradient id="rj-sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffb877" stopOpacity="0.85" />
          <stop offset="1" stopColor="#ffb877" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="210" cy="46" r="48" fill="url(#rj-sun)" />
      <circle cx="60" cy="58" r="40" fill="#38bdf8" opacity="0.08" />
      {[
        [40, 30],
        [95, 22],
        [150, 40],
        [188, 92],
        [30, 104],
        [232, 112],
        [124, 30],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 2 ? 1.5 : 1} fill="#fff" opacity="0.5" />
      ))}
      {/* summit + sun */}
      <path d="M148,152 Q206,118 252,152 L252,182 L148,182 Z" fill="#1c294a" />
      <circle cx="210" cy="46" r="14" fill="url(#rj-flag)" />
      {/* road */}
      <path d={road} stroke="url(#rj-road)" strokeWidth="17" strokeLinecap="round" />
      <path d={road} stroke="#dbe4ff" strokeWidth="2" strokeLinecap="round" strokeDasharray="0.5 11" opacity="0.55" />
      {/* milestones */}
      {[
        [96, 116, '#38bdf8'],
        [158, 86, '#f37021'],
        [205, 58, '#a78bfa'],
      ].map(([x, y, c], i) => (
        <g key={i}>
          <circle cx={x as number} cy={y as number} r="7.5" fill={c as string} opacity="0.25" />
          <circle cx={x as number} cy={y as number} r="4.5" fill={c as string} stroke="#0b1220" strokeWidth="1.5" />
        </g>
      ))}
      {/* summit flag */}
      <rect x="213" y="28" width="2.4" height="27" rx="1.2" fill="#fff" />
      <path d="M215.4,29 L231,33.5 L215.4,38.5 Z" fill="url(#rj-flag)" />
      {/* start marker */}
      <circle cx="18" cy="168" r="7" fill="#f37021" opacity="0.25" />
      <circle cx="18" cy="168" r="4" fill="#f37021" stroke="#0b1220" strokeWidth="1.5" />
    </svg>
  );
}

/** A radar/scope calibrating skill blips — for the "take calibration" state. Light bg. */
export function CalibrationScope({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <linearGradient id="cs-sweep" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f37021" stopOpacity="0.32" />
          <stop offset="1" stopColor="#f37021" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[80, 58, 36].map((r, i) => (
        <circle
          key={i}
          cx="100"
          cy="100"
          r={r}
          stroke="#1e3a8a"
          strokeOpacity={0.14 + i * 0.05}
          strokeWidth="1.5"
          strokeDasharray={i === 0 ? '3 6' : undefined}
        />
      ))}
      <line x1="100" y1="16" x2="100" y2="184" stroke="#1e3a8a" strokeOpacity="0.09" />
      <line x1="16" y1="100" x2="184" y2="100" stroke="#1e3a8a" strokeOpacity="0.09" />
      <path d="M100,100 L100,20 A80,80 0 0 1 168,138 Z" fill="url(#cs-sweep)" />
      <line x1="100" y1="100" x2="168" y2="138" stroke="#f37021" strokeWidth="2.5" strokeLinecap="round" />
      {[
        [70, 72, '#38bdf8'],
        [132, 82, '#f37021'],
        [114, 140, '#a78bfa'],
        [64, 122, '#34d399'],
      ].map(([x, y, c], i) => (
        <g key={i}>
          <circle cx={x as number} cy={y as number} r="8" fill={c as string} opacity="0.18" />
          <circle cx={x as number} cy={y as number} r="4.5" fill={c as string} />
        </g>
      ))}
      <circle cx="100" cy="100" r="12" stroke="#1e3a8a" strokeOpacity="0.3" strokeWidth="1.5" />
      <circle cx="100" cy="100" r="5.5" fill="#1e3a8a" />
    </svg>
  );
}

/** Small per-phase glyph for the roadmap phase headers. */
export function PhaseGlyph({ phase, className }: { phase: 'foundation' | 'practice' | 'interview'; className?: string }) {
  if (phase === 'foundation') {
    // stacked base blocks
    return (
      <svg viewBox="0 0 40 40" className={className} fill="none" aria-hidden>
        <rect x="8" y="24" width="24" height="7" rx="1.5" fill="currentColor" opacity="0.9" />
        <rect x="11" y="15" width="18" height="7" rx="1.5" fill="currentColor" opacity="0.6" />
        <rect x="14" y="6" width="12" height="7" rx="1.5" fill="currentColor" opacity="0.35" />
      </svg>
    );
  }
  if (phase === 'practice') {
    // target
    return (
      <svg viewBox="0 0 40 40" className={className} fill="none" aria-hidden>
        <circle cx="20" cy="20" r="14" stroke="currentColor" strokeWidth="2.5" opacity="0.35" />
        <circle cx="20" cy="20" r="8" stroke="currentColor" strokeWidth="2.5" opacity="0.6" />
        <circle cx="20" cy="20" r="2.6" fill="currentColor" />
      </svg>
    );
  }
  // trophy / summit star
  return (
    <svg viewBox="0 0 40 40" className={className} fill="none" aria-hidden>
      <path d="M20 6l3.4 6.9 7.6 1.1-5.5 5.4 1.3 7.6L20 30.8l-6.8 3.6 1.3-7.6L9 21.4l7.6-1.1L20 6z" fill="currentColor" opacity="0.85" />
    </svg>
  );
}
