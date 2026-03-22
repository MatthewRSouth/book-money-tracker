export function formatYen(amount: number): string {
  const abs = Math.abs(amount).toLocaleString('ja-JP');
  return amount < 0 ? `-¥${abs}` : `¥${abs}`;
}
