import { forwardRef } from 'react';
import type { CertTheme } from '@/lib/certificates/themes';

/** Native A4-landscape pixel canvas (√2 ratio). Rendered at this fixed size for a
 *  crisp PDF capture; callers scale it down for display with a CSS transform. */
export const CERT_W = 1000;
export const CERT_H = 707;

export interface CertificateData {
  theme: CertTheme;
  holderName: string;
  /** ZS-XX-XXXXXXXX (or a placeholder for a locked preview). */
  certificateId: string;
  /** ISO date, or null for a not-yet-issued preview. */
  issuedAt: string | null;
  /** XP to print ("Awarded at N XP"). */
  xp: number;
  /** Origin for the verify URL (defaults to the current one at render). */
  verifyBase?: string;
}

const serif = 'var(--font-instrument), Georgia, serif';
const display = 'var(--font-bricolage), var(--font-jakarta), sans-serif';
const sans = 'var(--font-jakarta), ui-sans-serif, system-ui, sans-serif';

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

/** Concentric-rosette guilloché — the security-paper look. Density scales with prestige. */
function Guilloche({ color, prestige }: { color: string; prestige: number }) {
  const rings = 6 + prestige * 3;
  const opacity = prestige >= 4 ? 0.1 : 0.06;
  return (
    <svg
      className="pointer-events-none absolute inset-0"
      width={CERT_W}
      height={CERT_H}
      viewBox={`0 0 ${CERT_W} ${CERT_H}`}
      aria-hidden
      style={{ opacity }}
    >
      <g fill="none" stroke={color} strokeWidth={0.6}>
        {Array.from({ length: rings }).map((_, i) => {
          const rx = 120 + i * 26;
          const ry = 78 + i * 17;
          return <ellipse key={`c${i}`} cx={CERT_W / 2} cy={CERT_H / 2} rx={rx} ry={ry} transform={`rotate(${i * 9} ${CERT_W / 2} ${CERT_H / 2})`} />;
        })}
      </g>
    </svg>
  );
}

/** A corner flourish for the frame (mirrored via scale). Richer for high prestige. */
function Corner({ color, deep, prestige }: { color: string; deep: string; prestige: number }) {
  return (
    <g fill="none" stroke={color} strokeWidth={1.4} strokeLinecap="round">
      <path d="M0 34 C 0 14, 14 0, 34 0" stroke={deep} strokeWidth={2} />
      <path d="M8 40 C 8 20, 20 8, 40 8" />
      {prestige >= 4 && <path d="M16 46 C 16 28, 28 16, 46 16" strokeWidth={1} />}
      <circle cx={12} cy={12} r={2.4} fill={deep} stroke="none" />
      {prestige >= 6 && (
        <path d="M2 62 q 10 -6 12 -18 q 2 12 18 12 q -12 2 -12 18 q -2 -14 -18 -12 Z" fill={color} stroke="none" opacity={0.9} />
      )}
    </g>
  );
}

/** One laurel branch (curves up from the base with leaves). Mirror with scaleX. */
function LaurelBranch({ color }: { color: string }) {
  const leaves = Array.from({ length: 7 });
  return (
    <g stroke={color} fill={color}>
      <path d="M0 44 C -10 30, -14 16, -12 0" fill="none" strokeWidth={2.4} />
      {leaves.map((_, i) => {
        const t = i / (leaves.length - 1);
        const x = -12 * (1 - t) - 12 * t * 0.2;
        const y = 44 - t * 44;
        return (
          <ellipse
            key={i}
            cx={x - 6}
            cy={y}
            rx={6.5}
            ry={2.8}
            transform={`rotate(${-50 + t * 20} ${x - 6} ${y})`}
            opacity={0.95}
          />
        );
      })}
    </g>
  );
}

/** The wax-seal medallion: metal ring, tier code, star, ribbon + laurels (placement tiers). */
function Seal({ theme, size = 132 }: { theme: CertTheme; size?: number }) {
  const { metal, metalDeep, metalInk, tier, code, metalLabel } = theme;
  const c = size / 2;
  const gid = `seal-metal-${tier}`;
  const placement = tier >= 4;
  return (
    <svg width={size} height={size + 26} viewBox={`0 0 ${size} ${size + 26}`} aria-hidden>
      <defs>
        <radialGradient id={gid} cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={0.9} />
          <stop offset="30%" stopColor={metal} />
          <stop offset="100%" stopColor={metalDeep} />
        </radialGradient>
      </defs>

      {placement && (
        <>
          <g transform={`translate(${c - 40}, ${c + 30})`}><LaurelBranch color={metal} /></g>
          <g transform={`translate(${c + 40}, ${c + 30}) scale(-1,1)`}><LaurelBranch color={metal} /></g>
        </>
      )}

      {/* scalloped outer edge for high prestige */}
      {tier >= 6 &&
        Array.from({ length: 28 }).map((_, i) => {
          const a = (i / 28) * Math.PI * 2;
          return <circle key={i} cx={c + Math.cos(a) * (c - 8)} cy={c + Math.sin(a) * (c - 8)} r={4} fill={metalDeep} />;
        })}

      <circle cx={c} cy={c} r={c - 12} fill={`url(#${gid})`} stroke={metalDeep} strokeWidth={2} />
      {/* flat inner disc: gives the center text a consistent, non-washed ground */}
      <circle cx={c} cy={c} r={c - 24} fill={metal} />
      <circle cx={c} cy={c} r={c - 22} fill="none" stroke={metalInk} strokeWidth={1} strokeDasharray="1 4" opacity={0.55} />

      {/* star */}
      <path
        d={starPath(c, c - 26, 9)}
        fill={metalInk}
        opacity={0.9}
      />
      <text x={c} y={c + 10} textAnchor="middle" fontFamily={display} fontWeight={800} fontSize={26} fill={metalInk} letterSpacing="1">
        {code}
      </text>
      <text x={c} y={c + 30} textAnchor="middle" fontFamily={sans} fontWeight={700} fontSize={8} fill={metalInk} letterSpacing="2" opacity={0.85}>
        CERTIFIED
      </text>

      {/* ribbon */}
      <g>
        <rect x={c - 46} y={size - 12} width={92} height={22} rx={3} fill={metalDeep} />
        <path d={`M${c - 46} ${size + 10} l -10 16 l 16 -6 Z`} fill={metalDeep} opacity={0.8} />
        <path d={`M${c + 46} ${size + 10} l 10 16 l -16 -6 Z`} fill={metalDeep} opacity={0.8} />
        <text x={c} y={size + 3} textAnchor="middle" fontFamily={sans} fontWeight={800} fontSize={10} fill={metalInk} letterSpacing="2">
          {metalLabel.toUpperCase()}
        </text>
      </g>
    </svg>
  );
}

function starPath(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.44;
    pts.push(`${cx + Math.cos(a) * rad},${cy + Math.sin(a) * rad}`);
  }
  return `M${pts.join('L')}Z`;
}

/**
 * A single, print-ready certificate. Parametric across all 7 tiers — the same
 * elegant layout, with ornamentation (guilloché, frame flourishes, laurel seal)
 * escalating by prestige so higher tiers look richer.
 */
export const Certificate = forwardRef<HTMLDivElement, CertificateData>(function Certificate(
  { theme, holderName, certificateId, issuedAt, xp, verifyBase },
  ref,
) {
  const t = theme;
  const base =
    verifyBase ?? (typeof window !== 'undefined' ? window.location.origin : 'https://zskillup.com');
  const bandLabel = t.tier <= 3 ? 'LEARNING' : 'PLACEMENT';
  // Shrink the honoree name for longer names so it always stays on one line and
  // never pushes the footer/seal past the fixed 707px canvas.
  const n = holderName.length;
  const nameSize = n > 30 ? 38 : n > 24 ? 44 : n > 18 ? 52 : 62;

  return (
    <div
      ref={ref}
      style={{
        width: CERT_W,
        height: CERT_H,
        background: t.bg,
        color: t.ink,
        fontFamily: sans,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Guilloche color={t.pattern} prestige={t.tier} />

      {/* Double frame */}
      <div style={{ position: 'absolute', inset: 26, border: `2px solid ${t.accentDeep}`, borderRadius: 4 }} />
      <div style={{ position: 'absolute', inset: 33, border: `1px solid ${t.frame}`, borderRadius: 2 }} />

      {/* Corner flourishes */}
      {(
        [
          [40, 40, 1, 1],
          [CERT_W - 40, 40, -1, 1],
          [40, CERT_H - 40, 1, -1],
          [CERT_W - 40, CERT_H - 40, -1, -1],
        ] as const
      ).map(([x, y, sx, sy], i) => (
        <svg key={i} style={{ position: 'absolute', left: x - (sx === 1 ? 0 : 64), top: y - (sy === 1 ? 0 : 64) }} width={64} height={64} viewBox="0 0 64 64">
          <g transform={`scale(${sx},${sy}) translate(${sx === 1 ? 0 : -64}, ${sy === 1 ? 0 : -64})`}>
            <Corner color={t.accent} deep={t.accentDeep} prestige={t.tier} />
          </g>
        </svg>
      ))}

      {/* Content */}
      <div style={{ position: 'absolute', inset: 33, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '38px 70px 30px', textAlign: 'center' }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ display: 'grid', placeItems: 'center', width: 30, height: 30, borderRadius: 8, background: t.accent, color: t.dark ? '#1b1408' : '#fff', fontFamily: display, fontWeight: 800, fontSize: 18 }}>Z</span>
          <span style={{ fontFamily: display, fontWeight: 800, letterSpacing: 6, fontSize: 15, color: t.ink }}>ZSKILLUP</span>
        </div>

        <div style={{ marginTop: 20, fontSize: 12, letterSpacing: 6, color: t.accent, fontWeight: 700 }}>
          CERTIFICATE OF {bandLabel}
        </div>

        <div style={{ fontFamily: display, fontWeight: 800, fontSize: 44, lineHeight: 1.05, marginTop: 8, color: t.ink }}>
          {t.shortName}
        </div>

        <div style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 17, color: t.sub, marginTop: 16 }}>
          This certificate is proudly presented to
        </div>

        {/* Holder */}
        <div style={{ fontFamily: serif, fontSize: nameSize, lineHeight: 1.15, color: t.accentDeep, marginTop: 6, maxWidth: 840, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {holderName}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
          <span style={{ width: 120, height: 1, background: t.frame }} />
          <span style={{ width: 7, height: 7, transform: 'rotate(45deg)', background: t.accent }} />
          <span style={{ width: 120, height: 1, background: t.frame }} />
        </div>

        <div style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 16, color: t.sub, marginTop: 14, maxWidth: 560 }}>
          in recognition of dedication and achievement {t.tagline} on the ZSkillup placement platform.
        </div>

        {/* Meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 26, marginTop: 18 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: t.ink, border: `1px solid ${t.frame}`, borderRadius: 999, padding: '6px 14px' }}>
            <span style={{ color: t.accent }}>◆</span> {xp.toLocaleString()} XP achieved
          </span>
          <span style={{ fontSize: 13, color: t.sub }}>Issued&nbsp; <strong style={{ color: t.ink }}>{fmtDate(issuedAt)}</strong></span>
        </div>

        {/* Footer: signature · seal · verify */}
        <div style={{ marginTop: 'auto', width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ textAlign: 'center', width: 200 }}>
            <div style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 26, color: t.ink, lineHeight: 1 }}>ZSkillup</div>
            <div style={{ height: 1, background: t.frame, margin: '6px 0' }} />
            <div style={{ fontSize: 10, letterSpacing: 2, color: t.sub, fontWeight: 700 }}>ISSUING AUTHORITY</div>
          </div>

          <div style={{ transform: 'translateY(6px)' }}>
            <Seal theme={t} />
          </div>

          <div style={{ textAlign: 'center', width: 200 }}>
            <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13, fontWeight: 700, color: t.ink, letterSpacing: 1 }}>{certificateId}</div>
            <div style={{ height: 1, background: t.frame, margin: '6px 0' }} />
            <div style={{ fontSize: 10, letterSpacing: 1.5, color: t.sub, fontWeight: 600 }}>VERIFY AT {base.replace(/^https?:\/\//, '').toUpperCase()}/VERIFY</div>
          </div>
        </div>
      </div>
    </div>
  );
});
