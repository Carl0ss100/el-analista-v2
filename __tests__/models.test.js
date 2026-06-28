import { describe, it, expect } from 'vitest';
import { eloExpected, eloTo1X2 } from '../lib/models';
import { fifaRankToElo } from '../lib/analysisEngine';

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

describe('fifaRankToElo', () => {
  it('rank 1 gives 2100', () => {
    expect(fifaRankToElo(1)).toBe(2100);
  });

  it('rank 3 gives 2070', () => {
    expect(fifaRankToElo(3)).toBe(2070);
  });

  it('rank 5 gives 2050', () => {
    expect(fifaRankToElo(5)).toBe(2050);
  });

  it('rank 6 (Brazil) gives 2042', () => {
    expect(fifaRankToElo(6)).toBe(2042);
  });

  it('rank 10 gives 2010', () => {
    expect(fifaRankToElo(10)).toBe(2010);
  });

  it('rank 15 (Japan) gives 1980', () => {
    expect(fifaRankToElo(15)).toBe(1980);
  });

  it('rank 18 gives 1962', () => {
    expect(fifaRankToElo(18)).toBe(1962);
  });

  it('rank 30 gives 1910', () => {
    expect(fifaRankToElo(30)).toBe(1910);
  });

  it('rank 60 gives 1810', () => {
    expect(fifaRankToElo(60)).toBe(1810);
  });

  it('rank 100 gives at least 1500', () => {
    expect(fifaRankToElo(100)).toBeGreaterThanOrEqual(1500);
  });

  it('higher rank always gives lower elo', () => {
    for (let i = 1; i < 100; i++) {
      expect(fifaRankToElo(i)).toBeGreaterThanOrEqual(fifaRankToElo(i + 1));
    }
  });

  it('Brazil(#6) vs Japan(#15) elo gap > 50', () => {
    const eloBra = fifaRankToElo(6);
    const eloJpn = fifaRankToElo(15);
    expect(eloBra - eloJpn).toBeGreaterThan(50);
  });
});

describe('eloTo1X2', () => {
  it('equal teams at neutral venue give symmetric 1X2', () => {
    const result = eloTo1X2(2000, 2000, 0);
    expect(result['1']).toBeCloseTo(result['2'], 4);
    expect(result['1']).toBeCloseTo(0.37, 1);
  });

  it('Colombia vs Portugal at neutral venue favors Portugal', () => {
    const eloCol = fifaRankToElo(13);
    const eloPor = fifaRankToElo(5);
    const result = eloTo1X2(eloCol, eloPor, 0);
    expect(result['2']).toBeGreaterThan(result['1']);
  });

  it('sum of 1X2 probs equals 1', () => {
    const result = eloTo1X2(1800, 1900, 0);
    expect(result['1'] + result['X'] + result['2']).toBeCloseTo(1, 2);
  });

  it('away team proportionally reflects eAway at neutral venue', () => {
    const result = eloTo1X2(1800, 2000, 0);
    expect(result['2']).toBeGreaterThan(result['1']);
  });

  it('Brazil vs Japan at neutral venue favors Brazil', () => {
    const eloBra = fifaRankToElo(6);
    const eloJpn = fifaRankToElo(15);
    const result = eloTo1X2(eloBra, eloJpn, 0);
    expect(result['1']).toBeGreaterThan(result['2']);
  });

  it('South Africa vs Canada at neutral venue favors Canada', () => {
    const eloSA = fifaRankToElo(60);
    const eloCA = fifaRankToElo(30);
    const result = eloTo1X2(eloSA, eloCA, 0);
    expect(result['2']).toBeGreaterThan(result['1']);
  });

  it('home advantage inflates home team probability vs neutral venue', () => {
    const eloSA = fifaRankToElo(60);
    const eloCA = fifaRankToElo(30);
    const neutral = eloTo1X2(eloSA, eloCA, 0);
    const withHome = eloTo1X2(eloSA, eloCA, 65);
    expect(withHome['1']).toBeGreaterThan(neutral['1']);
  });

  it('neutral venue does not add home bias', () => {
    const result = eloTo1X2(2000, 2000, 0);
    expect(result['1']).toBeCloseTo(result['2'], 4);
  });
});
