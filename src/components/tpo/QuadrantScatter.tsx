"use client";

import { useMemo, useState } from "react";
import type { ReadinessBand, TpoStudentRow } from "@/shared";
import { ACTIVITY_SCORE_CAPTION, ACTIVITY_SCORE_LABEL } from "./activity-score";

/**
 * Performance x Activity scatter - pure SVG, no chart lib. Each dot is a student
 * (x = Activity Score, a weighted engagement COUNT; y = readiness %). Two dividers
 * split the plane into the four quadrants the TPO acts on; click a dot to open the
 * drill-down.
 */

const BAND_DOT: Record<ReadinessBand, string> = {
  READY: "#059669",
  IN_TRAINING: "#f59e0b",
  AT_RISK: "#dc2626",
};

/** The four quadrants, in reading order. `meaning` spells out the split so the key works
 *  even when the plot is too tight to letter each band. */
const QUADRANTS = [
  {
    name: "Excelling",
    meaning: "high activity · ready",
    dot: "bg-emerald-600",
    text: "text-emerald-700",
  },
  {
    name: "Potential",
    meaning: "low activity · ready",
    dot: "bg-sky-600",
    text: "text-sky-700",
  },
  {
    name: "Growing",
    meaning: "high activity · building",
    dot: "bg-amber-500",
    text: "text-amber-700",
  },
  {
    name: "Starting",
    meaning: "low activity · building",
    dot: "bg-red-600",
    text: "text-red-700",
  },
] as const;

const W = 720;
const H = 420;
const PAD = { l: 44, r: 18, t: 18, b: 40 };

/** 95th percentile so a single hyper-active student doesn't squash the axis. */
function p95(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
}

export function QuadrantScatter({
  students,
  partHigh = 15,
  perfHigh = 50,
  onSelect,
}: {
  students: TpoStudentRow[];
  partHigh?: number;
  perfHigh?: number;
  onSelect: (id: string) => void;
}) {
  const [hoverId, setHoverId] = useState<string | null>(null);

  const xMax = useMemo(
    () => Math.max(partHigh * 2, p95(students.map((s) => s.participation))),
    [students, partHigh],
  );

  const x = (p: number) =>
    PAD.l + (Math.min(p, xMax) / (xMax || 1)) * (W - PAD.l - PAD.r);
  const y = (r: number) => PAD.t + (1 - r / 100) * (H - PAD.t - PAD.b);
  const vx = x(partHigh);
  const hy = y(perfHigh);
  // Widest label per side at fontSize 11 (~6.2px per character) plus its inset.
  const LEFT_LABEL_W = "Potential".length * 6.2 + 12;
  const RIGHT_LABEL_W = "Excelling".length * 6.2 + 14;
  const fitsLeft = vx - PAD.l >= LEFT_LABEL_W;
  const fitsRight = W - PAD.r - vx >= RIGHT_LABEL_W;

  const hovered = students.find((s) => s.id === hoverId) ?? null;

  return (
    <div className="space-y-3">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="Performance versus activity scatter plot"
      >
        {/* Quadrant tints */}
        <rect
          x={PAD.l}
          y={PAD.t}
          width={vx - PAD.l}
          height={hy - PAD.t}
          fill="#0284c7"
          opacity={0.05}
        />
        <rect
          x={vx}
          y={PAD.t}
          width={W - PAD.r - vx}
          height={hy - PAD.t}
          fill="#059669"
          opacity={0.06}
        />
        <rect
          x={PAD.l}
          y={hy}
          width={vx - PAD.l}
          height={H - PAD.b - hy}
          fill="#dc2626"
          opacity={0.05}
        />
        <rect
          x={vx}
          y={hy}
          width={W - PAD.r - vx}
          height={H - PAD.b - hy}
          fill="#f59e0b"
          opacity={0.06}
        />

        {/* Dividers */}
        <line
          x1={vx}
          y1={PAD.t}
          x2={vx}
          y2={H - PAD.b}
          stroke="#cbd5e1"
          strokeWidth={1}
          strokeDasharray="4 4"
        />
        <line
          x1={PAD.l}
          y1={hy}
          x2={W - PAD.r}
          y2={hy}
          stroke="#cbd5e1"
          strokeWidth={1}
          strokeDasharray="4 4"
        />

        {/* Axis frame */}
        <line
          x1={PAD.l}
          y1={PAD.t}
          x2={PAD.l}
          y2={H - PAD.b}
          stroke="#e2e8f0"
          strokeWidth={1}
        />
        <line
          x1={PAD.l}
          y1={H - PAD.b}
          x2={W - PAD.r}
          y2={H - PAD.b}
          stroke="#e2e8f0"
          strokeWidth={1}
        />

        {/* Quadrant labels — shared taxonomy with the student panel.
          Excelling = high activity + high performance (top-right);
          Potential = low activity + high performance (top-left);
          Growing = high activity + low performance (bottom-right);
          Starting = low activity + low performance (bottom-left).

          A label is drawn ONLY when its own band is wide enough to hold it. The activity
          threshold is a small absolute number (15) while the axis runs to the cohort's 95th
          percentile (hundreds), so the left band is routinely ~25px wide — narrower than the
          word "Potential", which is how "Potential" and "Excelling" ended up printed on top
          of each other. The legend below names every quadrant whatever the split. */}
        {fitsLeft && (
          <>
            <text
              x={PAD.l + 6}
              y={PAD.t + 14}
              className="fill-sky-600"
              fontSize="11"
              fontWeight="700"
            >
              Potential
            </text>
            <text
              x={PAD.l + 6}
              y={H - PAD.b - 8}
              className="fill-red-600"
              fontSize="11"
              fontWeight="700"
            >
              Starting
            </text>
          </>
        )}
        {fitsRight && (
          <>
            <text
              x={vx + 8}
              y={PAD.t + 14}
              className="fill-emerald-600"
              fontSize="11"
              fontWeight="700"
            >
              Excelling
            </text>
            <text
              x={vx + 8}
              y={H - PAD.b - 8}
              className="fill-amber-600"
              fontSize="11"
              fontWeight="700"
            >
              Growing
            </text>
          </>
        )}

        {/* Axis captions */}
        <text
          x={(W + PAD.l) / 2}
          y={H - 6}
          textAnchor="middle"
          className="fill-slate-400"
          fontSize="11"
        >
          {ACTIVITY_SCORE_LABEL} ({ACTIVITY_SCORE_CAPTION}) →
        </text>
        <text
          x={14}
          y={(H - PAD.b + PAD.t) / 2}
          textAnchor="middle"
          fontSize="11"
          className="fill-slate-400"
          transform={`rotate(-90 14 ${(H - PAD.b + PAD.t) / 2})`}
        >
          Readiness →
        </text>
        {[0, 50, 100].map((r) => (
          <text
            key={r}
            x={PAD.l - 6}
            y={y(r) + 3}
            textAnchor="end"
            fontSize="9"
            className="fill-slate-400"
          >
            {r}
          </text>
        ))}

        {/* Dots */}
        {students.map((s) => {
          const on = s.id === hoverId;
          return (
            <circle
              key={s.id}
              cx={x(s.participation)}
              cy={y(s.readiness)}
              r={on ? 6 : 4}
              fill={BAND_DOT[s.band]}
              opacity={on ? 1 : 0.72}
              stroke={on ? "#0a0a0c" : "white"}
              strokeWidth={on ? 1.5 : 0.5}
              className="cursor-pointer transition-[r]"
              onMouseEnter={() => setHoverId(s.id)}
              onMouseLeave={() =>
                setHoverId((cur) => (cur === s.id ? null : cur))
              }
              onClick={() => onSelect(s.id)}
            >
              <title>{`${s.name ?? s.email} · ${s.readiness}% readiness · ${ACTIVITY_SCORE_LABEL} ${s.participation} (${s.practiceAnswered} practice + 3x${s.mocksCompleted} mocks + 2x${s.codingProblems} coding)`}</title>
            </circle>
          );
        })}

        {/* In-SVG tooltip for the hovered dot */}
        {hovered && (
          <g
            pointerEvents="none"
            transform={`translate(${Math.min(x(hovered.participation) + 10, W - 240)}, ${Math.max(y(hovered.readiness) - 34, PAD.t)})`}
          >
            <rect
              width={230}
              height={30}
              rx={6}
              fill="#0a0a0c"
              opacity={0.92}
            />
            <text x={8} y={13} fontSize="10" fontWeight="700" fill="white">
              {hovered.name ?? hovered.email}
            </text>
            <text
              x={8}
              y={24}
              fontSize="9"
              fill="#cbd5e1"
            >{`${hovered.readiness}% readiness · ${ACTIVITY_SCORE_LABEL} ${hovered.participation}`}</text>
          </g>
        )}
      </svg>
      {/* Always-visible key: the in-plot labels disappear whenever a band is too narrow
          for them, so the four quadrant names have to live somewhere that cannot collide. */}
      <ul
        className="flex flex-wrap gap-x-5 gap-y-1.5"
        aria-label="Quadrant key"
      >
        {QUADRANTS.map((q) => (
          <li
            key={q.name}
            className="flex items-center gap-1.5 text-xs text-slate-500"
          >
            <span aria-hidden className={`size-2 rounded-full ${q.dot}`} />
            <span className={`font-semibold ${q.text}`}>{q.name}</span>
            <span className="text-slate-400">{q.meaning}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
