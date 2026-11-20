export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 28 28"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="14" cy="5" r="3" />
      <path d="M14 9v9M14 18l-5 8M14 18l5 8M14 12l-6-4M14 12l6 2l2-6" />
    </svg>
  );
}
