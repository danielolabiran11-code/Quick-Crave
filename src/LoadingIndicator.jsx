export default function LoadingIndicator({ label = "Loading", centered = false }) {
  return (
    <span
      className={`loading-indicator${centered ? " is-centered" : ""}`}
      role="status"
      aria-live="polite"
    >
      <span className="loading-spinner" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
