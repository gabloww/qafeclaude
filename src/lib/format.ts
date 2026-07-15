export function formatPrice(n: number): string {
  if (isNaN(n) || n === null || n === undefined) return 'RM0.00';
  return `RM${n.toFixed(2)}`;
}

export function getWaitLabel(minutes: number): { label: string } {
  if (minutes === 0) return { label: 'No wait' };
  return { label: `${minutes} min wait` };
}

export function getWaitBadgeClass(minutes: number): string {
  if (minutes <= 15) return 'bg-success-500/10 text-success-600 border-success-500/20';
  if (minutes <= 30) return 'bg-warning-500/10 text-warning-600 border-warning-500/20';
  return 'bg-error-500/10 text-error-600 border-error-500/20';
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 0) return 'just now';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-MY', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatTime(timeStr: string): string {
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  const hour = parseInt(parts[0], 10);
  const m = parts[1];
  if (isNaN(hour)) return timeStr;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${m} ${ampm}`;
}
