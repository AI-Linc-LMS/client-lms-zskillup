import { CERTIFICATE_TIERS, type CertificateTier } from '@/shared/certificate-tiers';

/**
 * Per-tier visual theme for the certificate. The 7 tiers escalate in prestige:
 * tiers 1-3 (Learning) are light, refined and academic; tiers 4-7 (Placement)
 * are dark, premium and increasingly ornate - bronze → platinum → gold → grand
 * gold - so a higher achievement visibly reads as more prestigious.
 */
export interface CertTheme extends CertificateTier {
  /** Dark premium canvas (light ink) vs light academic canvas (dark ink). */
  dark: boolean;
  /** CSS background for the page. */
  bg: string;
  /** Primary + secondary text colors. */
  ink: string;
  sub: string;
  faint: string;
  /** Accent (headings, rules) + its deeper shade (foil edge). */
  accent: string;
  accentDeep: string;
  /** Metallic tone for the seal + ornaments. */
  metal: string;
  metalDeep: string;
  metalInk: string;
  /** Frame line color + the guilloché pattern stroke. */
  frame: string;
  pattern: string;
  /** Metal label, e.g. "Gold" - shown as the seal ribbon. */
  metalLabel: string;
}

const T = (n: number) => CERTIFICATE_TIERS.find((t) => t.tier === n) as CertificateTier;

export const CERT_THEMES: Record<number, CertTheme> = {
  1: {
    ...T(1), dark: false, metalLabel: 'Sapphire',
    bg: 'radial-gradient(120% 140% at 50% 0%, #ffffff 0%, #f5f8ff 55%, #eef3fb 100%)',
    ink: '#152238', sub: '#5a6b86', faint: '#9fb0c9',
    accent: '#2f6bd8', accentDeep: '#1d4ed8',
    metal: '#3b82f6', metalDeep: '#1d4ed8', metalInk: '#ffffff',
    frame: '#bcd3f5', pattern: '#3b82f6',
  },
  2: {
    ...T(2), dark: false, metalLabel: 'Emerald',
    bg: 'radial-gradient(120% 140% at 50% 0%, #ffffff 0%, #f2fbf8 55%, #e6f6f1 100%)',
    ink: '#0f2b26', sub: '#4f7169', faint: '#93c1b6',
    accent: '#0d9488', accentDeep: '#0f766e',
    metal: '#10b981', metalDeep: '#0f766e', metalInk: '#ffffff',
    frame: '#a7e3d6', pattern: '#0d9488',
  },
  3: {
    ...T(3), dark: false, metalLabel: 'Amethyst',
    bg: 'radial-gradient(120% 140% at 50% 0%, #ffffff 0%, #f9f6ff 55%, #f1ebfe 100%)',
    ink: '#241748', sub: '#63558a', faint: '#b3a3e0',
    accent: '#7c3aed', accentDeep: '#6d28d9',
    metal: '#8b5cf6', metalDeep: '#6d28d9', metalInk: '#ffffff',
    frame: '#d3c4fb', pattern: '#7c3aed',
  },
  4: {
    ...T(4), dark: true, metalLabel: 'Bronze',
    bg: 'radial-gradient(130% 150% at 50% -10%, #23324f 0%, #16223f 45%, #0a0a0c 100%)',
    ink: '#f6f8fc', sub: '#aebbd2', faint: '#4a5c7a',
    accent: '#f0a844', accentDeep: '#c77d1e',
    metal: '#c98a3c', metalDeep: '#8a5a1e', metalInk: '#fff5e2',
    frame: '#3a4c6d', pattern: '#f0a844',
  },
  5: {
    ...T(5), dark: true, metalLabel: 'Platinum',
    bg: 'radial-gradient(130% 150% at 50% -10%, #29354a 0%, #1a2436 45%, #0c1220 100%)',
    ink: '#f7fafc', sub: '#b7c2d6', faint: '#5d6b83',
    accent: '#8fd0f2', accentDeep: '#4aa3d4',
    metal: '#d8e0ec', metalDeep: '#9aa8bf', metalInk: '#1a2436',
    frame: '#3d4a63', pattern: '#8fd0f2',
  },
  6: {
    ...T(6), dark: true, metalLabel: 'Gold',
    bg: 'radial-gradient(130% 150% at 50% -10%, #2a241d 0%, #1a1512 45%, #0c0a09 100%)',
    ink: '#fbf7ee', sub: '#c9bda6', faint: '#6b5f4a',
    accent: '#eec24a', accentDeep: '#c69524',
    metal: '#e9c25a', metalDeep: '#a9801f', metalInk: '#2a2010',
    frame: '#4a3f2a', pattern: '#eec24a',
  },
  7: {
    ...T(7), dark: true, metalLabel: 'Grand Gold',
    bg: 'radial-gradient(130% 150% at 50% -12%, #2c2417 0%, #191308 45%, #000000 100%)',
    ink: '#fdf8ea', sub: '#d6c8a4', faint: '#7a6a45',
    accent: '#f5cf5a', accentDeep: '#caa02e',
    metal: '#f3d06a', metalDeep: '#b98d22', metalInk: '#281d07',
    frame: '#57492b', pattern: '#f5cf5a',
  },
};

export function themeForTier(tier: number): CertTheme {
  return CERT_THEMES[tier] ?? CERT_THEMES[1];
}
