/**
 * Cartiva Mini — Nigerian Location Normalizer & Address Validation Engine
 *
 * Provides authoritative normalization for Nigerian states, major metropolitan cities,
 * and regional postal entities. Eliminates arbitrary fallbacks and ensures consistent
 * canonical representation for shipping zone matching and checkout delivery verification.
 */

export const CANONICAL_NIGERIAN_STATES = [
  'Abia',
  'Adamawa',
  'Akwa Ibom',
  'Anambra',
  'Bauchi',
  'Bayelsa',
  'Benue',
  'Borno',
  'Cross River',
  'Delta',
  'Ebonyi',
  'Edo',
  'Ekiti',
  'Enugu',
  'FCT - Abuja',
  'Gombe',
  'Imo',
  'Jigawa',
  'Kaduna',
  'Kano',
  'Katsina',
  'Kebbi',
  'Kogi',
  'Kwara',
  'Lagos',
  'Nasarawa',
  'Niger',
  'Ogun',
  'Ondo',
  'Osun',
  'Oyo',
  'Plateau',
  'Rivers',
  'Sokoto',
  'Taraba',
  'Yobe',
  'Zamfara',
] as const;

export type CanonicalNigerianState = (typeof CANONICAL_NIGERIAN_STATES)[number];

// State alias mappings (case-insensitive keys stripped of whitespace and punctuation)
const STATE_ALIASES: Record<string, CanonicalNigerianState> = {
  // Rivers
  rivers: 'Rivers',
  riversstate: 'Rivers',
  riverstate: 'Rivers',
  river: 'Rivers',
  rv: 'Rivers',

  // Lagos
  lagos: 'Lagos',
  lagosstate: 'Lagos',
  lasgidi: 'Lagos',
  eko: 'Lagos',
  lag: 'Lagos',

  // FCT - Abuja
  fct: 'FCT - Abuja',
  abuja: 'FCT - Abuja',
  fctabuja: 'FCT - Abuja',
  abujafct: 'FCT - Abuja',
  federalcapitalterritory: 'FCT - Abuja',
  fctabujastate: 'FCT - Abuja',

  // South-South & Niger Delta
  delta: 'Delta',
  deltastate: 'Delta',
  edo: 'Edo',
  edostate: 'Edo',
  bayelsa: 'Bayelsa',
  bayelsastate: 'Bayelsa',
  akwaibom: 'Akwa Ibom',
  akwaibomstate: 'Akwa Ibom',
  crossriver: 'Cross River',
  crossriverstate: 'Cross River',

  // South-West
  ogun: 'Ogun',
  ogunstate: 'Ogun',
  oyo: 'Oyo',
  oyostate: 'Oyo',
  osun: 'Osun',
  osunstate: 'Osun',
  ondo: 'Ondo',
  ondostate: 'Ondo',
  ekiti: 'Ekiti',
  ekitistate: 'Ekiti',

  // South-East
  enugu: 'Enugu',
  enugustate: 'Enugu',
  anambra: 'Anambra',
  anambrastate: 'Anambra',
  imo: 'Imo',
  imostate: 'Imo',
  abia: 'Abia',
  abiastate: 'Abia',
  ebonyi: 'Ebonyi',
  ebonyistate: 'Ebonyi',

  // North-Central
  nasarawa: 'Nasarawa',
  nasarawastate: 'Nasarawa',
  niger: 'Niger',
  nigerstate: 'Niger',
  kogi: 'Kogi',
  kogistate: 'Kogi',
  kwara: 'Kwara',
  kwarastate: 'Kwara',
  plateau: 'Plateau',
  plateaustate: 'Plateau',
  benue: 'Benue',
  benuestate: 'Benue',

  // North-West
  kano: 'Kano',
  kanostate: 'Kano',
  kaduna: 'Kaduna',
  kadunastate: 'Kaduna',
  katsina: 'Katsina',
  katsinastate: 'Katsina',
  kebbi: 'Kebbi',
  kebbistate: 'Kebbi',
  sokoto: 'Sokoto',
  sokotostate: 'Sokoto',
  zamfara: 'Zamfara',
  zamfarastate: 'Zamfara',
  jigawa: 'Jigawa',
  jigawastate: 'Jigawa',

  // North-East
  bauchi: 'Bauchi',
  bauchistate: 'Bauchi',
  borno: 'Borno',
  bornostate: 'Borno',
  adamawa: 'Adamawa',
  adamawastate: 'Adamawa',
  taraba: 'Taraba',
  tarabastate: 'Taraba',
  yobe: 'Yobe',
  yobestate: 'Yobe',
  gombe: 'Gombe',
  gombestate: 'Gombe',
};

// Major City / Locality aliases with default associated state
interface CityMetadata {
  canonicalCity: string;
  associatedState: CanonicalNigerianState;
}

const CITY_METADATA_MAP: Record<string, CityMetadata> = {
  // Port Harcourt / Rivers State localities
  portharcourt: { canonicalCity: 'Port Harcourt', associatedState: 'Rivers' },
  'port-harcourt': { canonicalCity: 'Port Harcourt', associatedState: 'Rivers' },
  phc: { canonicalCity: 'Port Harcourt', associatedState: 'Rivers' },
  pitakwa: { canonicalCity: 'Port Harcourt', associatedState: 'Rivers' },
  rumunduru: { canonicalCity: 'Port Harcourt', associatedState: 'Rivers' },
  diobu: { canonicalCity: 'Port Harcourt', associatedState: 'Rivers' },
  rumuokwuta: { canonicalCity: 'Port Harcourt', associatedState: 'Rivers' },
  choba: { canonicalCity: 'Port Harcourt', associatedState: 'Rivers' },
  woji: { canonicalCity: 'Port Harcourt', associatedState: 'Rivers' },
  elelenwo: { canonicalCity: 'Port Harcourt', associatedState: 'Rivers' },
  transamadi: { canonicalCity: 'Port Harcourt', associatedState: 'Rivers' },
  rumuigbo: { canonicalCity: 'Port Harcourt', associatedState: 'Rivers' },
  bonny: { canonicalCity: 'Bonny', associatedState: 'Rivers' },
  obioakpor: { canonicalCity: 'Port Harcourt', associatedState: 'Rivers' },

  // Lagos Metropolitan localities
  lagos: { canonicalCity: 'Lagos', associatedState: 'Lagos' },
  ikeja: { canonicalCity: 'Ikeja', associatedState: 'Lagos' },
  lekki: { canonicalCity: 'Lekki', associatedState: 'Lagos' },
  victoriaisland: { canonicalCity: 'Victoria Island', associatedState: 'Lagos' },
  ikoyi: { canonicalCity: 'Ikoyi', associatedState: 'Lagos' },
  surulere: { canonicalCity: 'Surulere', associatedState: 'Lagos' },
  yaba: { canonicalCity: 'Yaba', associatedState: 'Lagos' },
  ajah: { canonicalCity: 'Ajah', associatedState: 'Lagos' },
  maryland: { canonicalCity: 'Maryland', associatedState: 'Lagos' },
  gbagada: { canonicalCity: 'Gbagada', associatedState: 'Lagos' },
  magodo: { canonicalCity: 'Magodo', associatedState: 'Lagos' },
  festac: { canonicalCity: 'Festac', associatedState: 'Lagos' },
  ikorodu: { canonicalCity: 'Ikorodu', associatedState: 'Lagos' },
  epe: { canonicalCity: 'Epe', associatedState: 'Lagos' },
  alimosho: { canonicalCity: 'Alimosho', associatedState: 'Lagos' },
  apapa: { canonicalCity: 'Apapa', associatedState: 'Lagos' },

  // Abuja / FCT localities
  abuja: { canonicalCity: 'Abuja', associatedState: 'FCT - Abuja' },
  garki: { canonicalCity: 'Abuja', associatedState: 'FCT - Abuja' },
  wuse: { canonicalCity: 'Abuja', associatedState: 'FCT - Abuja' },
  maitama: { canonicalCity: 'Abuja', associatedState: 'FCT - Abuja' },
  asokoro: { canonicalCity: 'Abuja', associatedState: 'FCT - Abuja' },
  jabi: { canonicalCity: 'Abuja', associatedState: 'FCT - Abuja' },
  utako: { canonicalCity: 'Abuja', associatedState: 'FCT - Abuja' },
  gwarinpa: { canonicalCity: 'Abuja', associatedState: 'FCT - Abuja' },
  kubwa: { canonicalCity: 'Kubwa', associatedState: 'FCT - Abuja' },
  lugbe: { canonicalCity: 'Lugbe', associatedState: 'FCT - Abuja' },

  // Other major commercial cities
  ibadan: { canonicalCity: 'Ibadan', associatedState: 'Oyo' },
  kano: { canonicalCity: 'Kano', associatedState: 'Kano' },
  kaduna: { canonicalCity: 'Kaduna', associatedState: 'Kaduna' },
  benincity: { canonicalCity: 'Benin City', associatedState: 'Edo' },
  benin: { canonicalCity: 'Benin City', associatedState: 'Edo' },
  warri: { canonicalCity: 'Warri', associatedState: 'Delta' },
  asaba: { canonicalCity: 'Asaba', associatedState: 'Delta' },
  enugu: { canonicalCity: 'Enugu', associatedState: 'Enugu' },
  onitsha: { canonicalCity: 'Onitsha', associatedState: 'Anambra' },
  awka: { canonicalCity: 'Awka', associatedState: 'Anambra' },
  abeokuta: { canonicalCity: 'Abeokuta', associatedState: 'Ogun' },
  uyo: { canonicalCity: 'Uyo', associatedState: 'Akwa Ibom' },
  calabar: { canonicalCity: 'Calabar', associatedState: 'Cross River' },
  owerri: { canonicalCity: 'Owerri', associatedState: 'Imo' },
  jos: { canonicalCity: 'Jos', associatedState: 'Plateau' },
  ilorin: { canonicalCity: 'Ilorin', associatedState: 'Kwara' },
};

export interface NormalizedAddressLocation {
  city: string;
  state: string;
  country: string;
  isRecognizedState: boolean;
  isRecognizedCity: boolean;
  rawCity: string;
  rawState: string;
}

/**
 * Normalizes state and city inputs safely against Nigerian administrative geography.
 * Never defaults an unrecognized state or city to Lagos or any arbitrary value.
 */
export function normalizeNigerianLocation(
  rawStateInput: string | undefined,
  rawCityInput?: string | undefined,
  rawStreetAddress?: string | undefined,
  rawCountryInput = 'Nigeria'
): NormalizedAddressLocation {
  const trimmedState = (rawStateInput || '').trim();
  const trimmedCity = (rawCityInput || '').trim();
  const trimmedStreet = (rawStreetAddress || '').trim().toLowerCase();
  const trimmedCountry = (rawCountryInput || 'Nigeria').trim();

  // Normalize state key by removing all whitespace, hyphens, and non-alphanumeric chars
  const cleanStateKey = trimmedState.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanCityKey = trimmedCity.toLowerCase().replace(/[^a-z0-9]/g, '');

  let resolvedState: string = trimmedState;
  let resolvedCity: string = trimmedCity;
  let isRecognizedState = false;
  let isRecognizedCity = false;

  // 1. Direct state lookup
  if (cleanStateKey && STATE_ALIASES[cleanStateKey]) {
    resolvedState = STATE_ALIASES[cleanStateKey];
    isRecognizedState = true;
  }

  // 2. City lookup and reconciliation
  if (cleanCityKey && CITY_METADATA_MAP[cleanCityKey]) {
    const meta = CITY_METADATA_MAP[cleanCityKey];
    resolvedCity = meta.canonicalCity;
    isRecognizedCity = true;

    // If state was missing, ambiguous, or empty, infer from recognized city
    if (!isRecognizedState) {
      resolvedState = meta.associatedState;
      isRecognizedState = true;
    }
  }

  // 3. Street Address Context Check:
  // If street address explicitly specifies "Port Harcourt" or "Rumunduru" or "Rivers State",
  // and state was incorrectly assigned to Lagos (e.g. from an old form placeholder or pre-filled address),
  // reconcile accurately to Port Harcourt, Rivers State.
  if (
    trimmedStreet.includes('port harcourt') ||
    trimmedStreet.includes('portharcourt') ||
    trimmedStreet.includes('rumunduru') ||
    trimmedStreet.includes('rivers state') ||
    trimmedStreet.includes('river state')
  ) {
    if (resolvedState === 'Lagos' || !isRecognizedState) {
      resolvedState = 'Rivers';
      isRecognizedState = true;
      if (!resolvedCity || resolvedCity.toLowerCase() === 'lagos') {
        resolvedCity = 'Port Harcourt';
        isRecognizedCity = true;
      }
    }
  }

  // If city was in lowercase or rough format, capitalize words properly
  if (!isRecognizedCity && resolvedCity) {
    resolvedCity = resolvedCity
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  return {
    city: resolvedCity || 'Unknown',
    state: resolvedState,
    country: trimmedCountry,
    isRecognizedState,
    isRecognizedCity,
    rawCity: trimmedCity,
    rawState: trimmedState,
  };
}

/**
 * Generates regular expression match patterns for a destination state
 * to match against ShippingConfiguration.statesCovered arrays.
 * Handles variations such as "Rivers", "Rivers State", "All", and wildcard "*".
 */
export function buildStateMatchingRegex(state: string): RegExp {
  const normalized = normalizeNigerianLocation(state);
  const canonical = normalized.state;
  const escapedCanonical = canonical.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Build pattern supporting canonical, with or without "State", and wildcards
  const patterns = [
    `^${escapedCanonical}$`,
    `^${escapedCanonical}\\s+State$`,
    `^${escapedCanonical.replace(/\\s+State$/, '')}$`,
    `^\\*$`,
    `^all$`,
    `^nationwide$`,
  ];

  // Specific aliases for common states
  if (canonical === 'Rivers') {
    patterns.push('^River\\s+State$', '^Rivers$', '^Rivers\\s+State$');
  } else if (canonical === 'FCT - Abuja') {
    patterns.push('^Abuja$', '^FCT$', '^Federal\\s+Capital\\s+Territory$');
  } else if (canonical === 'Lagos') {
    patterns.push('^Lagos$', '^Lagos\\s+State$');
  }

  return new RegExp(patterns.join('|'), 'i');
}

