interface AppIconProps {
  notificationDot?: boolean;
}

export function AppIcon({ notificationDot }: AppIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="32"
      height="32"
      viewBox="0 0 32 32"
    >
      <rect width="32" height="32" rx="8" fill="#111" />
      <circle cx="10" cy="10" r="4" fill="#e5e5e5" />
      <circle cx="22" cy="10" r="4" fill="#999" />
      <circle cx="10" cy="22" r="4" fill="#999" />
      <circle cx="22" cy="22" r="4" fill="#666" />
      {notificationDot && (
        <circle
          cx="26"
          cy="6"
          r="5"
          fill="#22c55e"
          stroke="#111"
          strokeWidth="1.5"
        />
      )}
    </svg>
  );
}
