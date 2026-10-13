import React from "react";
import "./ui.css";

/* ==========================================================================
   BAR CHART COMPONENT (SVG-based, 0 dependencies)
   ========================================================================== */

export interface BarChartItem {
  label: string;
  value: number;
  secondaryValue?: number;
  formattedValue?: string;
  color?: string;
  secondaryColor?: string;
}

export interface BarChartProps {
  data: BarChartItem[];
  height?: number;
  primaryLabel?: string;
  secondaryLabel?: string;
  primaryColor?: string;
  secondaryColor?: string;
  className?: string;
  emptyMessage?: string;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  height = 220,
  primaryLabel = "Value",
  secondaryLabel,
  primaryColor = "var(--color-action-green, #2F855A)",
  secondaryColor = "var(--color-primary-forest, #174D35)",
  className = "",
  emptyMessage = "No chart data recorded yet.",
}) => {
  if (!data || data.length === 0) {
    return (
      <div
        style={{
          height: `${height}px`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--color-text-muted)",
          fontSize: "var(--text-xs)",
        }}
      >
        {emptyMessage}
      </div>
    );
  }

  const maxValue = Math.max(
    ...data.flatMap((d) => [d.value, d.secondaryValue || 0]),
    1
  );

  const hasSecondary = Boolean(
    secondaryLabel || data.some((d) => typeof d.secondaryValue === "number")
  );

  const paddingBottom = 32;
  const paddingTop = 20;
  const chartHeight = height - paddingBottom - paddingTop;

  return (
    <div className={`al-chart-container ${className}`} style={{ width: "100%" }}>
      {/* Legend */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: "16px",
          marginBottom: "12px",
          fontSize: "var(--text-xs)",
          color: "var(--color-text-secondary)",
          fontWeight: 600,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "3px",
              background: primaryColor,
              display: "inline-block",
            }}
          />
          <span>{primaryLabel}</span>
        </div>
        {hasSecondary && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "3px",
                background: secondaryColor,
                display: "inline-block",
              }}
            />
            <span>{secondaryLabel}</span>
          </div>
        )}
      </div>

      {/* SVG Bars */}
      <div style={{ width: "100%", overflowX: "auto" }}>
        <svg
          viewBox={`0 0 ${Math.max(data.length * 80, 360)} ${height}`}
          style={{ width: "100%", height: `${height}px`, display: "block" }}
        >
          {/* Subtle grid lines */}
          {[0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = paddingTop + chartHeight * (1 - ratio);
            return (
              <line
                key={ratio}
                x1="0"
                y1={y}
                x2="100%"
                y2={y}
                stroke="var(--color-border-subtle, #EDF2EE)"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
            );
          })}

          {/* Baseline */}
          <line
            x1="0"
            y1={paddingTop + chartHeight}
            x2="100%"
            y2={paddingTop + chartHeight}
            stroke="var(--color-border, #E2E8E4)"
            strokeWidth="1.5"
          />

          {/* Bars */}
          {data.map((item, index) => {
            const totalWidth = Math.max(data.length * 80, 360);
            const slotWidth = totalWidth / data.length;
            const barWidth = hasSecondary ? 18 : 26;
            const centerX = slotWidth * index + slotWidth / 2;

            const h1 = Math.max((item.value / maxValue) * chartHeight, 3);
            const y1 = paddingTop + chartHeight - h1;

            const h2 = item.secondaryValue
              ? Math.max((item.secondaryValue / maxValue) * chartHeight, 3)
              : 0;
            const y2 = paddingTop + chartHeight - h2;

            return (
              <g key={item.label || index}>
                {hasSecondary ? (
                  <>
                    {/* Primary Bar */}
                    <rect
                      x={centerX - barWidth - 2}
                      y={y1}
                      width={barWidth}
                      height={h1}
                      rx="4"
                      fill={item.color || primaryColor}
                    />
                    {/* Secondary Bar */}
                    {item.secondaryValue !== undefined && (
                      <rect
                        x={centerX + 2}
                        y={y2}
                        width={barWidth}
                        height={h2}
                        rx="4"
                        fill={item.secondaryColor || secondaryColor}
                      />
                    )}
                  </>
                ) : (
                  <rect
                    x={centerX - barWidth / 2}
                    y={y1}
                    width={barWidth}
                    height={h1}
                    rx="5"
                    fill={item.color || primaryColor}
                  />
                )}

                {/* X Axis Label */}
                <text
                  x={centerX}
                  y={height - 8}
                  textAnchor="middle"
                  fontSize="11"
                  fill="var(--color-text-secondary, #4A5E53)"
                  fontWeight="500"
                >
                  {item.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

/* ==========================================================================
   DONUT CHART COMPONENT (SVG-based, 0 dependencies)
   ========================================================================== */

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
  formattedValue?: string;
}

export interface DonutChartProps {
  segments: DonutSegment[];
  centerLabel?: string;
  centerValue?: string | number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  segments,
  centerLabel,
  centerValue,
  size = 180,
  strokeWidth = 24,
  className = "",
}) => {
  const total = segments.reduce((sum, s) => sum + Math.max(s.value, 0), 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulated = 0;

  return (
    <div
      className={`al-donut-chart ${className}`}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        gap: "24px",
        flexWrap: "wrap",
      }}
    >
      <div style={{ position: "relative", width: `${size}px`, height: `${size}px` }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Base empty ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="var(--color-surface-muted, #F0F4F1)"
            strokeWidth={strokeWidth}
          />

          {total > 0 &&
            segments.map((seg, idx) => {
              const fraction = seg.value / total;
              const dashLength = fraction * circumference;
              const strokeDashoffset = -accumulated * circumference;
              accumulated += fraction;

              return (
                <circle
                  key={seg.label || idx}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="transparent"
                  stroke={seg.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                  strokeDashoffset={strokeDashoffset}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                  style={{ transition: "stroke-dashoffset 0.4s ease" }}
                />
              );
            })}
        </svg>

        {/* Center label */}
        {(centerLabel || centerValue) && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              pointerEvents: "none",
            }}
          >
            {centerValue && (
              <span
                style={{
                  fontSize: "var(--text-lg)",
                  fontWeight: 800,
                  color: "var(--color-text-primary)",
                  lineHeight: 1.1,
                }}
              >
                {centerValue}
              </span>
            )}
            {centerLabel && (
              <span
                style={{
                  fontSize: "11px",
                  color: "var(--color-text-muted)",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  marginTop: "2px",
                }}
              >
                {centerLabel}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          minWidth: "160px",
        }}
      >
        {segments.map((seg) => {
          const pct = total > 0 ? Math.round((seg.value / total) * 100) : 0;
          return (
            <div
              key={seg.label}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                fontSize: "var(--text-xs)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    backgroundColor: seg.color,
                    flexShrink: 0,
                  }}
                />
                <span style={{ color: "var(--color-text-secondary)", fontWeight: 500 }}>
                  {seg.label}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <strong style={{ color: "var(--color-text-primary)" }}>
                  {seg.formattedValue || seg.value}
                </strong>
                <span
                  style={{
                    color: "var(--color-text-muted)",
                    fontSize: "11px",
                  }}
                >
                  ({pct}%)
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
