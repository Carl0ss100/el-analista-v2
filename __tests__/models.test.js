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

  it('Colombia (rank 13) vs Portugal (rank 5) at neutral venue favors Portugal', () => {
    const eloCol = 2100 - 13 * 5;
    const eloPor = 2100 - 5 * 5;
    const result = eloTo1X2(eloCol, eloPor, 0);
    expect(result['2']).toBeGreaterThan(result['1']);
  });

  it('Colombia vs Portugal with home advantage favors Colombia', () => {
    const eloCol = 2100 - 13 * 5;
    const eloPor = 2100 - 5 * 5;
    const result = eloTo1X2(eloCol, eloPor, 65);
    expect(result['1']).toBeGreaterThan(result['2']);
  });

  it('sum of 1X2 probs equals 1', () => {
    const result = eloTo1X2(1800, 1900, 0);
    expect(result['1'] + result['X'] + result['2']).toBeCloseTo(1, 2);
  });

  it('away team proportionally reflecs eAway at neutral venue', () => {
    const result = eloTo1X2(1800, 2000, 0);
    expect(result['2']).toBeGreaterThan(result['1']);
  });

  it('South Africa (rank 60) vs Canada (rank 30) at neutral venue favors Canada', () => {
    const eloSA = 2100 - 60 * 5;
    const eloCA = 2100 - 30 * 5;
    const result = eloTo1X2(eloSA, eloCA, 0);
    expect(result['2']).toBeGreaterThan(result['1']);
  });

  it('home advantage inflates home team probability vs neutral venue', () => {
    const eloSA = 2100 - 60 * 5;
    const eloCA = 2100 - 30 * 5;
    const neutral = eloTo1X2(eloSA, eloCA, 0);
    const withHome = eloTo1X2(eloSA, eloCA, 65);
    expect(withHome['1']).toBeGreaterThan(neutral['1']);
  });

  it('neutral venue does not add home bias', () => {
    const result = eloTo1X2(2000, 2000, 0);
    expect(result['1']).toBeCloseTo(result['2'], 4);
  });
});
