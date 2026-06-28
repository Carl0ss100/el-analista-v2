import { describe, it, expect } from 'vitest';
import { normalizeName } from '../lib/teamTranslations';
import { detectMatchup } from '../lib/matchDetector';

describe('normalizeName', () => {
  it('strips punctuation', () => {
    expect(normalizeName('portugal,')).toBe('portugal');
    expect(normalizeName('españa?')).toBe('espana');
    expect(normalizeName('brasil!')).toBe('brasil');
  });

  it('strips guillemets', () => {
    expect(normalizeName('«real madrid»')).toBe('real madrid');
  });

  it('removes accents', () => {
    expect(normalizeName('ESPAÑA')).toBe('espana');
    expect(normalizeName('BRASIL')).toBe('brasil');
  });

  it('strips fc/cf/sc/club/de', () => {
    expect(normalizeName('SEVILLA FC')).toBe('sevilla');
    expect(normalizeName('REAL BETIS')).toBe('real betis');
  });
});

describe('detectMatchup', () => {
  it('does not false-match "es" to Spain', () => {
    const result = detectMatchup('esta es la unica que segura?');
    expect(result).toBeNull();
  });

  it('does not false-match common Spanish words to teams', () => {
    const result = detectMatchup('principal es que gana portugal tienes alguna mas');
    expect(result).toBeNull();
  });

  it('still detects portugal with trailing comma', () => {
    const result = detectMatchup('portugal, gana este partido vs francia');
    expect(result).not.toBeNull();
  });

  it('detects vs pattern correctly', () => {
    const result = detectMatchup('Colombia vs Portugal');
    expect(result).not.toBeNull();
    expect(result.team1).toBe('Colombia');
    expect(result.team2).toBe('Portugal');
  });

  it('detects single team name that is long enough for fuzzy match', () => {
    const result = detectMatchup('que opinas de portugal?');
    expect(result).not.toBeNull();
  });
});
