import { describe, it, expect } from 'vitest';
import { formatYen } from '@/lib/utils/formatYen';

describe('formatYen', () => {
  it('formats positive amounts', () => {
    expect(formatYen(20000)).toBe('¥20,000');
  });

  it('formats negative amounts with leading minus', () => {
    expect(formatYen(-1500)).toBe('-¥1,500');
  });

  it('formats zero', () => {
    expect(formatYen(0)).toBe('¥0');
  });

  it('formats large amounts', () => {
    expect(formatYen(1000000)).toBe('¥1,000,000');
  });
});
