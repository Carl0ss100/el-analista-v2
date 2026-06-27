import { TEAM_NAME_MAP, TEAM_ALIASES, normalizeName, translate } from './teamTranslations';

const VS_PATTERN = /\b(\S+(?:\s+\S+)*?)\s+vs\.?\s+(\S+(?:\s+\S+)*)\b/i;
const DASH_PATTERN = /\b(\S+(?:\s+\S+)*?)\s+-\s+(\S+(?:\s+\S+)*)\b/i;

const INTENT_KEYWORDS = [
  'apuesta', 'apostar', 'pronóstico', 'pronostico', 'predicción', 'prediccion',
  'cuota', 'cuotas', 'valor', 'over', 'under', 'btts', 'handicap', 'hándicap',
  'goles', 'mercado', 'stake', 'bankroll', 'análisis', 'analisis', 'analyze',
  'pick', 'selección', 'seleccion', 'tip', 'consejo', 'recomienda', 'mejor',
  'chance', 'oportunidad', 'ganar', 'perder', 'empate', 'local', 'visitante',
  'favorito', 'favorita', 'confianza', 'partido', 'juegan', 'juega', 'opinas',
  'piensas', 'crees', 'apuestan', 'pronosticas', 'hoy', 'mañana', 'noche',
];

const DATE_PATTERNS = [
  /(\d{1,2})[/](\d{1,2})[/](\d{2,4})/,
  /(\d{1,2})\s+(?:de\s+)?(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i,
];

const COMPETITION_KEYWORDS = {
  'mundial': 'FIFA World Cup',
  'world cup': 'FIFA World Cup',
  'copa del mundo': 'FIFA World Cup',
  'eurocopa': 'UEFA Euro',
  'euro': 'UEFA Euro',
  'nations league': 'UEFA Nations League',
  'copa america': 'Copa America',
  'copa américa': 'Copa America',
  'champions': 'UEFA Champions League',
  'champions league': 'UEFA Champions League',
  'europa league': 'UEFA Europa League',
  'conference league': 'UEFA Conference League',
  'eliminatorias': 'World Cup Qualifiers',
  'qualifiers': 'World Cup Qualifiers',
  'amistoso': 'Friendly',
  'friendly': 'Friendly',
};

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

function findTeamInText(text) {
  const cleaned = text.replace(/^[¿¡!?]+/, '').replace(/[?!.,;:]+$/g, '').trim();
  const words = cleaned.split(/\s+/);

  for (const entry of NAME_INDEX) {
    const teamWords = entry.orig.split(' ');
    for (let i = 0; i <= words.length - teamWords.length; i++) {
      const slice = words.slice(i, i + teamWords.length);
      const sliceNorm = normalizeName(slice.join(' '));
      if (sliceNorm === entry.norm) {
        return entry.english;
      }
    }
  }

  for (const entry of NAME_INDEX) {
    const teamWords = entry.orig.split(' ');
    for (let i = 0; i <= words.length - teamWords.length; i++) {
      const slice = words.slice(i, i + teamWords.length);
      const sliceNorm = normalizeName(slice.join(' '));
      if (sliceNorm.includes(entry.norm) || entry.norm.includes(sliceNorm)) {
        return entry.english;
      }
    }
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
      if (sliceNorm === entry.norm) {
        found.push({ matched: entry.english, original: slice.join(' '), position: i });
        used.add(entry.english);
        i += teamWords.length - 1;
        break;
      }
    }
    if (found.length >= 2) break;
  }

  if (found.length < 2) {
    for (let i = 0; i < words.length; i++) {
      for (const entry of NAME_INDEX) {
        if (used.has(entry.english)) continue;
        const teamWords = entry.orig.split(' ');
        const slice = words.slice(i, i + teamWords.length);
        if (slice.length < teamWords.length) continue;
        const sliceNorm = normalizeName(slice.join(' '));
        if (sliceNorm.includes(entry.norm) || entry.norm.includes(sliceNorm)) {
          found.push({ matched: entry.english, original: slice.join(' '), position: i });
          used.add(entry.english);
          i += teamWords.length - 1;
          break;
        }
      }
      if (found.length >= 2) break;
    }
  }

  return found;
}

export function detectMatchup(text) {
  if (!text || typeof text !== 'string') return null;

  const cleaned = text.trim();

  const vsMatch = cleaned.match(VS_PATTERN);
  if (vsMatch) {
    const raw1 = vsMatch[1].trim();
    const raw2 = vsMatch[2].trim();
    const t1 = findTeamInText(raw1);
    const t2 = findTeamInText(raw2);
    if (t1 && t2 && normalizeName(t1) !== normalizeName(t2)) {
      return { team1: t1, team2: t2, method: 'regex_vs' };
    }
  }

  const dashMatch = cleaned.match(DASH_PATTERN);
  if (dashMatch) {
    const raw1 = dashMatch[1].trim();
    const raw2 = dashMatch[2].trim();
    const t1 = findTeamInText(raw1);
    const t2 = findTeamInText(raw2);
    if (t1 && t2 && normalizeName(t1) !== normalizeName(t2)) {
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

export function detectDate(text) {
  const match = text.match(/(\d{1,2})[/](\d{1,2})[/](\d{2,4})/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    const year = match[3].length === 2 ? '20' + match[3] : match[3];
    return `${year}-${month}-${day}`;
  }
  const lower = text.toLowerCase();
  if (lower.includes('hoy') || lower.includes('today')) {
    return new Date().toISOString().split('T')[0];
  }
  if (lower.includes('mañana') || lower.includes('tomorrow')) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }
  return null;
}

export function detectCompetition(text) {
  const lower = text.toLowerCase();
  for (const [keyword, name] of Object.entries(COMPETITION_KEYWORDS)) {
    if (lower.includes(keyword)) {
      return name;
    }
  }
  return null;
}

export function hasIntent(text) {
  const lower = text.toLowerCase();
  return INTENT_KEYWORDS.some(kw => lower.includes(kw));
}
