import { describe, it, expect } from 'vitest';
import { matchOddsApiTeam, findMatchInOddsApi, SOCCER_LEAGUES, NATIONAL_TEAM_COUNTRIES } from '../lib/oddsApi';

describe('matchOddsApiTeam', () => {
  it('exact match returns 3', () => {
    expect(matchOddsApiTeam('Brazil', 'Brazil')).toBe(3);
  });

  it('alias match returns 2', () => {
    expect(matchOddsApiTeam('Tottenham Hotspur', 'Tottenham')).toBe(2);
    expect(matchOddsApiTeam('Ivory Coast', 'Cote d\'Ivoire')).toBe(2);
  });

  it('substring match returns 2', () => {
    expect(matchOddsApiTeam('Brazil', 'brazil')).toBe(3);
    expect(matchOddsApiTeam('Manchester United', 'man united')).toBe(2);
  });

  it('no match returns 0', () => {
    expect(matchOddsApiTeam('Brazil', 'Japan')).toBe(0);
  });

  it('case insensitive', () => {
    expect(matchOddsApiTeam('Japan', 'japan')).toBe(3);
  });
});

describe('findMatchInOddsApi', () => {
  it('finds exact match in fixtures', () => {
    const games = [{
      id: 'test123',
      home_team: 'Brazil',
      away_team: 'Japan',
      commence_time: '2026-06-29T00:00:00Z',
      bookmakers: [],
    }];
    const result = findMatchInOddsApi(games, 'Brazil', 'Japan');
    expect(result).not.toBeNull();
    expect(result.home).toBe('Brazil');
    expect(result.away).toBe('Japan');
  });

  it('finds match with swapped home/away', () => {
    const games = [{
      id: 'test456',
      home_team: 'Japan',
      away_team: 'Brazil',
      commence_time: '2026-06-29T00:00:00Z',
      bookmakers: [],
    }];
    const result = findMatchInOddsApi(games, 'Brazil', 'Japan');
    expect(result).not.toBeNull();
    expect(result.home).toBe('Brazil');
    expect(result.away).toBe('Japan');
  });

  it('returns null when no match', () => {
    const games = [{
      id: 'test789',
      home_team: 'Germany',
      away_team: 'France',
      commence_time: '2026-06-29T00:00:00Z',
      bookmakers: [],
    }];
    const result = findMatchInOddsApi(games, 'Brazil', 'Japan');
    expect(result).toBeNull();
  });
});

describe('NATIONAL_TEAM_COUNTRIES', () => {
  it('includes Brazil and Japan', () => {
    expect(NATIONAL_TEAM_COUNTRIES.has('brazil')).toBe(true);
    expect(NATIONAL_TEAM_COUNTRIES.has('japan')).toBe(true);
  });

  it('includes Morocco and South Africa', () => {
    expect(NATIONAL_TEAM_COUNTRIES.has('morocco')).toBe(true);
    expect(NATIONAL_TEAM_COUNTRIES.has('south africa')).toBe(true);
  });
});

describe('SOCCER_LEAGUES', () => {
  it('includes World Cup', () => {
    expect(SOCCER_LEAGUES).toContain('soccer_fifa_world_cup');
  });

  it('includes J-League', () => {
    expect(SOCCER_LEAGUES).toContain('soccer_japan_j_league');
  });
});
