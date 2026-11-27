/**
 * Airwallex 收单工具库：环境路由、Token 缓存（20分钟刷新）与国家代码标准化
 */
import type { Env } from './env';

interface CachedToken {
  token: string;
  expiresAt: number;
  envKey: string;
}

let memoryTokenCache: CachedToken | null = null;

export function getAirwallexBaseUrl(env: Env): string {
  const mode = (env.AIRWALLEX_ENV || 'demo').toLowerCase();
  return mode === 'prod' || mode === 'production'
    ? 'https://api.airwallex.com'
    : 'https://api-demo.airwallex.com';
}

export function generateRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'req_' + Date.now() + '_' + Math.random().toString(36).slice(2, 12);
}

/**
 * 获取 Airwallex Access Token（文档要求：有效期 30 分钟，缓存并在 20 分钟后刷新）
 */
export async function getAirwallexAccessToken(env: Env): Promise<string> {
  const clientId = env.AIRWALLEX_CLIENT_ID || '';
  const apiKey = env.AIRWALLEX_API_KEY || '';
  const baseUrl = getAirwallexBaseUrl(env);
  const envKey = `${baseUrl}:${clientId}`;

  const now = Date.now();
  if (memoryTokenCache && memoryTokenCache.envKey === envKey && now < memoryTokenCache.expiresAt) {
    return memoryTokenCache.token;
  }

  const res = await fetch(`${baseUrl}/api/v1/authentication/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-client-id': clientId,
      'x-api-key': apiKey,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Airwallex auth failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  if (!data?.token) {
    throw new Error('Airwallex auth response missing token');
  }

  // 缓存 20 分钟（1200 秒）
  memoryTokenCache = {
    token: data.token,
    expiresAt: now + 20 * 60 * 1000,
    envKey,
  };

  return data.token;
}

export function normalizeCountryCode(country: string): string {
  if (!country) return 'US';
  const trimmed = country.trim();
  const upper = trimmed.toUpperCase();

  if (upper.length === 2 && /^[A-Z]{2}$/.test(upper)) {
    return upper;
  }

  const countryMap: Record<string, string> = {
    'ALBANIA': 'AL', 'ALGERIA': 'DZ', 'AMERICAN SAMOA': 'AS', 'ANDORRA': 'AD', 'ANGOLA': 'AO',
    'ARGENTINA': 'AR', 'ARMENIA': 'AM', 'AUSTRALIA': 'AU', 'AUSTRIA': 'AT', 'BAHRAIN': 'BH',
    'BANGLADESH': 'BD', 'BARBADOS': 'BB', 'BELARUS': 'BY', 'BELGIUM': 'BE', 'BENIN': 'BJ',
    'BOLIVIA': 'BO', 'BRAZIL': 'BR', 'BRUNEI': 'BN', 'BULGARIA': 'BG', 'CANADA': 'CA',
    'CAPE VERDE': 'CV', 'CHAD': 'TD', 'CHILE': 'CL', 'CHINA': 'CN',
    'CHINA (HONG KONG)': 'HK', 'HONG KONG': 'HK', 'CHINA (MACAO)': 'MO', 'MACAO': 'MO',
    'COLLECTIVITY OF SAINT MARTIN': 'MF', 'COLOMBIA': 'CO', 'COSTA RICA': 'CR', 'CROATIA': 'HR',
    'CYPRUS': 'CY', 'CZECH REPUBLIC': 'CZ', 'CÔTE D\'IVOIRE': 'CI', 'COTE D\'IVOIRE': 'CI',
    'DEMOCRATIC REPUBLIC OF THE CONGO': 'CD', 'DENMARK': 'DK', 'ECUADOR': 'EC', 'EGYPT': 'EG',
    'EL SALVADOR': 'SV', 'ESTONIA': 'EE', 'ESWATINI': 'SZ', 'FAROE ISLANDS': 'FO', 'FIJI': 'FJ',
    'FINLAND': 'FI', 'FRANCE': 'FR', 'FRENCH GUIANA': 'GF', 'FRENCH POLYNESIA': 'PF',
    'GAMBIA': 'GM', 'GEORGIA': 'GE', 'GERMANY': 'DE', 'GHANA': 'GH', 'GREECE': 'GR',
    'GRENADA': 'GD', 'GUADELOUPE': 'GP', 'GUATEMALA': 'GT', 'HONDURAS': 'HN', 'HUNGARY': 'HU',
    'ICELAND': 'IS', 'INDONESIA': 'ID', 'IRAQ': 'IQ', 'IRELAND': 'IE', 'ISRAEL': 'IL',
    'ITALY': 'IT', 'JAPAN': 'JP', 'JORDAN': 'JO', 'KAZAKHSTAN': 'KZ', 'KENYA': 'KE',
    'KUWAIT': 'KW', 'LAOS': 'LA', 'LATVIA': 'LV', 'LEBANON': 'LB', 'LESOTHO': 'LS',
    'LIBERIA': 'LR', 'LIBYA': 'LY', 'LIECHTENSTEIN': 'LI', 'LITHUANIA': 'LT', 'LUXEMBOURG': 'LU',
    'MADAGASCAR': 'MG', 'MALAWI': 'MW', 'MALAYSIA': 'MY', 'MALDIVES': 'MV', 'MALI': 'ML',
    'MALTA': 'MT', 'MARSHALL ISLANDS': 'MH', 'MARTINIQUE': 'MQ', 'MAURITANIA': 'MR',
    'MAURITIUS': 'MU', 'MAYOTTE': 'YT', 'MEXICO': 'MX', 'MICRONESIA': 'FM', 'MOLDOVA': 'MD',
    'MOROCCO': 'MA', 'MOZAMBIQUE': 'MZ', 'NAMIBIA': 'NA', 'NEPAL': 'NP', 'NETHERLANDS': 'NL',
    'NEW CALEDONIA': 'NC', 'NEW ZEALAND': 'NZ', 'NICARAGUA': 'NI', 'NIGER': 'NE', 'NIGERIA': 'NG',
    'NORTH MACEDONIA': 'MK', 'NORWAY': 'NO', 'OMAN': 'OM', 'PAKISTAN': 'PK', 'PALAU': 'PW',
    'PANAMA': 'PA', 'PAPUA NEW GUINEA': 'PG', 'PARAGUAY': 'PY', 'PERU': 'PE', 'PHILIPPINES': 'PH',
    'POLAND': 'PL', 'PORTUGAL': 'PT', 'PUERTO RICO': 'PR', 'QATAR': 'QA', 'ROMANIA': 'RO',
    'RWANDA': 'RW', 'RÉUNION': 'RE', 'REUNION': 'RE', 'SAUDI ARABIA': 'SA', 'SENEGAL': 'SN',
    'SERBIA': 'RS', 'SEYCHELLES': 'SC', 'SINGAPORE': 'SG', 'SINT MAARTEN': 'SX', 'SLOVAKIA': 'SK',
    'SLOVENIA': 'SI', 'SOUTH AFRICA': 'ZA', 'SOUTH KOREA': 'KR', 'KOREA': 'KR', 'SPAIN': 'ES',
    'SRI LANKA': 'LK', 'SURINAME': 'SR', 'SWEDEN': 'SE', 'SWITZERLAND': 'CH', 'SYRIA': 'SY',
    'TANZANIA': 'TZ', 'THAILAND': 'TH', 'TRINIDAD AND TOBAGO': 'TT', 'TUNISIA': 'TN',
    'TURKEY': 'TR', 'UGANDA': 'UG', 'UNITED ARAB EMIRATES': 'AE', 'UAE': 'AE',
    'UNITED KINGDOM': 'GB', 'UK': 'GB', 'GREAT BRITAIN': 'GB',
    'UNITED STATES': 'US', 'UNITED STATES OF AMERICA': 'US', 'USA': 'US',
    'URUGUAY': 'UY', 'VENEZUELA': 'VE', 'VIETNAM': 'VN', 'WESTERN SAMOA': 'WS', 'ZAMBIA': 'ZM'
  };

  return countryMap[upper] || 'US';
}