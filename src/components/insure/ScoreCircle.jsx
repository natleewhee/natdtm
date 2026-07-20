import { useEffect, useRef, useState } from "react";
import { getBandColor } from '@/lib/insure/engine/scorer';

const RADIUS = 80;
const STROKE = 10;
const SIZE = (RADIUS + STROKE) * 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

export default function ScoreCircle({ score, band, isEstimated, animate = true }) {
  const [displayScore, setDisplayScore] = useState(animate ? 0 : score);
  const [arcProgress, setArcProgress] = useState(animate ? 0 : score / 100);
  const [labelVisible, setLabelVisible] = useState(!animate);
  const rafRef = useRef(null);
  const colors = getBandColor(band?.color);

  useEffect(() => {
    if (!animate) return;
    const duration = 1500;
    const start = performance.now();

    const labelTimer = setTimeout(() => setLabelVisible(true), 1200);

    function tick(now) {
      const t = Math.min((now - start) / duration, 1);
      const eased = easeOutCubic(t);
      setDisplayScore(Math.round(eased * score));
      setArcProgress(eased * score / 100);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(labelTimer);
    };
  }, [score, animate]);

  const dashOffset = CIRCUMFERENCE * (1 - arcProgress);

  return (
    <div
      role="img"
      aria-label={`Insurance score: ${score} out of 100. ${band?.label ?? ""}.`}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "12px",
      }}
    >
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        style={{ overflow: "visible" }}
      >
        {/* Background track */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={STROKE}
        />
        {/* Coloured arc */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={colors.arc}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          style={{ transition: animate ? "none" : "stroke-dashoffset 0.6s ease-out" }}
        />
        {/* Score number */}
        <text
          x={SIZE / 2}
          y={SIZE / 2 - 8}
          textAnchor="middle"
          dominantBaseline="central"
          style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontSize: "48px",
            fontWeight: "400",
            fill: "#0F2D6B",
          }}
        >
          {isEstimated ? "~" : ""}{displayScore}
        </text>
        {/* /100 label */}
        <text
          x={SIZE / 2}
          y={SIZE / 2 + 30}
          textAnchor="middle"
          style={{
            fontFamily: "'DM Sans', system-ui, sans-serif",
            fontSize: "13px",
            fill: "#9CA3AF",
          }}
        >
          out of 100
        </text>
      </svg>

      {/* Band label */}
      <div
        style={{
          opacity: labelVisible ? 1 : 0,
          transform: labelVisible ? "translateY(0)" : "translateY(6px)",
          transition: "opacity 0.4s ease, transform 0.4s ease",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "4px",
        }}
      >
        <span
          style={{
            display: "inline-block",
            padding: "4px 14px",
            borderRadius: "100px",
            background: colors.bg,
            color: colors.text,
            fontFamily: "'DM Sans', system-ui, sans-serif",
            fontSize: "14px",
            fontWeight: "500",
          }}
        >
          {band?.label}
        </span>
        {isEstimated && (
          <span
            style={{
              fontFamily: "'DM Sans', system-ui, sans-serif",
              fontSize: "12px",
              color: "#9CA3AF",
            }}
          >
            estimated score
          </span>
        )}
      </div>
    </div>
  );
}
