import React from "react";

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  className?: string;
  color?: string;
  secondaryColor?: string;
}

/* ==========================================================================
   FEATURE HUB & OPERATIONAL ICONS
   ========================================================================== */

/** Land & Field Parcel Icon */
export const LandParcelIcon: React.FC<IconProps> = ({
  size = 28,
  className = "",
  color = "#174D35",
  secondaryColor = "#2F855A",
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <path
      d="M3 17L9 6L14 12L21 4V19C21 19.5523 20.5523 20 20 20H4C3.44772 20 3 19.5523 3 19V17Z"
      fill={secondaryColor}
      fillOpacity="0.18"
    />
    <path
      d="M3 18L8.5 7.5L14 13.5L21 5M21 5H16M21 5V10M3 20H21"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="8" cy="16" r="1.5" fill={color} />
    <circle cx="15" cy="17" r="1.5" fill={color} />
  </svg>
);

/** Crop Season / Cycles Icon */
export const CropSeasonIcon: React.FC<IconProps> = ({
  size = 28,
  className = "",
  color = "#2F855A",
  secondaryColor = "#84CC16",
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <path
      d="M12 21V10M12 10C12 7 9.5 4 6 4C6 8 8.5 10 12 10ZM12 10C12 7 14.5 4 18 4C18 8 15.5 10 12 10ZM12 15C10 13 8 13 6 14C7 16 9 17 12 16ZM12 15C14 13 16 13 18 14C17 16 15 17 12 16Z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={secondaryColor}
      fillOpacity="0.22"
    />
  </svg>
);

/** Harvest Yields Icon */
export const HarvestYieldIcon: React.FC<IconProps> = ({
  size = 28,
  className = "",
  color = "#D97706",
  secondaryColor = "#F59E0B",
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <path
      d="M5 19C5 14 7 8 12 4C17 8 19 14 19 19C19 20.6569 17.6569 22 16 22H8C6.34315 22 5 20.6569 5 19Z"
      fill={secondaryColor}
      fillOpacity="0.2"
      stroke={color}
      strokeWidth="2"
    />
    <path
      d="M12 4V22M8 12C9.5 11 11 11 12 12M12 12C13 11 14.5 11 16 12M7.5 16C9 15 11 15 12 16M12 16C13 15 15 15 16.5 16"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

/** Mandi Produce Auction & Market Sale Icon */
export const MarketAuctionIcon: React.FC<IconProps> = ({
  size = 28,
  className = "",
  color = "#15803D",
  secondaryColor = "#22C55E",
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <path
      d="M12 3V21M3 8L12 5L21 8M3 8L6 14M3 8H9M6 14C4.5 14 3.5 13 3.5 13L6 14ZM6 14H9M21 8L18 14M21 8H15M18 14H15M18 14C19.5 14 20.5 13 20.5 13L18 14ZM9 21H15"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M6 14C6 15.6569 4.65685 17 3 17H9C7.34315 17 6 15.6569 6 14ZM18 14C18 15.6569 16.6569 17 15 17H21C19.3431 17 18 15.6569 18 14Z"
      fill={secondaryColor}
      fillOpacity="0.25"
    />
  </svg>
);

/** Field Visit & Agronomy Consultation Icon */
export const FieldVisitIcon: React.FC<IconProps> = ({
  size = 28,
  className = "",
  color = "#0D9488",
  secondaryColor = "#2DD4BF",
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <rect
      x="4"
      y="5"
      width="16"
      height="16"
      rx="2"
      fill={secondaryColor}
      fillOpacity="0.18"
      stroke={color}
      strokeWidth="2"
    />
    <path d="M16 3V7M8 3V7M4 11H20" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <circle cx="12" cy="15" r="2.5" stroke={color} strokeWidth="1.8" />
    <path d="M14 17L17 20" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/** Settlements & Net Realization Icon */
export const SettlementLedgerIcon: React.FC<IconProps> = ({
  size = 28,
  className = "",
  color = "#4338CA",
  secondaryColor = "#818CF8",
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <path
      d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z"
      fill={secondaryColor}
      fillOpacity="0.18"
      stroke={color}
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path d="M14 2V8H20M16 13H8M16 17H8M10 9H8" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/** Bank Payments & Disbursals Icon */
export const PaymentReceiptIcon: React.FC<IconProps> = ({
  size = 28,
  className = "",
  color = "#047857",
  secondaryColor = "#34D399",
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <rect
      x="3"
      y="5"
      width="18"
      height="14"
      rx="3"
      fill={secondaryColor}
      fillOpacity="0.2"
      stroke={color}
      strokeWidth="2"
    />
    <path d="M3 10H21M7 15H9" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <circle cx="16" cy="15" r="1.5" fill={color} />
  </svg>
);

/** Field Labour Expenses Icon */
export const LabourExpenseIcon: React.FC<IconProps> = ({
  size = 28,
  className = "",
  color = "#B45309",
  secondaryColor = "#FBBF24",
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <path
      d="M17 21V19C17 17.9 16.1 17 15 17H9C7.9 17 7 17.9 7 19V21M12 13C14.2091 13 16 11.2091 16 9C16 6.79086 14.2091 5 12 5C9.79086 5 8 6.79086 8 9C8 11.2091 9.79086 13 12 13Z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 2C10.5 2 9 3 9 4.5H15C15 3 13.5 2 12 2Z"
      fill={secondaryColor}
      stroke={color}
      strokeWidth="1.5"
    />
  </svg>
);

/** Seeds & Input Inventory Icon */
export const SeedProductIcon: React.FC<IconProps> = ({
  size = 28,
  className = "",
  color = "#15803D",
  secondaryColor = "#4ADE80",
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <path
      d="M12 2C6.5 2 3 6.5 3 12C3 17.5 7.5 22 13 22C18.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2Z"
      fill={secondaryColor}
      fillOpacity="0.2"
      stroke={color}
      strokeWidth="2"
    />
    <path d="M12 2C12 7 9 12 3 12M12 22C12 17 15 12 21 12" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/** Pesticide & Crop Care Icon */
export const PesticideSprayIcon: React.FC<IconProps> = ({
  size = 28,
  className = "",
  color = "#B91C1C",
  secondaryColor = "#F87171",
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <rect
      x="6"
      y="8"
      width="12"
      height="13"
      rx="3"
      fill={secondaryColor}
      fillOpacity="0.18"
      stroke={color}
      strokeWidth="2"
    />
    <path d="M10 8V5C10 4.4 10.4 4 11 4H13C13.6 4 14 4.4 14 5V8M8 4H16M6 13H18" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <circle cx="12" cy="17" r="1.5" fill={color} />
  </svg>
);

/** Fertilizer Nutrient Bag Icon */
export const FertilizerBagIcon: React.FC<IconProps> = ({
  size = 28,
  className = "",
  color = "#047857",
  secondaryColor = "#6EE7B7",
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <path
      d="M5 8L8 3H16L19 8V20C19 21.1 18.1 22 17 22H7C5.9 22 5 21.1 5 20V8Z"
      fill={secondaryColor}
      fillOpacity="0.22"
      stroke={color}
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="13" r="3" stroke={color} strokeWidth="1.8" />
    <path d="M12 11V15M10 13H14" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

/* ==========================================================================
   CROP BADGE ICONS
   ========================================================================== */

export const CropBadgeIcon: React.FC<{ cropName?: string; size?: number }> = ({
  cropName = "",
  size = 20,
}) => {
  const norm = cropName.toLowerCase();
  if (norm.includes("cotton") || norm.includes("bt")) {
    return <span style={{ fontSize: `${size}px`, lineHeight: 1 }} title="Cotton">☁️</span>;
  }
  if (norm.includes("paddy") || norm.includes("rice")) {
    return <span style={{ fontSize: `${size}px`, lineHeight: 1 }} title="Paddy">🌾</span>;
  }
  if (norm.includes("maize") || norm.includes("corn")) {
    return <span style={{ fontSize: `${size}px`, lineHeight: 1 }} title="Maize">🌽</span>;
  }
  if (norm.includes("chilli") || norm.includes("mirchi")) {
    return <span style={{ fontSize: `${size}px`, lineHeight: 1 }} title="Chilli">🌶️</span>;
  }
  if (norm.includes("soy") || norm.includes("pulse") || norm.includes("dal")) {
    return <span style={{ fontSize: `${size}px`, lineHeight: 1 }} title="Pulses">🫘</span>;
  }
  if (norm.includes("wheat")) {
    return <span style={{ fontSize: `${size}px`, lineHeight: 1 }} title="Wheat">🌾</span>;
  }
  if (norm.includes("groundnut") || norm.includes("peanut")) {
    return <span style={{ fontSize: `${size}px`, lineHeight: 1 }} title="Groundnut">🥜</span>;
  }
  if (norm.includes("sugar")) {
    return <span style={{ fontSize: `${size}px`, lineHeight: 1 }} title="Sugarcane">🎋</span>;
  }
  return <span style={{ fontSize: `${size}px`, lineHeight: 1 }} title={cropName || "Crop"}>🌱</span>;
};

/* ==========================================================================
   EMPTY STATE ILLUSTRATIONS (Clean SVG)
   ========================================================================== */

export const EmptyFarmIllustration: React.FC<{ size?: number }> = ({ size = 120 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 160 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    {/* Sun */}
    <circle cx="130" cy="30" r="18" fill="#FEF08A" />
    <circle cx="130" cy="30" r="12" fill="#FACC15" />
    {/* Rolling Farmland */}
    <path
      d="M0 90C30 75 60 78 95 86C130 94 150 82 160 80V120H0V90Z"
      fill="#D1E7DD"
    />
    <path
      d="M0 100C40 92 80 96 115 104C140 110 155 106 160 105V120H0V100Z"
      fill="#A3C5B5"
    />
    {/* Furrows */}
    <path d="M15 98Q45 92 85 99" stroke="#174D35" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 3" />
    <path d="M30 108Q70 103 120 110" stroke="#174D35" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 3" />
    {/* Sprouts */}
    <path d="M50 82V72M50 72C48 70 44 71 44 74C46 75 49 74 50 72ZM50 72C52 70 56 71 56 74C54 75 51 74 50 72Z" stroke="#2F855A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="#84CC16" />
    <path d="M90 88V78M90 78C88 76 84 77 84 80C86 81 89 80 90 78ZM90 78C92 76 96 77 96 80C94 81 91 80 90 78Z" stroke="#2F855A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="#84CC16" />
  </svg>
);

export const EmptyScheduleIllustration: React.FC<{ size?: number }> = ({ size = 120 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 140 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect x="25" y="25" width="90" height="80" rx="12" fill="#E8F3ED" stroke="#174D35" strokeWidth="2.5" />
    <path d="M25 48H115" stroke="#174D35" strokeWidth="2" />
    <path d="M45 18V28M95 18V28" stroke="#2F855A" strokeWidth="3" strokeLinecap="round" />
    <circle cx="50" cy="65" r="4" fill="#2F855A" />
    <circle cx="70" cy="65" r="4" fill="#A3C5B5" />
    <circle cx="90" cy="65" r="4" fill="#A3C5B5" />
    <circle cx="50" cy="85" r="4" fill="#A3C5B5" />
    <circle cx="70" cy="85" r="4" fill="#A3C5B5" />
    <circle cx="90" cy="85" r="4" fill="#2F855A" />
    {/* Tick badge */}
    <circle cx="105" cy="95" r="14" fill="#2F855A" />
    <path d="M100 95L103.5 98.5L110 91.5" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
