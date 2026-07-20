import { useState } from "react";
import { getSeverityStyle } from '@/lib/insure/engine/scorer';

const TRUNCATE_AT = 120;

export default function InsightCard({ card, index = 0 }) {
  const [expanded, setExpanded] = useState(false);
  const style = getSeverityStyle(card.severity);
  const shouldTruncate = card.body.length > TRUNCATE_AT && !expanded;
  const bodyText = shouldTruncate
    ? card.body.slice(0, TRUNCATE_AT).trimEnd() + "…"
    : card.body;

  return (
    <div
      style={{
        background: style.bg,
        borderRadius: "12px",
        borderLeft: `4px solid ${style.border}`,
        padding: "16px 16px 16px 20px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        animation: "fadeSlideUp 0.4s ease both",
        animationDelay: `${index * 80}ms`,
      }}
    >
      {/* Header row: pill label + title */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", flexWrap: "wrap" }}>
        <span style={{
          flexShrink: 0,
          display: "inline-block",
          padding: "2px 10px",
          borderRadius: "100px",
          background: style.pillBg,
          color: style.pillText,
          fontSize: "11px",
          fontWeight: "700",
          fontFamily: "'DM Sans', system-ui, sans-serif",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          marginTop: "2px",
          border: style.pillText === "#fff" ? "none" : `1px solid ${style.border}`,
        }}>
          {style.pillLabel}
        </span>
        <p style={{
          margin: 0,
          fontFamily: "'DM Sans', system-ui, sans-serif",
          fontSize: "15px",
          fontWeight: "600",
          color: "#0F2D6B",
          lineHeight: 1.4,
          flex: 1,
        }}>
          {card.title}
        </p>
      </div>

      {/* Body */}
      <p style={{
        margin: 0,
        fontFamily: "'DM Sans', system-ui, sans-serif",
        fontSize: "14px",
        color: "#374151",
        lineHeight: 1.6,
      }}>
        {bodyText}
        {card.body.length > TRUNCATE_AT && (
          <button
            onClick={() => setExpanded(e => !e)}
            style={{
              background: "none",
              border: "none",
              padding: "0 0 0 4px",
              color: style.border,
              fontFamily: "'DM Sans', system-ui, sans-serif",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "pointer",
            }}
          >
            {expanded ? "Show less" : "Read more"}
          </button>
        )}
      </p>

      {/* Action nudge */}
      {card.action && (
        <p style={{
          margin: 0,
          fontFamily: "'DM Sans', system-ui, sans-serif",
          fontSize: "13px",
          color: "#6B7280",
          lineHeight: 1.5,
        }}>
          {card.action}
        </p>
      )}
    </div>
  );
}