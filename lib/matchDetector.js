import { TEAM_NAME_MAP, TEAM_ALIASES, normalizeName } from './teamTranslations';

const VS_PATTERN = /(.+?)\s+vs\.?\s+(.+)/i;
const DASH_PATTERN = /(.+?)\s+-\s+(.+)/i;

const INTENT_KEYWORDS = [
  'apuesta', 'apostar', 'pronóstico', 'pronostico', 'predicción', 'prediccion',
  'cuota', 'cuotas', 'valor', 'over', 'under', 'btts', 'handicap', 'hándicap',
  'goles', 'mercado', 'stake', 'bankroll', 'análisis', 'analisis', 'analyze',
  'pick', 'selección', 'seleccion', 'tip', 'consejo', 'recomienda', 'mejor',
  'chance', 'oportunidad', 'ganar', 'perder', 'empate', 'local', 'visitante',
  'favorito', 'favorita', 'confianza',
];

function buildNameIndex() {
  const index = [];
  for (const [es, en] of Object.entries(TEAM_NAME_MAP)) {
    index.push({ orig: es, norm: normalizeName(es), english: en, len: es.split(' ').length });
  }
  for (const [alias, en] of Object.entries(TEAM_ALIASES)) {
    if (!index.some(e => e.english === en && e.orig === alias)) {
      index.push({ orig: alias, norm: normalizeName(alias), english: en, len: alias.split(' ').length });
    }
  }
  index.sort((a, b) => b.len - a.len);
  return index;
}

const NAME_INDEX = buildNameIndex();

export function detectMatchup(text) {
  if (!text || typeof text !== 'string') return null;

  const cleaned = text.trim();

  const vsMatch = cleaned.match(VS_PATTERN);
  if (vsMatch) {
    const t1 = vsMatch[1].trim().replace(/^[¿¡]/, '').trim();
    const t2 = vsMatch[2].trim().replace(/[?!.,;:]+$/, '').trim();
    return { team1: t1, team2: t2, method: 'regex_vs' };
  }

  const dashMatch = cleaned.match(DASH_PATTERN);
  if (dashMatch) {
    const t1 = dashMatch[1].trim();
    const t2 = dashMatch[2].trim();
    if (t1.length > 2 && t2.length > 2 && normalizeName(t1) !== normalizeName(t2)) {
      return { team1: t1, team2: t2, method: 'regex_dash' };
    }
  }

  const foundTeams = findTeamsInText(cleaned);

  if (foundTeams.length >= 2) {
    return {
      team1: foundTeams[0].matched,
      team2: foundTeams[1].matched,
      method: 'lookup',
    };
  }

  if (foundTeams.length === 1 && hasIntent(text)) {
    return {
      team1: foundTeams[0].matched,
      team2: null,
      method: 'single_team_intent',
    };
  }

  return null;
}

function findTeamsInText(text) {
  const words = text.split(/\s+/);
  const found = [];
  const used = new Set();

  for (let i = 0; i < words.length; i++) {
    for (const entry of NAME_INDEX) {
      if (used.has(entry.english)) continue;
      const teamWords = entry.orig.split(' ');
      const slice = words.slice(i, i + teamWords.length);
      if (slice.length < teamWords.length) continue;
      const sliceNorm = normalizeName(slice.join(' '));
      if (sliceNorm === entry.norm || sliceNorm.includes(entry.norm) || entry.norm.includes(sliceNorm)) {
        found.push({ matched: slice.join(' '), english: entry.english, position: i });
        used.add(entry.english);
        i += teamWords.length - 1;
        break;
      }
    }
    if (found.length >= 2) break;
  }

  return found;
}

export function hasIntent(text) {
  const lower = text.toLowerCase();
  return INTENT_KEYWORDS.some(kw => lower.includes(kw));
}
