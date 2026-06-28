export const NATIONAL_TEAMS = {
  'Spain': { apiId: 10, fifaRank: 2, confederation: 'UEFA' },
  'England': { apiId: 9, fifaRank: 4, confederation: 'UEFA' },
  'France': { apiId: 2, fifaRank: 3, confederation: 'UEFA' },
  'Germany': { apiId: 25, fifaRank: 10, confederation: 'UEFA' },
  'Italy': { apiId: 7, fifaRank: 12, confederation: 'UEFA' },
  'Brazil': { apiId: 6, fifaRank: 6, confederation: 'CONMEBOL' },
  'Argentina': { apiId: 4, fifaRank: 1, confederation: 'CONMEBOL' },
  'Portugal': { apiId: 13, fifaRank: 5, confederation: 'UEFA' },
  'Netherlands': { apiId: 14, fifaRank: 8, confederation: 'UEFA' },
  'Belgium': { apiId: 11, fifaRank: 9, confederation: 'UEFA' },
  'Uruguay': { apiId: 8, fifaRank: 16, confederation: 'CONMEBOL' },
  'Colombia': { apiId: 5, fifaRank: 13, confederation: 'CONMEBOL' },
  'Chile': { apiId: 21, fifaRank: 51, confederation: 'CONMEBOL' },
  'Mexico': { apiId: 16, fifaRank: 14, confederation: 'CONCACAF' },
  'USA': { apiId: 22, fifaRank: 17, confederation: 'CONCACAF' },
  'Croatia': { apiId: 3, fifaRank: 11, confederation: 'UEFA' },
  'Serbia': { apiId: 17, fifaRank: 43, confederation: 'UEFA' },
  'Switzerland': { apiId: 18, fifaRank: 19, confederation: 'UEFA' },
  'Denmark': { apiId: 23, fifaRank: 21, confederation: 'UEFA' },
  'Sweden': { apiId: 19, fifaRank: 38, confederation: 'UEFA' },
  'Norway': { apiId: 15, fifaRank: 31, confederation: 'UEFA' },
  'Poland': { apiId: 24, fifaRank: 36, confederation: 'UEFA' },
  'Austria': { apiId: 26, fifaRank: 24, confederation: 'UEFA' },
  'Czech Republic': { apiId: 27, fifaRank: 40, confederation: 'UEFA' },
  'Wales': { apiId: 28, fifaRank: 37, confederation: 'UEFA' },
  'Scotland': { apiId: 29, fifaRank: 42, confederation: 'UEFA' },
  'Republic of Ireland': { apiId: 30, fifaRank: 58, confederation: 'UEFA' },
  'Northern Ireland': { apiId: 31, fifaRank: 70, confederation: 'UEFA' },
  'Turkey': { apiId: 32, fifaRank: 22, confederation: 'UEFA' },
  'Russia': { apiId: 33, fifaRank: 35, confederation: 'UEFA' },
  'Ukraine': { apiId: 34, fifaRank: 32, confederation: 'UEFA' },
  'Romania': { apiId: 35, fifaRank: 54, confederation: 'UEFA' },
  'Hungary': { apiId: 36, fifaRank: 39, confederation: 'UEFA' },
  'Greece': { apiId: 37, fifaRank: 48, confederation: 'UEFA' },
  'Japan': { apiId: 12, fifaRank: 18, confederation: 'AFC' },
  'South Korea': { apiId: 38, fifaRank: 25, confederation: 'AFC' },
  'Australia': { apiId: 39, fifaRank: 27, confederation: 'AFC' },
  'Costa Rica': { apiId: 40, fifaRank: 53, confederation: 'CONCACAF' },
  'Ecuador': { apiId: 2382, fifaRank: 23, confederation: 'CONMEBOL' },
  'Peru': { apiId: 41, fifaRank: 52, confederation: 'CONMEBOL' },
  'Paraguay': { apiId: 42, fifaRank: 41, confederation: 'CONMEBOL' },
  'Bolivia': { apiId: 43, fifaRank: 77, confederation: 'CONMEBOL' },
  'Venezuela': { apiId: 44, fifaRank: 49, confederation: 'CONMEBOL' },
  'Panama': { apiId: 45, fifaRank: 34, confederation: 'CONCACAF' },
  'Canada': { apiId: 46, fifaRank: 30, confederation: 'CONCACAF' },
  'Morocco': { apiId: 47, fifaRank: 7, confederation: 'CAF' },
  'Nigeria': { apiId: 48, fifaRank: 26, confederation: 'CAF' },
  'Cameroon': { apiId: 49, fifaRank: 44, confederation: 'CAF' },
  'Senegal': { apiId: 50, fifaRank: 15, confederation: 'CAF' },
  'Ghana': { apiId: 51, fifaRank: 73, confederation: 'CAF' },
  'Tunisia': { apiId: 52, fifaRank: 45, confederation: 'CAF' },
  'Egypt': { apiId: 53, fifaRank: 29, confederation: 'CAF' },
  'Algeria': { apiId: 54, fifaRank: 28, confederation: 'CAF' },
  'South Africa': { apiId: 55, fifaRank: 60, confederation: 'CAF' },
  'Iran': { apiId: 56, fifaRank: 20, confederation: 'AFC' },
  'Saudi Arabia': { apiId: 57, fifaRank: 61, confederation: 'AFC' },
  'Qatar': { apiId: 58, fifaRank: 56, confederation: 'AFC' },
  'China': { apiId: 59, fifaRank: 91, confederation: 'AFC' },
  'India': { apiId: 60, fifaRank: 138, confederation: 'AFC' },
  'Israel': { apiId: 61, fifaRank: 76, confederation: 'UEFA' },
};

const SPANISH_TO_ENGLISH = {
  'ESPAÑA': 'Spain', 'INGLATERRA': 'England', 'FRANCIA': 'France',
  'ALEMANIA': 'Germany', 'ITALIA': 'Italy', 'BRASIL': 'Brazil',
  'ARGENTINA': 'Argentina', 'PORTUGAL': 'Portugal', 'HOLANDA': 'Netherlands',
  'PAÍSES BAJOS': 'Netherlands', 'BÉLGICA': 'Belgium', 'URUGUAY': 'Uruguay',
  'COLOMBIA': 'Colombia', 'CHILE': 'Chile', 'MÉXICO': 'Mexico',
  'MEXICO': 'Mexico', 'EEUU': 'USA', 'ESTADOS UNIDOS': 'USA',
  'CROACIA': 'Croatia', 'SERBIA': 'Serbia', 'SUIZA': 'Switzerland',
  'DINAMARCA': 'Denmark', 'SUECIA': 'Sweden', 'NORUEGA': 'Norway',
  'POLONIA': 'Poland', 'AUSTRIA': 'Austria', 'REPÚBLICA CHECA': 'Czech Republic',
  'R.CHECA': 'Czech Republic', 'GALES': 'Wales', 'ESCOCIA': 'Scotland',
  'IRLANDA': 'Republic of Ireland', 'IRLANDA DEL NORTE': 'Northern Ireland',
  'TURQUÍA': 'Turkey', 'RUSIA': 'Russia', 'UCRANIA': 'Ukraine',
  'RUMANIA': 'Romania', 'HUNGRÍA': 'Hungary', 'GRECIA': 'Greece',
  'JAPÓN': 'Japan', 'JAPON': 'Japan', 'COREA DEL SUR': 'South Korea',
  'AUSTRALIA': 'Australia', 'COSTA RICA': 'Costa Rica', 'ECUADOR': 'Ecuador',
  'PERÚ': 'Peru', 'PERU': 'Peru', 'PARAGUAY': 'Paraguay',
  'BOLIVIA': 'Bolivia', 'VENEZUELA': 'Venezuela', 'PANAMÁ': 'Panama',
  'PANAMA': 'Panama', 'CANADÁ': 'Canada', 'CANADA': 'Canada',
  'MARRUECOS': 'Morocco', 'NIGERIA': 'Nigeria', 'CAMERÚN': 'Cameroon',
  'SENEGAL': 'Senegal', 'GHANA': 'Ghana', 'TÚNEZ': 'Tunisia',
  'EGIPTO': 'Egypt', 'ARGELIA': 'Algeria', 'SUDÁFRICA': 'South Africa',
  'IRÁN': 'Iran', 'IRAN': 'Iran', 'ARABIA SAUDÍ': 'Saudi Arabia',
  'ARABIA SAUDITA': 'Saudi Arabia', 'QATAR': 'Qatar', 'CHINA': 'China',
  'INDIA': 'India', 'ISRAEL': 'Israel',
};

export function getNationalTeamId(name) {
  const upper = name.trim().toUpperCase();
  const english = SPANISH_TO_ENGLISH[upper] || name.trim();
  return NATIONAL_TEAMS[english] || null;
}

export function isCountryName(name) {
  const upper = name.trim().toUpperCase();
  return !!SPANISH_TO_ENGLISH[upper];
}

export function getConfederation(name) {
  const team = getNationalTeamId(name);
  return team?.confederation || null;
}
