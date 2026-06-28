import { describe, it, expect } from 'vitest';
import { eloExpected, eloTo1X2 } from '../lib/models';

describe('eloExpected', () => {
  it('applies default home advantage of 65', () => {
    const result = eloExpected(2000, 2000);
    expect(result.home).toBeGreaterThan(0.5);
  });

  it('uses neutral venue when homeAdvantage=0', () => {
    const result = eloExpected(2000, 2000, 0);
    expect(result.home).toBeCloseTo(0.5, 4);
  });

  it('favors lower-ranked team at neutral venue vs with home advantage', () => {
    const withHome = eloExpected(2040, 2070, 65);
    const neutral = eloExpected(2040, 2070, 0);
    expect(withHome.home).toBeGreaterThan(neutral.home);
  });

  it('at neutral venue, higher elo is favored', () => {
    const result = eloExpected(2040, 2070, 0);
    expect(result.away).toBeGreaterThan(result.home);
  });
});

describe('eloTo1X2', () => {
  it('equal teams at neutral venue give symmetric 1X2', () => {
    const result = eloTo1X2(2000, 2000, 0);
    expect(result['1']).toBeCloseTo(result['2'], 4);
    expect(result['1']).toBeCloseTo(0.37, 1);
  });

  it('Colombia vs Portugal at neutral venue favors Portugal (team2)', () => {
    const eloCol = 2100 - 12 * 5;
    const eloPor = 2100 - 6 * 5;
    const result = eloTo1X2(eloCol, eloPor, 0);
    expect(result['2']).toBeGreaterThan(result['1']);
  });

  it('Colombia vs Portugal with home advantage favors Colombia (team1)', () => {
    const eloCol = 2100 - 12 * 5;
    const eloPor = 2100 - 6 * 5;
    const result = eloTo1X2(eloCol, eloPor, 65);
    expect(result['1']).toBeGreaterThan(result['2']);
  });

  it('sum of 1X2 probs equals 1 (or close due to rounding)', () => {
    const result = eloTo1X2(1800, 1900, 0);
    expect(result['1'] + result['X'] + result['2']).toBeCloseTo(1, 2);
  });

  it('away team proportionally reflecs eAway at neutral venue', () => {
    const result = eloTo1X2(1800, 2000, 0);
    expect(result['2']).toBeGreaterThan(result['1']);
  });
});
