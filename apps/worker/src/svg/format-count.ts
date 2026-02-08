export function formatCount(n: number): string {
  const str = String(n);
  const parts: string[] = [];

  for (let i = str.length; i > 0; i -= 3) {
    parts.unshift(str.slice(Math.max(0, i - 3), i));
  }

  return parts.join(',');
}
