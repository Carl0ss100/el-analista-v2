import { describe, it, expect } from 'vitest';
import { getNationalTeamId, getConfederation } from '../lib/nationalTeams';

describe('getNationalTeamId', () => {
  it('finds South Africa by English name', () => {
    const team = getNationalTeamId('South Africa');
    expect(team).not.toBeNull();
    expect(team.fifaRank).toBe(60);
    expect(team.confederation).toBe('CAF');
  });

  it('finds Canada by English name', () => {
    const team = getNationalTeamId('Canada');
    expect(team).not.toBeNull();
    expect(team.fifaRank).toBe(30);
    expect(team.confederation).toBe('CONCACAF');
  });

  it('finds Colombia by English name', () => {
    const team = getNationalTeamId('Colombia');
    expect(team).not.toBeNull();
    expect(team.fifaRank).toBe(13);
  });

  it('finds Portugal by English name', () => {
    const team = getNationalTeamId('Portugal');
    expect(team).not.toBeNull();
    expect(team.fifaRank).toBe(5);
  });

  it('returns null for unknown team', () => {
    const team = getNationalTeamId('Atlantis');
    expect(team).toBeNull();
  });

  it('Morocco rank reflects 2026 ranking', () => {
    const team = getNationalTeamId('Morocco');
    expect(team.fifaRank).toBe(7);
  });

  it('Chile rank reflects 2026 ranking', () => {
    const team = getNationalTeamId('Chile');
    expect(team.fifaRank).toBe(51);
  });

  it('Iran rank reflects 2026 ranking', () => {
    const team = getNationalTeamId('Iran');
    expect(team.fifaRank).toBe(20);
  });
});

describe('getConfederation', () => {
  it('returns CAF for South Africa', () => {
    expect(getConfederation('South Africa')).toBe('CAF');
  });

  it('returns CONCACAF for Canada', () => {
    expect(getConfederation('Canada')).toBe('CONCACAF');
  });

  it('returns CONMEBOL for Argentina', () => {
    expect(getConfederation('Argentina')).toBe('CONMEBOL');
  });

  it('returns null for unknown team', () => {
    expect(getConfederation('Atlantis')).toBeNull();
  });
});
