import { clamp } from "./risk";

const typoBrands = ["micr0soft", "telegrern", "instagrarn", "paypai", "paypaI", "nurbanlk"];
const officialDomains = ["microsoft.com", "telegram.org", "instagram.com", "paypal.com", "nurbank.kz", "office.com"];
const suspiciousWords = ["secure", "security", "verify", "auth", "confirm", "support-team"];
const freeMailDomains = ["gmail.com", "outlook.com", "hotmail.com", "mail.ru", "yandex.ru", "yahoo.com"];

export function analyzeSenderEmail(rawValue) {
  const value = rawValue.trim().toLowerCase();

  if (!value) {
    return {
      valid: false,
      normalizedEmail: "",
      score: 0,
      risk: "low",
      checks: [],
    };
  }

  const match = value.match(/^([a-z0-9._%+-]+)@([a-z0-9.-]+\.[a-z]{2,})$/i);
  if (!match) {
    return {
      valid: false,
      normalizedEmail: value,
      score: 84,
      risk: "high",
      checks: [{ label: "Формат email", verdict: "Адрес выглядит некорректно или не содержит нормальный домен.", risk: "high" }],
    };
  }

  const [, localPart, domain] = match;
  const checks = [];

  const addCheck = (label, verdict, score, risk) => {
    checks.push({ label, verdict, score, risk });
  };

  const hasTypoBrand = typoBrands.some((brand) => domain.includes(brand.toLowerCase()));
  addCheck(
    "Похожесть на бренд",
    hasTypoBrand ? "Домен похож на известный бренд, но написан с подменой символов." : "Явной подмены символов в бренде не найдено.",
    hasTypoBrand ? 34 : 4,
    hasTypoBrand ? "high" : "low"
  );

  const looksLikeBrandButNotOfficial = /(microsoft|telegram|instagram|paypal|nurbank|office)/i.test(domain) && !officialDomains.includes(domain);
  addCheck(
    "Официальный домен",
    looksLikeBrandButNotOfficial ? "Адрес похож на брендовый, но домен не совпадает с официальным." : "Либо домен официальный, либо не маскируется под известный бренд.",
    looksLikeBrandButNotOfficial ? 24 : officialDomains.includes(domain) ? 0 : 6,
    looksLikeBrandButNotOfficial ? "high" : officialDomains.includes(domain) ? "low" : "low"
  );

  const extraSubdomains = domain.split(".").length > 2;
  addCheck(
    "Поддоменная маскировка",
    extraSubdomains ? "У адреса несколько уровней домена, стоит проверить, где находится реальный бренд." : "Доменная структура выглядит обычно.",
    extraSubdomains ? 12 : 2,
    extraSubdomains ? "medium" : "low"
  );

  const suspiciousLocalPart = suspiciousWords.some((word) => localPart.includes(word));
  addCheck(
    "Имя отправителя",
    suspiciousLocalPart ? "Локальная часть email давит на доверие через слова secure / verify / auth." : "Локальная часть адреса не выглядит навязчиво.",
    suspiciousLocalPart ? 10 : 2,
    suspiciousLocalPart ? "medium" : "low"
  );

  const freeMailAbuse = freeMailDomains.includes(domain) && /(support|helpdesk|security|admin|billing)/i.test(localPart);
  addCheck(
    "Корпоративность отправителя",
    freeMailAbuse ? "Служебный отправитель использует публичную почту. Для официальной поддержки это подозрительно." : "Явного конфликта между ролью отправителя и доменом не найдено.",
    freeMailAbuse ? 14 : 3,
    freeMailAbuse ? "medium" : "low"
  );

  const score = clamp(checks.reduce((sum, item) => sum + item.score, 0));
  const risk = score >= 65 ? "high" : score >= 35 ? "medium" : "low";

  return {
    valid: true,
    normalizedEmail: `${localPart}@${domain}`,
    score,
    risk,
    checks,
  };
}
