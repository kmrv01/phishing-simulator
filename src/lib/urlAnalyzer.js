import { clamp } from "./risk";

const typoBrands = ["instagrarn", "telegrern", "micr0soft", "paypai", "paypaI"];
const suspiciousWords = ["verify", "secure", "session", "auth", "confirm", "urgent", "login", "signin", "account", "unlock", "recovery"];
const protectedBrands = {
  instagram: ["instagram.com", "www.instagram.com"],
  telegram: ["telegram.org", "my.telegram.org", "web.telegram.org"],
  microsoft: ["microsoft.com", "login.microsoftonline.com", "office.com", "outlook.com"],
  paypal: ["paypal.com", "www.paypal.com"],
  bank: ["bank.kz", "www.bank.kz"],
};
const freeHostingHints = [
  "infinityfreeapp.com",
  "000webhostapp.com",
  "netlify.app",
  "pages.dev",
  "github.io",
  "vercel.app",
  "wuaze.com",
  "atwebpages.com",
  "rf.gd",
  "epizy.com",
  "byethost.com",
  "weebly.com",
  "wixsite.com",
  "blogspot.com",
];
const suspiciousTlds = [".xyz", ".top", ".click", ".shop", ".site", ".online", ".live", ".icu", ".buzz"];

function getBaseDomain(hostname) {
  const parts = hostname.split(".").filter(Boolean);
  if (parts.length <= 2) return hostname;
  return parts.slice(-2).join(".");
}

function findBrandMentions(hostname, path, search) {
  return Object.keys(protectedBrands).filter((brand) => hostname.includes(brand) || path.includes(brand) || search.includes(brand));
}

function normalizeLookalikes(value) {
  return value
    .toLowerCase()
    .replaceAll("0", "o")
    .replaceAll("1", "l")
    .replaceAll("3", "e")
    .replaceAll("5", "s")
    .replaceAll("$", "s")
    .replaceAll("@", "a")
    .replaceAll("vv", "w")
    .replaceAll("rn", "m");
}

function levenshteinDistance(a, b) {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let i = 0; i < rows; i += 1) matrix[i][0] = i;
  for (let j = 0; j < cols; j += 1) matrix[0][j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
}

function findBrandConfusion(hostname) {
  const labels = hostname
    .split(/[.-]/)
    .map((item) => item.trim())
    .filter(Boolean);

  for (const label of labels) {
    const normalizedLabel = normalizeLookalikes(label);
    for (const brand of Object.keys(protectedBrands)) {
      if (label === brand || normalizedLabel === brand) continue;
      const distance = levenshteinDistance(normalizedLabel, brand);
      if (distance <= 2 || normalizedLabel.includes(brand) || brand.includes(normalizedLabel)) {
        return { label, brand, distance };
      }
    }
  }

  return null;
}

export function analyzeUrl(rawValue) {
  const value = rawValue.trim();
  if (!value) {
    return {
      valid: false,
      normalizedUrl: "",
      checks: [],
      score: 0,
      risk: "low",
    };
  }

  let parsed;
  try {
    parsed = new URL(value.startsWith("http") ? value : `https://${value}`);
  } catch {
    return {
      valid: false,
      normalizedUrl: value,
      checks: [{ label: "Формат URL", verdict: "Ссылка введена в неверном формате", risk: "high" }],
      score: 85,
      risk: "high",
    };
  }

  const hostname = parsed.hostname.toLowerCase();
  const baseDomain = getBaseDomain(hostname);
  const search = parsed.search.toLowerCase();
  const path = parsed.pathname.toLowerCase();
  const scoreParts = [];

  const addCheck = (label, verdict, score, risk) => {
    scoreParts.push({ label, verdict, score, risk });
  };

  const hasTypoBrand = typoBrands.some((brand) => hostname.includes(brand.toLowerCase()));
  const brandConfusion = findBrandConfusion(hostname);
  addCheck(
    "Подмена бренда",
    hasTypoBrand || brandConfusion
      ? `Обнаружено похожее написание бренда${brandConfusion ? `: ${brandConfusion.label} похоже на ${brandConfusion.brand}` : ""}`
      : "Явных искажений известного бренда не найдено",
    hasTypoBrand || brandConfusion ? 36 : 2,
    hasTypoBrand || brandConfusion ? "high" : "low"
  );

  const longToken = Array.from(parsed.searchParams.values()).some((token) => token.length > 24);
  addCheck(
    "Query token",
    longToken ? "В query string есть длинный токен или идентификатор" : "Подозрительно длинных токенов нет",
    longToken ? 18 : 1,
    longToken ? "medium" : "low"
  );

  const usesHttp = parsed.protocol === "http:";
  addCheck(
    "HTTP vs HTTPS",
    usesHttp ? "Используется небезопасный протокол HTTP" : "Используется HTTPS",
    usesHttp ? 22 : 1,
    usesHttp ? "high" : "low"
  );

  const extraSubdomains = hostname.split(".").length > 3;
  addCheck(
    "Поддоменная маскировка",
    extraSubdomains ? "У домена много уровней, возможна маскировка бренда в поддомене" : "Поддоменная структура выглядит обычно",
    extraSubdomains ? 16 : 2,
    extraSubdomains ? "medium" : "low"
  );

  const suspiciousKeywordHits = suspiciousWords.filter((word) => hostname.includes(word) || search.includes(word) || path.includes(word));
  addCheck(
    "Подозрительные слова",
    suspiciousKeywordHits.length
      ? `Найдены слова: ${suspiciousKeywordHits.slice(0, 4).join(", ")}`
      : "Подозрительных слов не найдено",
    suspiciousKeywordHits.length ? 14 : 1,
    suspiciousKeywordHits.length ? "medium" : "low"
  );

  const punycode = hostname.includes("xn--");
  addCheck(
    "Punycode",
    punycode ? "Обнаружен xn--, возможна визуальная подмена домена" : "Punycode не найден",
    punycode ? 24 : 1,
    punycode ? "high" : "low"
  );

  const brandMentions = findBrandMentions(hostname, path, search);
  if (brandConfusion && !brandMentions.includes(brandConfusion.brand)) {
    brandMentions.push(brandConfusion.brand);
  }
  const suspiciousBrandEmbedding = brandMentions.some((brand) => {
    const officialHosts = protectedBrands[brand];
    return !officialHosts.includes(hostname) && !officialHosts.includes(baseDomain);
  });
  addCheck(
    "Сходство с официальным доменом",
    suspiciousBrandEmbedding
      ? "В ссылке упоминается известный бренд, но реальный домен не совпадает с официальным"
      : "Явной опасной подмены официального домена не найдено",
    suspiciousBrandEmbedding ? 38 : 2,
    suspiciousBrandEmbedding ? "high" : "low"
  );

  const freeHosting = freeHostingHints.some((hint) => hostname === hint || hostname.endsWith(`.${hint}`) || baseDomain === hint);
  addCheck(
    "Хостинг-домен",
    freeHosting ? "Ссылка размещена на бесплатном или массовом хостинге, что часто встречается во фишинге" : "Хостинг не выглядит типичным бесплатным доменом",
    freeHosting ? 28 : 2,
    freeHosting ? "high" : "low"
  );

  const suspiciousTld = suspiciousTlds.some((tld) => hostname.endsWith(tld));
  addCheck(
    "Доменная зона",
    suspiciousTld ? "Используется доменная зона, которая часто встречается в фишинговых ссылках" : "Доменная зона не выглядит аномальной",
    suspiciousTld ? 12 : 1,
    suspiciousTld ? "medium" : "low"
  );

  const rootDomainMismatch = brandMentions.length > 0 && suspiciousBrandEmbedding && hostname.split(".")[0].includes(brandMentions[0]);
  addCheck(
    "Бренд в поддомене",
    rootDomainMismatch
      ? "Название бренда вынесено в поддомен, а основной домен принадлежит другому сервису"
      : "Бренд не выглядит вынесенным в чужой поддомен",
    rootDomainMismatch ? 30 : 1,
    rootDomainMismatch ? "high" : "low"
  );

  const deceptiveRootDomain = brandMentions.length > 0 && !Object.values(protectedBrands).flat().includes(baseDomain);
  addCheck(
    "Корневой домен",
    deceptiveRootDomain
      ? `Корневой домен ${baseDomain} не относится к официальным доменам бренда`
      : "Корневой домен не вызывает явных сомнений",
    deceptiveRootDomain ? 26 : 1,
    deceptiveRootDomain ? "high" : "low"
  );

  const score = clamp(scoreParts.reduce((sum, item) => sum + item.score, 0));
  const highSignals = scoreParts.filter((item) => item.risk === "high").length;
  const mediumSignals = scoreParts.filter((item) => item.risk === "medium").length;
  const risk = score >= 70 || highSignals >= 2 ? "high" : score >= 35 || mediumSignals >= 2 ? "medium" : "low";

  return {
    valid: true,
    normalizedUrl: parsed.toString(),
    checks: scoreParts,
    score,
    risk,
  };
}
