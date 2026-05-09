import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileWarning,
  Flame,
  LayoutDashboard,
  Link2,
  Mail,
  SearchCheck,
  Siren,
  Smartphone,
  Sparkles,
  Trophy,
  UserRound,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "./components/ui/alert";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Progress } from "./components/ui/progress";
import { ChartsPanel } from "./components/charts-panel";
import { ComparisonPage } from "./components/comparison-page";
import { EmailAnalyzerPanel } from "./components/email-analyzer-panel";
import { HistoryLog } from "./components/history-log";
import { UrlAnalyzerPanel } from "./components/url-analyzer-panel";
import { attackTypes, buildScenarioItems, defaultCampaigns, scenarioDifficulties } from "./data/scenarios";
import { mockAdminUsers } from "./data/mockUsers";
import {
  buildAttackTypeStats,
  buildAchievementStats,
  buildBehaviorProfile,
  buildMistakeInsights,
  buildOutcomeBreakdown,
  buildGamificationStats,
  buildProgressSeries,
  buildRiskMetrics,
  getRiskStatus,
  outcomeLabels,
} from "./lib/risk";
import {
  deleteUser,
  formatDate,
  hydrateAppStorage,
  loginUser,
  migrateLegacyStorageToServer,
  readStorage,
  registerUser,
  saveAttempt,
  STORAGE_KEYS,
  updateUser,
  writeStorage,
} from "./lib/storage";

const THEORY_SECTIONS = [
  {
    title: "Что такое фишинг",
    body:
      "Фишинг — это атака социальной инженерии, когда злоумышленник маскируется под доверенный сервис, человека или бренд и заставляет пользователя перейти по ссылке, открыть файл или отдать секретные данные.",
    tone: "bg-sky-50 border-sky-200 text-sky-950",
  },
  {
    title: "Как думает осторожный сотрудник",
    body:
      "Не верит только внешнему виду письма. Проверяет sender, домен, логику экрана входа, момент запроса 2FA и наличие срочности или давления.",
    tone: "bg-emerald-50 border-emerald-200 text-emerald-950",
  },
  {
    title: "Ключевой UX-признак",
    body:
      "Если страница одновременно просит пароль и код 2FA, это сильный индикатор риска. У безопасных корпоративных сервисов второй фактор часто вынесен на следующий экран.",
    tone: "bg-amber-50 border-amber-200 text-amber-950",
  },
];

const THEORY_FAQ = [
  {
    q: "Письмо выглядит идеально и без ошибок. Это все равно может быть фишинг?",
    a: "Да. Современные фишинговые письма часто визуально аккуратные. Смотрите не на грамматику, а на sender, домен и поведение формы.",
  },
  {
    q: "Почему нельзя доверять только логотипу и фирменным цветам?",
    a: "Потому что их очень легко скопировать. Настоящую проверку дают только независимые признаки: адрес отправителя, URL и логика авторизации.",
  },
  {
    q: "Что делать, если я уже ввел пароль на подозрительной странице?",
    a: "Немедленно сменить пароль на официальном сервисе, завершить активные сессии и сообщить в IT или ИБ.",
  },
  {
    q: "Если письмо пришло с знакомого имени, можно ли ему доверять?",
    a: "Не сразу. Имя отправителя можно подделать. Всегда проверяйте полный email и домен отправителя.",
  },
  {
    q: "Почему опасно вводить пароль и 2FA-код на одной странице?",
    a: "Так злоумышленник получает оба секрета сразу. У легитимных сервисов второй фактор часто запрашивается отдельным шагом.",
  },
  {
    q: "Можно ли считать письмо безопасным, если оно пришло по рабочей теме?",
    a: "Нет. Фишинг как раз часто маскируется под реальные рабочие процессы: бонусы, документы, логины, подписи и счета.",
  },
  {
    q: "Что безопаснее: открыть ссылку из письма или зайти на сервис вручную?",
    a: "Если есть сомнение, безопаснее открыть официальный портал вручную из закладок или через известный адрес, а не по ссылке из письма.",
  },
  {
    q: "Опасны ли короткие ссылки и сокращатели URL?",
    a: "Да, потому что они скрывают реальный адрес назначения. Перед переходом нужно раскрыть и проверить фактический домен.",
  },
  {
    q: "Что делать, если письмо требует срочного перевода денег или подтверждения платежа?",
    a: "Подтверждать такой запрос по независимому каналу связи: по телефону, через мессенджер или внутренний портал компании.",
  },
  {
    q: "Почему QR-код тоже может быть фишингом?",
    a: "Потому что до сканирования пользователь не видит URL. После перехода телефон может открыть поддельный мобильный лендинг.",
  },
  {
    q: "Если я не кликнул по ссылке, но сообщил о подозрительном письме, это хороший результат?",
    a: "Да. Это один из лучших вариантов поведения: вы не взаимодействовали с атакой и помогли предупредить риск для других.",
  },
];

const PHISHING_TYPE_DETAILS = [
  {
    id: "email-phishing",
    title: "Классический email phishing",
    badge: "Почтовая атака",
    summary: "Массовая рассылка писем от имени банка, IT-поддержки, сервиса доставки или корпоративной системы.",
    description:
      "Это самый распространенный вид фишинга. Злоумышленник рассылает письмо, которое выглядит официально, давит на срочность и подталкивает перейти по ссылке, открыть вложение или ввести данные. Визуально такие письма часто аккуратные, поэтому проверять нужно sender, домен и логику действия.",
    cues: [
      "Похожий, но неофициальный адрес отправителя",
      "Слова urgent, verify, secure, confirm в письме или URL",
      "Запрос пароля, 2FA или платежных данных",
    ],
    example: "Пример: письмо «Microsoft 365: доступ будет ограничен через 2 часа» с ссылкой на поддельный портал.",
    prevention: "Проверять sender, наводить курсор на ссылку, открывать официальный сервис вручную из закладок.",
  },
  {
    id: "spear-phishing",
    title: "Spear phishing",
    badge: "Таргетированная атака",
    summary: "Персонализированная атака на конкретного сотрудника или небольшую группу.",
    description:
      "В отличие от массового фишинга, spear phishing опирается на реальные данные о жертве: имя, должность, отдел, проекты или деловые контакты. Такое письмо выглядит намного убедительнее, потому что использует контекст реальной работы.",
    cues: [
      "Письмо обращается по имени и знает вашу роль",
      "Используется правдоподобный рабочий контекст",
      "Есть просьба срочно подтвердить доступ, документ или выплату",
    ],
    example: "Пример: сотруднику бухгалтерии приходит письмо о бонусах квартала с персональным обращением.",
    prevention: "Проверять контекст через другой канал связи и не доверять письму только потому, что оно персонализировано.",
  },
  {
    id: "ceo-fraud",
    title: "CEO Fraud / Whaling",
    badge: "Атака на руководство",
    summary: "Мошенничество от имени директора, председателя правления или другого авторитетного лица.",
    description:
      "Злоумышленник использует авторитет руководителя и эффект срочности. Пользователю могут приказать перевести деньги, отправить документы, сменить реквизиты или никому не рассказывать о задаче. На защите это хороший пример сочетания социальной инженерии и давления.",
    cues: [
      "Секретность и запрет обсуждать задачу",
      "Давление на скорость: «сделать прямо сейчас»",
      "Нетипичная просьба по финансам или документам",
    ],
    example: "Пример: письмо «Срочно переведите оплату новому подрядчику, я на совещании».",
    prevention: "Любые финансовые запросы от руководства подтверждать по телефону, мессенджеру или внутреннему каналу.",
  },
  {
    id: "smishing-vishing",
    title: "Smishing и Vishing",
    badge: "SMS и звонки",
    summary: "Фишинг через SMS, мессенджеры или голосовые звонки.",
    description:
      "Атака не ограничивается email. Пользователь может получить SMS о доставке, налоге, блокировке карты или звонок от «службы безопасности банка». На мобильных устройствах люди реже проверяют домен, а в звонке сильнее действует авторитет и стресс.",
    cues: [
      "Короткая ссылка в SMS или мессенджере",
      "Просьба срочно назвать код из SMS",
      "Звонящий запрещает класть трубку или консультироваться с коллегами",
    ],
    example: "Пример: SMS «Посылка задержана, подтвердите адрес по ссылке».",
    prevention: "Не переходить по коротким ссылкам из SMS и никогда не диктовать коды подтверждения по телефону.",
  },
  {
    id: "qr-phishing",
    title: "QR phishing",
    badge: "Современный сценарий",
    summary: "Переход на фишинговый сайт происходит через QR-код вместо обычной ссылки.",
    description:
      "Пользователь видит QR-код в письме, презентации или объявлении, сканирует его телефоном и попадает на поддельный сайт. Такой формат опасен тем, что сам URL заранее не виден, а переход часто происходит уже в мобильном браузере.",
    cues: [
      "QR-код предлагается как единственный способ входа или восстановления доступа",
      "После сканирования открывается неожиданный домен",
      "На мобильной странице сразу запрашиваются пароль и код 2FA",
    ],
    example: "Пример: «Сканируйте QR для восстановления корпоративной сессии».",
    prevention: "После сканирования внимательно смотреть домен в браузере и не вводить данные на неизвестной мобильной странице.",
  },
  {
    id: "clone-attachment",
    title: "Clone phishing и вложения-ловушки",
    badge: "Подмена контента",
    summary: "Атакующий копирует знакомое письмо или документ и подменяет ссылку либо файл.",
    description:
      "Жертве приходит письмо, очень похожее на реальную старую переписку, но внутри уже другая ссылка или вложение. Вложения-ловушки часто используют двойные расширения и маскировку под PDF, Word или отчет.",
    cues: [
      "Старый знакомый шаблон письма, но новый sender или URL",
      "Вложение с двойным расширением вроде .docx.exe",
      "Неожиданная просьба открыть файл для подтверждения доступа",
    ],
    example: "Пример: Report_2026.docx.exe вместо обычного документа.",
    prevention: "Проверять полное расширение файла, а не только название, и сверять письмо с предыдущими сообщениями.",
  },
];

function seedAppData() {
  const users = readStorage(STORAGE_KEYS.users, []);
  if (!users.some((item) => item.email === "admin@phishguard.kz")) {
    users.push({
      id: 1000,
      name: "Администратор системы",
      email: "admin@phishguard.kz",
      password: "admin123",
      role: "admin",
      createdAt: new Date().toISOString(),
    });
    writeStorage(STORAGE_KEYS.users, users);
  }
  if (readStorage(STORAGE_KEYS.campaigns, []).length === 0) writeStorage(STORAGE_KEYS.campaigns, defaultCampaigns);
  if (readStorage(STORAGE_KEYS.adminUsers, []).length === 0) writeStorage(STORAGE_KEYS.adminUsers, mockAdminUsers);
  if (!readStorage(STORAGE_KEYS.settings, null)) {
    writeStorage(STORAGE_KEYS.settings, {
      difficultyFilter: "All",
      attackTypeFilter: "All",
      historySort: "date",
    });
  }
}

function getDifficultyClasses(value) {
  if (value === "Hard") return "bg-rose-600 hover:bg-rose-600 text-white";
  if (value === "Medium") return "bg-amber-500 hover:bg-amber-500 text-white";
  return "bg-emerald-600 hover:bg-emerald-600 text-white";
}

function getDifficultyLabel(value) {
  if (value === "Hard") return "Сложный";
  if (value === "Medium") return "Средний";
  if (value === "Easy") return "Легкий";
  return value;
}

function getAttackTypeLabel(value) {
  const labels = {
    All: "Все",
    "Password Reset": "Сброс пароля",
    "Microsoft 365": "Microsoft 365",
    "Finance / Bonus": "Финансы / бонус",
    "CEO Fraud": "Мошенничество от имени CEO",
    Telegram: "Telegram",
    Instagram: "Instagram",
    "QR Phishing": "QR-фишинг",
    Smishing: "Смишинг",
  };
  return labels[value] || value;
}

function getDifficultyTone(value) {
  if (value === "Hard") return "border-rose-200 bg-rose-50 text-rose-700";
  if (value === "Medium") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function buildScenarioDifficultyBreakdown(item) {
  const senderLevel = item.isSpoofed ? (item.displayEmail !== item.senderEmail ? "Hard" : "Medium") : "Easy";
  const urlLevel = item.hasHiddenUrl
    ? item.landingUrl.includes("token=") || item.landingUrl.includes("auth=")
      ? "Hard"
      : "Medium"
    : "Easy";
  const authLevel = item.asksPassword && item.asks2FA && !item.isSafeFlow ? "Hard" : item.asks2FA ? "Medium" : "Easy";
  const pressureLevel = item.asksUrgentAction ? (item.attackType === "CEO Fraud" ? "Hard" : "Medium") : "Easy";
  const dataLevel = item.asksPayment ? "Hard" : item.asksPassword || item.asks2FA ? "Medium" : "Easy";
  const attachmentLevel = item.attachment
    ? /\.exe|\.html|\.hta|\.url|\.scr|\.iso|\.chm|\.docm/i.test(item.attachment.name)
      ? "Hard"
      : "Medium"
    : "Easy";

  return [
    { label: "Общий уровень", value: item.difficulty, hint: "Сводная сложность сценария" },
    { label: "Отправитель", value: senderLevel, hint: item.isSpoofed ? "Есть spoofing или внешний sender" : "Sender выглядит ожидаемо" },
    { label: "Ссылка / URL", value: urlLevel, hint: item.hasHiddenUrl ? "Домен или параметры требуют проверки" : "URL ближе к нормальному сценарию" },
    { label: "Логика входа", value: authLevel, hint: item.isSafeFlow ? "Пошаговый safe flow" : "Есть риск по auth-flow" },
    { label: "Срочность", value: pressureLevel, hint: item.asksUrgentAction ? "Письмо давит на скорость реакции" : "Без сильного давления" },
    { label: "Запрос данных", value: dataLevel, hint: item.asksPayment ? "Запрашиваются платежные данные" : item.asksPassword || item.asks2FA ? "Запрашиваются учетные данные" : "Чувствительные данные не запрашиваются" },
    { label: "Вложения", value: attachmentLevel, hint: item.attachment ? item.attachment.name : "Без вложений" },
  ];
}

const ROLE_LABELS = {
  Finance: "Бухгалтерия / финансы",
  HR: "HR",
  IT: "IT",
  "Executive Office": "Руководство",
  Marketing: "Маркетинг",
  Operations: "Операции",
};

const ROLE_OPTIONS = [
  { value: "Finance", label: "Бухгалтерия / финансы" },
  { value: "HR", label: "HR" },
  { value: "IT", label: "IT" },
  { value: "Executive Office", label: "Руководство" },
  { value: "Marketing", label: "Маркетинг" },
  { value: "Operations", label: "Операции" },
];

function getRoleLabel(value) {
  return ROLE_LABELS[value] || value || "Общая роль";
}

function getUserDepartment(user) {
  return user?.department || null;
}

function prioritizeScenariosForUser(scenarios, user) {
  const department = getUserDepartment(user);
  if (!department) return scenarios;

  return scenarios.slice().sort((a, b) => {
    const aMatch = a.persona?.department === department ? 1 : 0;
    const bMatch = b.persona?.department === department ? 1 : 0;
    if (aMatch !== bMatch) return bMatch - aMatch;
    return 0;
  });
}

function evaluatePasswordStrength(password) {
  const value = String(password || "").trim();
  const checks = [
    { label: "Не менее 8 символов", passed: value.length >= 8 },
    { label: "Есть строчные буквы", passed: /[a-zа-яё]/.test(value) },
    { label: "Есть заглавные буквы", passed: /[A-ZА-ЯЁ]/.test(value) },
    { label: "Есть цифры", passed: /\d/.test(value) },
    { label: "Есть спецсимвол", passed: /[^A-Za-zА-Яа-яЁё0-9]/.test(value) },
  ];

  const score = checks.filter((item) => item.passed).length;
  let label = "Слабый";
  let tone = "rose";

  if (score >= 5) {
    label = "Сильный";
    tone = "emerald";
  } else if (score >= 3) {
    label = "Средний";
    tone = "amber";
  }

  return {
    score,
    label,
    tone,
    checks,
    isAcceptable: score >= 3 && value.length >= 8,
  };
}

function PasswordStrengthHint({ password }) {
  if (!password) return null;

  const strength = evaluatePasswordStrength(password);
  const toneClasses = {
    rose: {
      bar: "bg-rose-500",
      text: "text-rose-600",
      hint: "Пароль слишком простой",
    },
    amber: {
      bar: "bg-amber-500",
      text: "text-amber-600",
      hint: "Пароль средней надежности",
    },
    emerald: {
      bar: "bg-emerald-500",
      text: "text-emerald-600",
      hint: "Пароль надежный",
    },
  }[strength.tone];

  const percent = Math.max(16, Math.round((strength.score / 5) * 100));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <p className="font-medium text-slate-600">Надежность пароля</p>
        <span className={`font-semibold ${toneClasses.text}`}>
          {toneClasses.hint}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full transition-all duration-300 ${toneClasses.bar}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-xs text-slate-500">
        Используйте не менее 8 символов, буквы разного регистра, цифры и специальные символы.
      </p>
    </div>
  );
}

const EXAM_TYPES = [
  {
    id: "standard",
    title: "Стандартное тестирование",
    description: "10 смешанных сценариев: фишинг и безопасные письма примерно 50/50.",
    total: 10,
    badge: "Базовый",
  },
  {
    id: "express",
    title: "Экспресс-тест",
    description: "6 быстрых сценариев для короткой проверки внимательности.",
    total: 6,
    badge: "Быстро",
  },
  {
    id: "advanced",
    title: "Продвинутое тестирование",
    description: "12 более сложных сценариев со средним и высоким уровнем сложности.",
    total: 12,
    badge: "Сложно",
  },
  {
    id: "phishing-only",
    title: "Только фишинговые атаки",
    description: "Проверка умения распознавать именно мошеннические письма и страницы.",
    total: 8,
    badge: "Фишинг",
  },
  {
    id: "safe-only",
    title: "Только безопасные сценарии",
    description: "Проверка, умеет ли пользователь не делать ложные тревоги на нормальных письмах.",
    total: 8,
    badge: "Safe-flow",
  },
  {
    id: "role-based",
    title: "Ролевое тестирование",
    description: "Сценарии приоритизируются под рабочую роль пользователя и похожий контекст.",
    total: 10,
    badge: "По роли",
  },
  {
    id: "social",
    title: "Социальные сети и мессенджеры",
    description: "Telegram, Instagram, QR phishing и smishing-сценарии в одном тесте.",
    total: 10,
    badge: "Соцсети",
  },
  {
    id: "links-and-domains",
    title: "Ссылки и домены",
    description: "Проверка навыка замечать подмену домена, скрытые URL и опасные переходы.",
    total: 8,
    badge: "URL",
  },
];

function getExamTypeConfig(typeId) {
  return EXAM_TYPES.find((item) => item.id === typeId) || EXAM_TYPES[0];
}

function buildExamQueue(scenarios, total = 10, user = null, examType = "standard") {
  const config = getExamTypeConfig(examType);
  const source =
    config.id === "advanced"
      ? scenarios.filter((item) => item.difficulty === "Hard" || item.difficulty === "Medium")
      : config.id === "phishing-only"
        ? scenarios.filter((item) => !item.isSafeFlow)
        : config.id === "safe-only"
          ? scenarios.filter((item) => item.isSafeFlow)
          : config.id === "social"
            ? scenarios.filter((item) => ["Telegram", "Instagram", "QR Phishing", "Smishing"].includes(item.attackType))
            : config.id === "links-and-domains"
              ? scenarios.filter((item) => item.hasHiddenUrl || item.isSpoofed || new URL(item.landingUrl).host !== new URL(item.officialUrl).host)
            : scenarios;

  const prioritized = config.id === "role-based" ? prioritizeScenariosForUser(source, user) : source;
  const safeScenarios = prioritized.filter((item) => item.isSafeFlow);
  const phishingScenarios = prioritized.filter((item) => !item.isSafeFlow);
  const targetTotal = config.total || total;
  const safeTarget =
    config.id === "phishing-only"
      ? 0
      : config.id === "safe-only"
        ? Math.min(targetTotal, safeScenarios.length)
        : Math.min(Math.floor(targetTotal / 2), safeScenarios.length);
  const phishingTarget =
    config.id === "safe-only"
      ? 0
      : Math.min(targetTotal - safeTarget, phishingScenarios.length);

  const pickRandom = (items, count) =>
    items
      .slice()
      .sort(() => Math.random() - 0.5)
      .slice(0, count);

  const queue = [
    ...pickRandom(safeScenarios, safeTarget),
    ...pickRandom(phishingScenarios, phishingTarget),
  ]
    .slice()
    .sort(() => Math.random() - 0.5);

  if (queue.length < targetTotal) {
    const usedIds = new Set(queue.map((item) => item.id));
    const remaining = prioritized.filter((item) => !usedIds.has(item.id));
    queue.push(...pickRandom(remaining, targetTotal - queue.length));
  }

  return queue.slice(0, targetTotal);
}

function buildBeforeAfterComparison(attempts) {
  if (!attempts.length) {
    return {
      available: false,
      before: { attempts: 0, avgRisk: 0, correctRate: 0, reportRate: 0 },
      after: { attempts: 0, avgRisk: 0, correctRate: 0, reportRate: 0 },
      deltas: { risk: 0, correctRate: 0, reportRate: 0 },
    };
  }

  const ordered = attempts.slice().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const sliceSize = Math.min(5, Math.max(1, Math.floor(ordered.length / 2)));
  const beforeItems = ordered.slice(0, sliceSize);
  const afterItems = ordered.slice(-sliceSize);

  const summarize = (items) => {
    const attemptsCount = items.length;
    const avgRisk = attemptsCount ? Math.round(items.reduce((sum, item) => sum + (item.riskScore || 0), 0) / attemptsCount) : 0;
    const correctRate = attemptsCount ? Math.round((items.filter((item) => item.correctDecision).length / attemptsCount) * 100) : 0;
    const reportRate = attemptsCount ? Math.round((items.filter((item) => item.reportedCorrectly).length / attemptsCount) * 100) : 0;
    return { attempts: attemptsCount, avgRisk, correctRate, reportRate };
  };

  const before = summarize(beforeItems);
  const after = summarize(afterItems);

  return {
    available: ordered.length >= 2,
    before,
    after,
    deltas: {
      risk: after.avgRisk - before.avgRisk,
      correctRate: after.correctRate - before.correctRate,
      reportRate: after.reportRate - before.reportRate,
    },
  };
}

function buildExamProtocol(examResults) {
  const total = examResults.length;
  const correct = examResults.filter((item) => item.correctDecision).length;
  const phishingTotal = examResults.filter((item) => !item.safeCompleted && !item.falseAlarm && !item.itemSafeFlow).length;
  const safeTotal = examResults.filter((item) => item.safeCompleted || item.falseAlarm || item.itemSafeFlow).length;
  const phishingDetected = examResults.filter((item) => item.reportedCorrectly || item.detectedWithoutInteraction).length;
  const safeCorrect = examResults.filter((item) => item.safeCompleted).length;
  const byAttackType = Array.from(
    examResults.reduce((map, item) => {
      const key = item.attackType;
      if (!map.has(key)) {
        map.set(key, { attackType: key, total: 0, correct: 0, failed: 0 });
      }
      const bucket = map.get(key);
      bucket.total += 1;
      if (item.correctDecision) bucket.correct += 1;
      else bucket.failed += 1;
      return map;
    }, new Map()).values()
  ).sort((a, b) => b.failed - a.failed);

  const topMistakes = examResults
    .filter((item) => !item.correctDecision)
    .slice()
    .sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0))
    .slice(0, 3);

  return {
    total,
    correct,
    phishingTotal,
    safeTotal,
    phishingDetected,
    safeCorrect,
    byAttackType,
    topMistakes,
  };
}

function getOfficialHost(url) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function buildTimeProgressStats(attempts) {
  const grouped = new Map();

  attempts.forEach((item) => {
    const date = new Date(item.createdAt).toISOString().slice(0, 10);
    if (!grouped.has(date)) {
      grouped.set(date, { date, attempts: 0, riskSum: 0, correct: 0 });
    }
    const bucket = grouped.get(date);
    bucket.attempts += 1;
    bucket.riskSum += item.riskScore || 0;
    if (item.correctDecision) bucket.correct += 1;
  });

  return Array.from(grouped.values())
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-7)
    .map((item) => ({
      ...item,
      avgRisk: item.attempts ? Math.round(item.riskSum / item.attempts) : 0,
      correctRate: item.attempts ? Math.round((item.correct / item.attempts) * 100) : 0,
    }));
}

function buildRoleCoverageStats(scenarios, attempts) {
  const grouped = new Map();
  const scenarioRoleMap = new Map();

  scenarios.forEach((item) => {
    const roleKey = item.persona?.department || "General";
    scenarioRoleMap.set(item.id, roleKey);
    if (!grouped.has(roleKey)) {
      grouped.set(roleKey, {
        role: roleKey,
        totalScenarios: 0,
        phishingScenarios: 0,
        safeScenarios: 0,
        attempts: 0,
        avgRisk: 0,
      });
    }
    const bucket = grouped.get(roleKey);
    bucket.totalScenarios += 1;
    if (item.isSafeFlow) bucket.safeScenarios += 1;
    else bucket.phishingScenarios += 1;
  });

  attempts.forEach((item) => {
    const roleKey = item.personaDepartment || scenarioRoleMap.get(item.scenarioId) || "General";
    if (!grouped.has(roleKey)) {
      grouped.set(roleKey, {
        role: roleKey,
        totalScenarios: 0,
        phishingScenarios: 0,
        safeScenarios: 0,
        attempts: 0,
        avgRisk: 0,
      });
    }
    const bucket = grouped.get(roleKey);
    bucket.attempts += 1;
    bucket.avgRisk += item.riskScore || 0;
  });

  return Array.from(grouped.values())
    .map((item) => ({
      ...item,
      roleLabel: getRoleLabel(item.role),
      avgRisk: item.attempts ? Math.round(item.avgRisk / item.attempts) : 0,
    }))
    .sort((a, b) => b.totalScenarios - a.totalScenarios);
}

function buildPersonalLearningPlan(attempts, scenarios) {
  const metrics = buildRiskMetrics(attempts);
  const insights = buildMistakeInsights(attempts);
  const recommendations = [];
  const seenScenarioIds = new Set();

  const pushRecommendation = (scenario) => {
    if (!scenario || seenScenarioIds.has(scenario.id)) return;
    seenScenarioIds.add(scenario.id);
    recommendations.push(scenario);
  };

  if (insights.topMistakes.some((item) => item.id === "password_submission")) {
    pushRecommendation(scenarios.find((item) => !item.isSafeFlow && item.asksPassword));
  }
  if (insights.topMistakes.some((item) => item.id === "twofa_submission")) {
    pushRecommendation(scenarios.find((item) => !item.isSafeFlow && item.asks2FA));
  }
  if (insights.topMistakes.some((item) => item.id === "safe_false_alarm")) {
    pushRecommendation(scenarios.find((item) => item.isSafeFlow));
  }
  if (insights.topMistakes.some((item) => item.id === "report_missed")) {
    pushRecommendation(scenarios.find((item) => !item.isSafeFlow && item.attackType === "Microsoft 365"));
  }
  if (recommendations.length < 3) {
    scenarios.slice(0, 8).forEach((item) => {
      if (recommendations.length < 3) pushRecommendation(item);
    });
  }

  const modules = [
    {
      title: "Проверка отправителя и домена",
      detail: "Сравнивайте sender, visible email и реальный домен лендинга до любого клика.",
      when: metrics.clickRate >= 25 || insights.topMistakes.some((item) => item.id === "fast_click"),
    },
    {
      title: "Безопасный flow входа",
      detail: "Запомните разницу между обычным пошаговым входом и страницей, где пароль и 2FA собираются сразу.",
      when: metrics.twoFASubmissionRate > 0 || metrics.credentialSubmissionRate > 0,
    },
    {
      title: "Корректное сообщение о риске",
      detail: "Если письмо вызывает сомнение, лучше сообщить о фишинге, а не взаимодействовать с ним.",
      when: metrics.reportRate < 30,
    },
    {
      title: "Различие между безопасным и ложным фишингом",
      detail: "Важно не только ловить атаки, но и уверенно распознавать легитимные safe-сценарии.",
      when: insights.topMistakes.some((item) => item.id === "safe_false_alarm"),
    },
  ].filter((item) => item.when);

  return {
    title: modules.length ? "Персональный план обучения" : "План поддержания навыка",
    summary: modules.length
      ? "План построен по вашим ошибкам: что повторить, какие темы открыть и какие сценарии пройти заново."
      : "Сейчас критичных ошибок мало. План нужен, чтобы закреплять навык и поддерживать уровень внимательности.",
    modules: modules.length
      ? modules
      : [
          {
            title: "Поддерживающее повторение",
            detail: "Раз в неделю проходите safe-сценарий и один сложный фишинговый кейс для сохранения навыка.",
          },
        ],
    recommendedScenarios: recommendations,
  };
}

function exportHtmlReport({ title, fileName, body }) {
  const blob = new Blob(
    [
      `<!doctype html><html lang="ru"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>${title}</title><style>
      :root{
        --bg:#f4f7fb;
        --paper:#ffffff;
        --text:#0f172a;
        --muted:#475569;
        --line:#dbe4f0;
        --soft:#f8fbff;
        --accent:#0f172a;
        --accent-soft:#e8eef8;
        --gold:#d4a739;
        --success:#0f766e;
      }
      *{box-sizing:border-box}
      body{
        margin:0;
        font-family:Segoe UI,Arial,sans-serif;
        color:var(--text);
        background:
          radial-gradient(circle at top right, rgba(59,130,246,.12), transparent 24%),
          linear-gradient(180deg,#eef4fb 0%,#f8fbff 100%);
        line-height:1.6;
      }
      .page{
        max-width:1000px;
        margin:24px auto;
        padding:0 18px 32px;
      }
      .toolbar{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:16px;
        margin-bottom:14px;
      }
      .brandbar{
        display:flex;
        align-items:center;
        gap:12px;
        color:var(--text);
      }
      .brandmark{
        display:inline-flex;
        align-items:center;
        justify-content:center;
        width:42px;
        height:42px;
        border-radius:14px;
        background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);
        color:#fff;
        font-weight:800;
        letter-spacing:.02em;
      }
      .toolbar-actions{
        display:flex;
        align-items:center;
        gap:10px;
      }
      .print-btn{
        border:0;
        border-radius:14px;
        background:#0f172a;
        color:#fff;
        padding:12px 16px;
        font-size:14px;
        font-weight:700;
        cursor:pointer;
        box-shadow:0 8px 24px rgba(15,23,42,.18);
      }
      .print-btn:hover{background:#1e293b}
      .sheet{
        background:var(--paper);
        border:1px solid rgba(15,23,42,.08);
        border-radius:24px;
        box-shadow:0 20px 56px rgba(15,23,42,.08);
        overflow:hidden;
      }
      .hero{
        padding:28px 30px;
        background:
          radial-gradient(circle at top left, rgba(56,189,248,.16), transparent 26%),
          radial-gradient(circle at 85% 10%, rgba(245,158,11,.18), transparent 18%),
          linear-gradient(180deg,#0b1220 0%,#111827 100%);
        color:#fff;
      }
      .hero.light{
        color:var(--text);
        background:
          radial-gradient(circle at top left, rgba(56,189,248,.10), transparent 24%),
          radial-gradient(circle at 85% 10%, rgba(245,158,11,.14), transparent 18%),
          linear-gradient(180deg,#fffdf6 0%,#ffffff 100%);
      }
      h1{margin:12px 0 8px;font-size:30px;line-height:1.18;font-weight:800;letter-spacing:-.02em}
      h2{margin:0 0 10px;font-size:20px;line-height:1.25;font-weight:700}
      h3{margin:0 0 6px;font-size:14px;line-height:1.35;font-weight:700}
      p{margin:0;font-size:14px;line-height:1.7}
      .muted{color:var(--muted)}
      .hero .muted{color:rgba(255,255,255,.72)}
      .hero.light .muted{color:var(--muted)}
      .section{
        padding:22px 30px;
        border-top:1px solid var(--line);
      }
      .grid{
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:14px;
        margin-top:14px;
      }
      .grid.three{grid-template-columns:repeat(3,minmax(0,1fr))}
      .card{
        border:1px solid var(--line);
        border-radius:18px;
        padding:15px 16px;
        background:linear-gradient(180deg,#fbfdff 0%,#f8fbff 100%);
      }
      .card strong.metric{
        display:block;
        margin-top:8px;
        font-size:22px;
        line-height:1.15;
        letter-spacing:-.02em;
      }
      .badge{
        display:inline-block;
        padding:6px 11px;
        border-radius:999px;
        background:rgba(15,23,42,.92);
        color:#fff;
        font-size:11px;
        font-weight:700;
        letter-spacing:.03em;
      }
      .badge.gold{background:var(--gold); color:#1f2937}
      .badge.success{background:var(--success)}
      .list{
        display:grid;
        gap:10px;
        margin-top:14px;
      }
      .list-item{
        border:1px solid var(--line);
        border-radius:16px;
        padding:12px 14px;
        background:#fff;
      }
      .kicker{
        font-size:11px;
        text-transform:uppercase;
        letter-spacing:.14em;
        color:#94a3b8;
        font-weight:700;
      }
      .footer{
        padding:18px 30px 24px;
        border-top:1px solid var(--line);
        color:var(--muted);
        font-size:12px;
      }
      .author{
        margin-top:6px;
        font-weight:700;
        color:var(--text);
      }
      @media print{
        body{background:#fff}
        .page{max-width:none;margin:0;padding:0}
        .toolbar{display:none}
        .sheet{box-shadow:none;border:none;border-radius:0}
      }
      @media (max-width: 720px){
        .toolbar{flex-direction:column;align-items:flex-start}
        .hero,.section,.footer{padding:18px}
        .grid,.grid.three{grid-template-columns:1fr}
        h1{font-size:24px}
      }
      ul{margin:0;padding-left:20px}
      li + li{margin-top:8px}
      </style></head><body><div class="page"><div class="toolbar"><div class="brandbar"><div class="brandmark">PC</div><div><div class="kicker">Дипломный проект</div><div style="font-weight:700">Обучающий симулятор для противодействия фишинговым атакам среди пользователей</div></div></div><div class="toolbar-actions"><button class="print-btn" onclick="window.print()">Печать / PDF</button></div></div><div class="sheet">${body}</div></div></body></html>`,
    ],
    { type: "text/html;charset=utf-8" }
  );
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
}

function getSafeDisplayName(user) {
  const name = String(user?.name || "").trim();
  if (!name) return "пользователь";
  if (name.includes("�")) return user.email?.split("@")[0] || "пользователь";
  return name;
}

function getReactionLabel(seconds) {
  if (!seconds) return "Не было клика";
  if (seconds < 2) return "Слишком быстро кликнул";
  if (seconds <= 10) return "Нормальная реакция";
  return "Подумал перед действием";
}

function getReactionHint(seconds) {
  if (!seconds) return "Пользователь не переходил по ссылке.";
  if (seconds < 2) return "Риск выше: переход почти без анализа.";
  if (seconds <= 10) return "Нейтральная реакция: пользователь посмотрел, но не слишком долго.";
  return "Риск ниже: пользователь уделил время проверке перед действием.";
}

function buildAttackTimeline(result) {
  return [
    { step: 1, title: "Получено письмо", state: "done" },
    { step: 2, title: "Клик по ссылке", state: result.clicked ? "done" : "missed" },
    { step: 3, title: "Переход на сайт", state: result.clicked ? "done" : "missed" },
    { step: 4, title: "Ввод данных", state: result.passwordSubmitted || result.twoFASubmitted || result.paymentSubmitted ? "done" : "missed" },
    { step: 5, title: "Компрометация аккаунта", state: result.passwordSubmitted || result.twoFASubmitted || result.paymentSubmitted ? "done" : "prevented" },
  ];
}

function highlightUrlParts(url, officialUrl = "") {
  try {
    const parsed = new URL(url);
    const officialHost = officialUrl ? new URL(officialUrl).host : "";
    const suspiciousTokens = ["verify", "secure", "session", "auth", "confirm", "urgent", "token"];
    const parts = [
      { text: `${parsed.protocol}//`, tone: "text-slate-300" },
      {
        text: parsed.host,
        tone:
          officialHost && parsed.host !== officialHost
            ? "text-rose-300 font-semibold"
            : "text-emerald-300 font-semibold",
      },
    ];

    if (parsed.pathname) {
      parts.push({
        text: parsed.pathname,
        tone: suspiciousTokens.some((token) => parsed.pathname.includes(token)) ? "text-amber-300" : "text-slate-300",
      });
    }
    if (parsed.search) {
      parts.push({
        text: parsed.search,
        tone: "text-rose-300",
      });
    }
    return parts;
  } catch {
    return [{ text: url, tone: "text-slate-300" }];
  }
}

function buildRiskCueList(item) {
  const list = [];
  if (item.asksPassword && item.asks2FA && !item.isSafeFlow) list.push("Одновременный запрос пароля и кода 2FA");
  if (item.isSpoofed) list.push("Переход со spoofed sender");
  if (new URL(item.landingUrl).host !== new URL(item.officialUrl).host) list.push("Домен отличается от официального");
  if (new URL(item.landingUrl).search) list.push("URL содержит токен или подозрительные параметры");
  return list;
}

function buildLiveActionInsights(item, { clicked, openedFile, form, step }) {
  const insights = [];

  if (clicked) {
    insights.push({
      id: "clicked-link",
      tone: item.isSafeFlow ? "safe" : "risk",
      title: item.isSafeFlow ? "Вы открыли официальный портал" : "Вы перешли по ссылке",
      text: item.isSafeFlow
        ? "Это допустимо для безопасного сценария, но домен и этапы входа все равно стоит проверять до ввода данных."
        : "Это рискованное действие: перед вводом данных нужно сверить sender, домен страницы и структуру формы.",
    });
  }

  if (openedFile && item.attachment) {
    insights.push({
      id: "opened-file",
      tone: /\.exe|\.html|\.hta|\.url|\.scr|\.iso|\.chm|\.docm/i.test(item.attachment.name) ? "risk" : "neutral",
      title: "Вы открыли вложение",
      text: /\.exe|\.html|\.hta|\.url|\.scr|\.iso|\.chm|\.docm/i.test(item.attachment.name)
        ? "Такое вложение может маскировать вредоносный файл под документ. Двойные расширения и исполняемые форматы требуют остановки и проверки."
        : "Даже обычное вложение стоит оценивать по расширению, контексту письма и отправителю.",
    });
  }

  if (form.password.trim()) {
    insights.push({
      id: "password-entered",
      tone: item.isSafeFlow ? "safe" : "danger",
      title: item.isSafeFlow ? "Введен пароль на шаге 1" : "Вы ввели пароль",
      text: item.isSafeFlow
        ? "Это соответствует нормальному безопасному flow, но пароль должен вводиться только на официальном домене."
        : "Вы передали учетные данные злоумышленнику. В реальной атаке это может дать доступ к почте и корпоративным сервисам.",
    });
  }

  if (form.twoFactor.trim()) {
    insights.push({
      id: "2fa-entered",
      tone: item.isSafeFlow && step === "2fa" ? "safe" : "danger",
      title: item.isSafeFlow && step === "2fa" ? "Введен код 2FA на отдельном шаге" : "Вы ввели код 2FA",
      text: item.isSafeFlow && step === "2fa"
        ? "Отдельный экран второго фактора ближе к корректному сценарию входа."
        : "Код 2FA не должен вводиться рядом с паролем на подозрительной странице. Так злоумышленник может завершить вход от вашего имени.",
    });
  }

  if (form.payment.trim()) {
    insights.push({
      id: "payment-entered",
      tone: "danger",
      title: "Введены платежные данные",
      text: "На странице проверки доступа не должны запрашиваться карта или платежный код. Это прямой риск финансовых потерь.",
    });
  }

  return insights;
}

function buildRealWorldConsequences(result, item) {
  const consequences = [];

  if (item.isSafeFlow && !result.reportedCorrectly) {
    consequences.push("В безопасном сценарии вход остался в рамках официального сервиса, компрометации не произошло.");
  }

  if (item.isSafeFlow && result.falseAlarm) {
    consequences.push("В реальной жизни ложная тревога не компрометирует аккаунт, но может замедлить работу и создать лишнюю нагрузку на команду поддержки.");
  }

  if (result.clicked && !result.passwordSubmitted && !result.twoFASubmitted && !result.paymentSubmitted && !item.isSafeFlow) {
    consequences.push("После перехода по ссылке злоумышленник уже понимает, что пользователь откликается на такие письма и лендинги.");
    consequences.push("Следующим шагом жертву обычно подталкивают к вводу пароля, повторной авторизации или загрузке вложения.");
  }

  if (result.passwordSubmitted) {
    consequences.push("Злоумышленник может получить доступ к почте, облачным файлам и корпоративным сервисам под вашей учетной записью.");
    consequences.push("Через захваченную почту атакующий может запускать новые атаки внутри компании и собирать внутренние данные.");
  }

  if (result.twoFASubmitted) {
    consequences.push("Передача кода 2FA позволяет завершить вход сразу, даже если пароль был защищен вторым фактором.");
  }

  if (result.paymentSubmitted) {
    consequences.push("Платежные реквизиты могут привести к прямым финансовым потерям, мошенническим списаниям или подмене реквизитов.");
  }

  if (!consequences.length && !item.isSafeFlow) {
    consequences.push("Компрометация не произошла, потому что взаимодействие было остановлено до отправки чувствительных данных.");
  }

  if (!consequences.length) {
    consequences.push("Негативных последствий для учетной записи не возникло, но сценарий все равно полезен как тренировка правильного решения.");
  }

  return consequences;
}

function summarizeAction(result) {
  if (result.detectedWithoutInteraction) return "Письмо распознано до клика";
  if (result.reportedCorrectly) return "Пользователь открыл, оценил и сообщил о риске";
  if (result.falseAlarm) return "Безопасный сценарий ошибочно отмечен как фишинг";
  if (result.safeCompleted) return "Безопасный сценарий пройден корректно";
  if (result.passwordSubmitted && result.twoFASubmitted) return "Отправлены пароль и код 2FA";
  if (result.passwordSubmitted) return "Отправлен пароль";
  if (result.clicked) return "Клик по ссылке без отправки данных";
  return "Безопасное прохождение";
}

function createAttemptResult({ user, item, clicked, passwordSubmitted, twoFASubmitted, paymentSubmitted, reportedStage, openedFile, startedAt, clickedAt, examMode = false, examSessionId = null }) {
  const isPhishing = !item.isSafeFlow;
  const now = Date.now();
  const timeToClick = clickedAt ? Math.max(1, Math.round((clickedAt - startedAt) / 1000)) : 0;
  const timeToDetect = Math.max(1, Math.round((now - startedAt) / 1000));

  let outcomeKey = "detectedWithoutInteraction";
  let riskScore = item.isSafeFlow ? 8 : 15;

  if (isPhishing && reportedStage === "mail" && !clicked) {
    outcomeKey = "detectedWithoutInteraction";
    riskScore = 4;
  } else if (isPhishing && reportedStage) {
    outcomeKey = "reportedCorrectly";
    riskScore = 12;
  } else if (isPhishing && passwordSubmitted && twoFASubmitted) {
    outcomeKey = "passwordAnd2FA";
    riskScore = 96;
  } else if (isPhishing && (passwordSubmitted || paymentSubmitted)) {
    outcomeKey = "passwordSubmitted";
    riskScore = paymentSubmitted ? 91 : 82;
  } else if (isPhishing && clicked) {
    outcomeKey = "clickOnly";
    riskScore = 61;
  } else if (!isPhishing && reportedStage) {
    outcomeKey = "falseAlarm";
    riskScore = 22;
  } else if (!isPhishing) {
    outcomeKey = "safeCompleted";
    riskScore = clicked && timeToClick < 2 ? 18 : 8;
  }

  if (item.difficulty === "Hard") riskScore += 4;
  if (openedFile && isPhishing) riskScore += 6;
  if (clicked && timeToClick < 2) riskScore += 10;
  if (clicked && timeToClick > 10 && !passwordSubmitted && !twoFASubmitted && !paymentSubmitted) riskScore -= 8;

  const finalScore = Math.min(100, riskScore);
  const correctDecision =
    (isPhishing && (outcomeKey === "detectedWithoutInteraction" || outcomeKey === "reportedCorrectly")) ||
    (!isPhishing && !reportedStage);
  const scoreDelta = correctDecision
    ? 140 + (timeToClick > 10 || !clicked ? 30 : 0)
    : outcomeKey === "clickOnly"
      ? 20
      : outcomeKey === "passwordSubmitted"
        ? -70
        : outcomeKey === "passwordAnd2FA"
          ? -120
          : -30;
  const result = {
    id: Date.now(),
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    userDepartment: user.department || null,
    userJobTitle: user.jobTitle || null,
    title: item.title,
    subject: item.subject,
    difficulty: item.difficulty,
    attackType: item.attackType,
    personaDepartment: item.persona?.department || null,
    personaJobTitle: item.persona?.jobTitle || null,
    personaFirstName: item.persona?.firstName || null,
    scenarioId: item.id,
    scenarioType: item.isSafeFlow ? "safe" : "phishing",
    itemSafeFlow: item.isSafeFlow,
    clicked,
    openedFile,
    passwordSubmitted,
    twoFASubmitted,
    paymentSubmitted,
    reportedCorrectly: outcomeKey === "reportedCorrectly",
    falseAlarm: outcomeKey === "falseAlarm",
    safeCompleted: outcomeKey === "safeCompleted",
    detectedWithoutInteraction: outcomeKey === "detectedWithoutInteraction",
    outcomeKey,
    outcomeLabel: outcomeLabels[outcomeKey],
    riskScore: finalScore,
    timeToClick,
    timeToDetect,
    reactionLabel: getReactionLabel(timeToClick),
    reactionHint: getReactionHint(timeToClick),
    correctDecision,
    scoreDelta,
    systemReaction:
      passwordSubmitted || twoFASubmitted || paymentSubmitted
        ? "Аккаунт заблокирован: подозрительная активность обнаружена"
        : isPhishing
          ? "Система безопасности зафиксировала попытку фишинга"
          : "Вход выполнен в безопасном режиме",
    attackTimeline: [],
    actionSummary: "",
    createdAt: new Date().toISOString(),
    examMode,
    examSessionId,
  };

  result.actionSummary = summarizeAction(result);
  result.attackTimeline = buildAttackTimeline(result);
  return result;
}

function FilterPill({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`transform-gpu rounded-full border px-4 py-2 text-sm transition-all duration-200 hover:-translate-y-0.5 ${
        active
          ? "border-slate-950 bg-slate-950 text-white shadow-[0_8px_20px_rgba(15,23,42,0.18)]"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm"
      }`}
    >
      {children}
    </button>
  );
}

function MetricCard({ title, value, hint, dark = false }) {
  return (
    <Card className={`transform-gpu rounded-[26px] border shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${dark ? "border-white/10 bg-white/5 text-white hover:border-white/15 hover:bg-white/[0.07]" : "border-slate-200 bg-white hover:border-slate-300"}`}>
      <CardContent className="p-5">
        <p className={`text-sm ${dark ? "text-slate-300" : "text-slate-500"}`}>{title}</p>
        <p className="mt-3 text-3xl font-bold">{value}</p>
        {hint ? <p className={`mt-2 text-sm ${dark ? "text-slate-300" : "text-slate-500"}`}>{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

function SectionHero({ eyebrow, title, description, actions = null, icon: Icon = Sparkles }) {
  return (
    <Card className="rounded-[32px] border border-white/10 bg-slate-950 text-white shadow-2xl">
      <CardContent className="grid gap-6 p-7 md:min-h-[250px] md:grid-cols-[1fr_auto] md:items-center">
        <div className="flex flex-col justify-center">
          {eyebrow ? <Badge className="rounded-full bg-white/10 px-3 py-1 text-white hover:bg-white/10">{eyebrow}</Badge> : null}
          <div className="mt-5 flex h-14 w-14 items-center justify-center rounded-[20px] border border-white/10 bg-white/5 text-amber-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <Icon className="h-6 w-6" />
          </div>
          <h1 className="mt-4 max-w-4xl text-3xl font-bold leading-tight md:text-4xl">{title}</h1>
          <p className="mt-4 max-w-4xl text-base leading-8 text-slate-300">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 md:justify-end md:self-center">
          {actions}
        </div>
      </CardContent>
    </Card>
  );
}

function SiteChrome({ current, user, onNavigate, onLogout, children }) {
  const navScrollRef = React.useRef(null);
  const tabs = [
    { id: "dashboard", label: "Главная", icon: LayoutDashboard },
    { id: "profile", label: "Профиль", icon: UserRound },
    { id: "theory", label: "Теория", icon: BookOpen },
    { id: "simulator", label: "Обучение", icon: Mail },
    { id: "exam", label: "Тестирование", icon: Trophy },
    { id: "history", label: "История", icon: CheckCircle2 },
    { id: "url-check", label: "Проверить ссылку", icon: Link2 },
    { id: "mistakes", label: "Работа над ошибками", icon: AlertTriangle },
    { id: "comparison", label: "Сравнение", icon: SearchCheck },
  ];

  if (user?.role === "admin") tabs.push({ id: "admin", label: "Админ-панель", icon: LayoutDashboard });

  const scrollNavBy = (offset) => {
    if (!navScrollRef.current) return;
    navScrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white">
      <div className="sticky top-0 z-50 border-b border-white/10 bg-[rgba(38,38,38,0.86)] shadow-[0_10px_30px_rgba(0,0,0,0.22)] backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1760px] items-center justify-between gap-4 px-5 py-4 xl:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-5">
            <button
              type="button"
              onClick={() => onNavigate("dashboard")}
              className="shrink-0 rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-sm font-semibold text-amber-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
            >
              PhishingCode
            </button>
            <div className="min-w-0 flex-1 lg:hidden">
              <select
                className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition focus:border-white/20 focus:bg-white/10"
                value={current}
                onChange={(e) => onNavigate(e.target.value)}
              >
                {tabs.map((tab) => (
                  <option key={tab.id} value={tab.id} className="text-slate-900">
                    {tab.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="hidden min-w-0 flex-1 lg:block">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Прокрутить вкладки влево"
                  onClick={() => scrollNavBy(-220)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div
                  ref={navScrollRef}
                  className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto whitespace-nowrap scroll-smooth scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                  {tabs.map((tab) => {
                    const isActive = current === tab.id;
                    const Icon = tab.icon;

                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => onNavigate(tab.id)}
                        className={`group relative shrink-0 rounded-xl border px-4 py-2 text-sm transition-all ${
                          isActive
                            ? "border-white/10 bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                            : "border-transparent text-slate-300 hover:border-white/10 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <span className="relative z-10 flex items-center gap-2">
                          <Icon className={`h-4 w-4 transition-colors ${isActive ? "text-amber-300" : "text-slate-400 group-hover:text-slate-200"}`} />
                          <span>{tab.label}</span>
                        </span>
                        {isActive ? (
                          <>
                            <motion.span
                              layoutId="nav-pill"
                              className="absolute inset-0 rounded-xl bg-white/6"
                              transition={{ type: "spring", stiffness: 380, damping: 30 }}
                            />
                            <motion.span
                              layoutId="nav-underline"
                              className="absolute inset-x-3 bottom-1 h-[2px] rounded-full bg-amber-300"
                              transition={{ type: "spring", stiffness: 420, damping: 34 }}
                            />
                          </>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  aria-label="Прокрутить вкладки вправо"
                  onClick={() => scrollNavBy(220)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {user ? <div className="hidden rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] xl:block">{getSafeDisplayName(user)}</div> : null}
            {onLogout ? (
              <Button variant="outline" className="rounded-xl border-white/10 bg-transparent text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:bg-white/10" onClick={onLogout}>
                Выйти
              </Button>
            ) : null}
          </div>
        </div>
      </div>
      <motion.div
        key={current}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: "easeOut" }}
        className="mx-auto w-full max-w-[1760px] px-5 py-8 xl:px-8"
      >
        {children}
      </motion.div>
    </div>
  );
}

function ProfilePage({ user, attempts, onBack, onNavigate, onLogout, onUserUpdate, onDeleteAccount }) {
  const [form, setForm] = useState({
    name: user.name || "",
    email: user.email || "",
    department: user.department || "IT",
    jobTitle: user.jobTitle || "",
    oldPassword: "",
    password: "",
    passwordConfirm: "",
  });
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const newPasswordStrength = evaluatePasswordStrength(form.password);
  const metrics = buildRiskMetrics(attempts);
  const gamification = buildGamificationStats(attempts);
  const behaviorProfile = buildBehaviorProfile(attempts);
  const achievements = buildAchievementStats(attempts);
  const recentAttempts = attempts.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 4);
  const initials = getSafeDisplayName(user)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item[0]?.toUpperCase() || "")
    .join("") || "PU";
  const detectedWithoutClickCount = attempts.filter((item) => item.detectedWithoutInteraction).length;
  const reportCount = attempts.filter((item) => item.reportedCorrectly).length;

  const saveProfile = async () => {
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const department = form.department;
    const jobTitle = form.jobTitle.trim();
    const oldPassword = form.oldPassword.trim();
    const password = form.password.trim();
    const passwordConfirm = form.passwordConfirm.trim();

    if (!name || !email || !department) {
      setError("Заполните имя, email и роль.");
      setSaved(false);
      return;
    }

    const users = readStorage(STORAGE_KEYS.users, []);
    const hasConflict = users.some((item) => item.id !== user.id && item.email === email);

    if (hasConflict) {
      setError("Пользователь с таким email уже существует.");
      setSaved(false);
      return;
    }

    if ((password || passwordConfirm) && password !== passwordConfirm) {
      setError("Пароли не совпадают.");
      setSaved(false);
      return;
    }

    if (password && !newPasswordStrength.isAcceptable) {
      setError("Новый пароль слишком слабый. Добавьте длину, цифры, разные регистры и спецсимволы.");
      setSaved(false);
      return;
    }

    try {
      const nextUser = await updateUser(user.id, {
        name,
        email,
        department,
        jobTitle,
        oldPassword,
        password,
        avatar: user.avatar || "",
      });
      const nextUsers = users.map((item) => (item.id === user.id ? nextUser : item));
      writeStorage(STORAGE_KEYS.users, nextUsers);
      writeStorage(STORAGE_KEYS.session, nextUser);
      onUserUpdate(nextUser);
      setError("");
      setSaved(true);
      setForm((prev) => ({ ...prev, oldPassword: "", password: "", passwordConfirm: "" }));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Не удалось сохранить профиль.");
      setSaved(false);
    }
  };

  const handleAvatarUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const avatar = String(reader.result || "");
      const users = readStorage(STORAGE_KEYS.users, []);
      try {
        const nextUser = await updateUser(user.id, {
          name: user.name,
          email: user.email,
          department: user.department || "",
          jobTitle: user.jobTitle || "",
          avatar,
        });
        const nextUsers = users.map((item) => (item.id === user.id ? nextUser : item));
        writeStorage(STORAGE_KEYS.users, nextUsers);
        writeStorage(STORAGE_KEYS.session, nextUser);
        onUserUpdate(nextUser);
        setSaved(true);
        setError("");
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Не удалось обновить аватар.");
      }
    };
    reader.readAsDataURL(file);
  };

  const removeAvatar = async () => {
    const users = readStorage(STORAGE_KEYS.users, []);
    try {
      const nextUser = await updateUser(user.id, {
        name: user.name,
        email: user.email,
        department: user.department || "",
        jobTitle: user.jobTitle || "",
        avatar: "",
      });
      const nextUsers = users.map((item) => (item.id === user.id ? nextUser : item));
      writeStorage(STORAGE_KEYS.users, nextUsers);
      writeStorage(STORAGE_KEYS.session, nextUser);
      onUserUpdate(nextUser);
      setSaved(true);
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Не удалось удалить аватар.");
    }
  };

  return (
    <SiteChrome current="profile" user={user} onNavigate={onNavigate} onLogout={onLogout}>
      <div className="space-y-6">
        <SectionHero
          eyebrow="Личный профиль"
          title="Профиль пользователя"
          description="Здесь можно обновить имя и email, посмотреть свои данные, текущий риск-профиль и накопленные баллы."
          icon={UserRound}
          actions={<Button variant="outline" className="rounded-2xl border-white/20 bg-transparent text-white hover:bg-white/10" onClick={onBack}>Назад</Button>}
        />

        <div className="grid items-start gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-6">
          <Card className="rounded-[32px] border border-slate-200 bg-white shadow-lg">
            <CardHeader className="p-6">
              <CardTitle className="text-2xl">Редактировать профиль</CardTitle>
              <CardDescription>Изменения сохраняются локально в текущем профиле пользователя.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-6 pt-0">
              <div className="flex items-center gap-4 rounded-[24px] bg-slate-50 p-4">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-[20px] bg-slate-950 text-xl font-bold text-white">
                  {user.avatar ? <img src={user.avatar} alt="Аватар" className="h-full w-full object-cover" /> : initials}
                </div>
                <div>
                  <p className="text-lg font-semibold text-slate-900">{getSafeDisplayName(user)}</p>
                  <p className="mt-1 text-sm text-slate-500">{user.email}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Аватар</Label>
                <Input className="rounded-2xl" type="file" accept="image/*" onChange={handleAvatarUpload} />
                <div className="flex gap-3 flex-wrap">
                  <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    {user.avatar ? "Аватар загружен и сохранен в профиле." : "Сейчас используется аватар по инициалам."}
                  </div>
                  {user.avatar ? (
                    <Button variant="outline" className="rounded-2xl" onClick={removeAvatar}>Удалить аватар</Button>
                  ) : null}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Имя</Label>
                <Input className="rounded-2xl" value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setSaved(false); }} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input className="rounded-2xl" value={form.email} onChange={(e) => { setForm({ ...form, email: e.target.value }); setSaved(false); }} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Роль пользователя</Label>
                  <select
                    className="flex h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400"
                    value={form.department}
                    onChange={(e) => { setForm({ ...form, department: e.target.value }); setSaved(false); }}
                  >
                    {ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Должность</Label>
                  <Input className="rounded-2xl" value={form.jobTitle} onChange={(e) => { setForm({ ...form, jobTitle: e.target.value }); setSaved(false); }} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Старый пароль</Label>
                <Input className="rounded-2xl" type="password" value={form.oldPassword} onChange={(e) => { setForm({ ...form, oldPassword: e.target.value }); setSaved(false); }} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Новый пароль</Label>
                  <Input className="rounded-2xl" type="password" value={form.password} onChange={(e) => { setForm({ ...form, password: e.target.value }); setSaved(false); }} />
                </div>
                <div className="space-y-2">
                  <Label>Повторите пароль</Label>
                  <Input className="rounded-2xl" type="password" value={form.passwordConfirm} onChange={(e) => { setForm({ ...form, passwordConfirm: e.target.value }); setSaved(false); }} />
                </div>
              </div>
              {form.password ? <PasswordStrengthHint password={form.password} /> : null}
              {error ? (
                <Alert variant="destructive" className="rounded-2xl">
                  <AlertTitle>Ошибка</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
              {saved ? (
                <Alert className="rounded-2xl border-emerald-200 bg-emerald-50 text-emerald-950">
                  <AlertTitle>Сохранено</AlertTitle>
                  <AlertDescription>Данные профиля обновлены.</AlertDescription>
                </Alert>
              ) : null}
              <div className="flex gap-3 flex-wrap">
                <Button className="rounded-2xl" onClick={saveProfile}>Сохранить профиль</Button>
                <Button variant="destructive" className="rounded-2xl" onClick={onDeleteAccount}>Удалить аккаунт</Button>
              </div>
              <div className="grid gap-3 pt-2">
                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">Центр безопасности</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    Для смены пароля сначала введите старый пароль. После обновления попробуйте пройти один безопасный и один фишинговый сценарий повторно, чтобы проверить внимательность.
                  </p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-[22px] bg-slate-50 p-4">
                    <p className="text-xs text-slate-500">Распознано без клика</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{detectedWithoutClickCount}</p>
                  </div>
                  <div className="rounded-[22px] bg-slate-50 p-4">
                    <p className="text-xs text-slate-500">Сообщений о фишинге</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{reportCount}</p>
                  </div>
                </div>
                <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-900">Подсказка</p>
                  <p className="mt-2 text-sm leading-7 text-slate-700">
                    Если в последних попытках растет риск, начните с разделов <strong>Сравнение</strong> и <strong>Работа над ошибками</strong>, а потом повторите тестирование.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[32px] border border-slate-200 bg-white shadow-lg">
            <CardHeader className="p-6">
              <CardTitle className="text-2xl">Быстрый обзор</CardTitle>
              <CardDescription>Короткая сводка по профилю и следующие полезные действия.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 p-6 pt-0">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-[22px] bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Текущий уровень</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{gamification.level}</p>
                </div>
                <div className="rounded-[22px] bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Риск-профиль</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{metrics.riskStatus.label}</p>
                </div>
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Что улучшить дальше</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Перейдите в <strong>Работу над ошибками</strong>, если хотите повторить сценарии с высоким риском, или в
                  <strong> Теорию</strong>, если нужно закрепить признаки sender spoofing, URL и безопасного 2FA flow.
                </p>
              </div>
              <div className="rounded-[24px] border border-sky-200 bg-sky-50 p-4">
                <p className="text-sm font-semibold text-sky-900">Следующий шаг</p>
                <p className="mt-2 text-sm leading-7 text-slate-700">
                  После обновления профиля попробуйте пройти тестирование без подсказок и сравните новый результат с историей попыток.
                </p>
              </div>
            </CardContent>
          </Card>
          </div>

          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <MetricCard title="Баллы" value={gamification.score} hint="Накопленный результат по всем попыткам" dark />
              <MetricCard title="Уровень" value={gamification.level} hint="Текущий уровень по системе геймификации" dark />
              <MetricCard title="Серия" value={gamification.streak} hint="Сколько правильных решений подряд" dark />
              <MetricCard title="Риск-профиль" value={metrics.riskScore} hint={metrics.riskStatus.label} dark />
            </div>

            <Card className="rounded-[32px] border border-slate-200 bg-white shadow-lg">
              <CardHeader className="p-6">
                <CardTitle className="text-2xl">Мои данные</CardTitle>
                <CardDescription>Краткая сводка по учетной записи и обучающей активности.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 p-6 pt-0 md:grid-cols-2">
                <div className="rounded-[22px] bg-slate-50 p-4"><p className="text-xs text-slate-500">Имя</p><p className="mt-1 font-semibold text-slate-900">{getSafeDisplayName(user)}</p></div>
                <div className="rounded-[22px] bg-slate-50 p-4"><p className="text-xs text-slate-500">Email</p><p className="mt-1 font-semibold text-slate-900">{user.email}</p></div>
                <div className="rounded-[22px] bg-slate-50 p-4"><p className="text-xs text-slate-500">Роль</p><p className="mt-1 font-semibold text-slate-900">{user.role === "admin" ? "Администратор" : getRoleLabel(user.department)}</p></div>
                <div className="rounded-[22px] bg-slate-50 p-4"><p className="text-xs text-slate-500">Дата регистрации</p><p className="mt-1 font-semibold text-slate-900">{formatDate(user.createdAt)}</p></div>
                <div className="rounded-[22px] bg-slate-50 p-4"><p className="text-xs text-slate-500">Должность</p><p className="mt-1 font-semibold text-slate-900">{user.jobTitle || "Не указана"}</p></div>
                <div className="rounded-[22px] bg-slate-50 p-4 md:col-span-2">
                  <p className="text-xs text-slate-500">Поведенческий профиль</p>
                  <div className="mt-2 flex items-center gap-3 flex-wrap">
                    <Badge variant={behaviorProfile.tone === "destructive" ? "destructive" : behaviorProfile.tone === "secondary" ? "secondary" : "default"} className="rounded-full px-3 py-1">
                      {behaviorProfile.label}
                    </Badge>
                    <p className="font-semibold text-slate-900">{behaviorProfile.description}</p>
                  </div>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{behaviorProfile.recommendation}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[32px] border border-slate-200 bg-white shadow-lg">
              <CardHeader className="p-6">
                <CardTitle className="text-2xl">Последние попытки</CardTitle>
                <CardDescription>Краткая сводка по последним сценариям пользователя.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 p-6 pt-0">
                {recentAttempts.length === 0 ? (
                  <div className="rounded-[22px] border border-dashed border-slate-300 p-6 text-center text-slate-500">
                    Попыток пока нет. Запустите симулятор, чтобы накопить статистику.
                  </div>
                ) : (
                  recentAttempts.map((item) => (
                    <div key={item.id} className="rounded-[22px] bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <p className="font-semibold text-slate-900">{item.title}</p>
                        <Badge variant={item.riskScore >= 70 ? "destructive" : item.riskScore >= 40 ? "secondary" : "default"} className="rounded-full px-3 py-1">
                          {item.outcomeLabel}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm text-slate-600">{item.actionSummary}</p>
                      <p className="mt-2 text-xs text-slate-500">{formatDate(item.createdAt)} • Риск {item.riskScore}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[32px] border border-slate-200 bg-white shadow-lg">
              <CardHeader className="p-6">
                <CardTitle className="text-2xl">Мои достижения</CardTitle>
                <CardDescription>Бейджи открываются по мере роста внимательности и успешного прохождения сценариев.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 p-6 pt-0 xl:grid-cols-3">
                {achievements.map((item) => (
                  <div key={item.id} className={`flex min-h-[220px] flex-col justify-between rounded-[24px] border p-5 ${item.unlocked ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>
                    <div>
                      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <p className="max-w-full pr-0 text-lg font-semibold leading-7 text-slate-900 sm:max-w-[68%] sm:pr-2">{item.title}</p>
                        <Badge
                          variant={item.unlocked ? "default" : "secondary"}
                          className="shrink-0 self-start rounded-full px-3 py-1 text-xs font-semibold"
                        >
                          {item.unlocked ? "Открыто" : "Закрыто"}
                        </Badge>
                      </div>
                      <p className="mt-4 text-sm leading-7 text-slate-700">{item.hint}</p>
                    </div>
                    <div className="mt-5 rounded-[18px] bg-white/70 px-4 py-3 text-xs leading-6 text-slate-500">
                      {item.detail}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </SiteChrome>
  );
}

function HistoryPage({ user, attempts, onBack, onNavigate, onLogout }) {
  return (
    <SiteChrome current="history" user={user} onNavigate={onNavigate} onLogout={onLogout}>
      <div className="space-y-6">
        <SectionHero
          eyebrow="Журнал попыток"
          title="История прохождений"
          description="Отдельный журнал попыток с поиском, сортировкой и фильтрами по сценариям. Здесь удобно смотреть динамику, сравнивать ошибки и возвращаться к конкретным кейсам."
          icon={CheckCircle2}
          actions={<Button variant="outline" className="rounded-2xl border-white/20 bg-transparent text-white hover:bg-white/10" onClick={onBack}>Назад</Button>}
        />
        <HistoryLog attempts={attempts} difficulties={scenarioDifficulties} attackTypes={attackTypes} />
      </div>
    </SiteChrome>
  );
}

function MistakesPage({ user, attempts, onBack, onNavigate, onLogout, onReplayScenario }) {
  const scenarios = useMemo(() => buildScenarioItems(), []);
  const insights = buildMistakeInsights(attempts);
  const learningPlan = buildPersonalLearningPlan(attempts, scenarios);
  const riskyAttempts = attempts
    .filter((item) => item.riskScore >= 40)
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 6);
  const [selectedAttemptId, setSelectedAttemptId] = useState(riskyAttempts[0]?.id || null);
  const selectedAttempt = riskyAttempts.find((item) => item.id === selectedAttemptId) || riskyAttempts[0] || null;

  return (
    <SiteChrome current="mistakes" user={user} onNavigate={onNavigate} onLogout={onLogout}>
      <div className="space-y-6">
        <SectionHero
          eyebrow="Разбор обучения"
          title="Работа над ошибками"
          description="Раздел показывает повторяющиеся ошибки пользователя, объясняет почему они опасны и подсказывает, что именно стоит тренировать дальше."
          icon={AlertTriangle}
          actions={<Button variant="outline" className="rounded-2xl border-white/20 bg-transparent text-white hover:bg-white/10" onClick={onBack}>Назад</Button>}
        />

        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard title="Всего ошибок" value={insights.totalMistakes} hint="Сумма повторяющихся рискованных действий" dark />
          <MetricCard title="Главная зона роста" value={insights.focusArea} hint="Основной паттерн, который чаще всего повторяется" dark />
          <MetricCard title="Рискованных попыток" value={riskyAttempts.length} hint="Последние попытки с заметным риском" dark />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <Card className="rounded-[30px] border border-slate-200 bg-white shadow-lg">
            <CardHeader className="p-6">
              <CardTitle className="text-2xl">Повторяющиеся ошибки</CardTitle>
              <CardDescription>Что чаще всего приводит к повышению риска и компрометации учетной записи.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 p-6 pt-0">
              {insights.topMistakes.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-slate-300 p-8 text-center text-slate-500">
                  Ошибок пока нет. Пользователь проходит сценарии достаточно аккуратно.
                </div>
              ) : (
                insights.topMistakes.map((item) => (
                  <div key={item.id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="text-lg font-semibold text-slate-900">{item.title}</p>
                        <p className="mt-2 text-sm leading-7 text-slate-600">{item.why}</p>
                      </div>
                      <Badge variant="destructive" className="rounded-full px-3 py-1">Повторений: {item.count}</Badge>
                    </div>
                    <div className="mt-4 rounded-[20px] border border-emerald-200 bg-emerald-50 p-4">
                      <p className="text-sm font-semibold text-emerald-800">Что тренировать</p>
                      <p className="mt-2 text-sm leading-7 text-slate-700">{item.training}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[30px] border border-slate-200 bg-white shadow-lg">
            <CardHeader className="p-6">
              <CardTitle className="text-2xl">Последние ошибки</CardTitle>
              <CardDescription>Сначала выберите ошибку, затем разберите ее и запустите этот же сценарий заново.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 p-6 pt-0">
              {riskyAttempts.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-slate-300 p-8 text-center text-slate-500">
                  Высокорисковых попыток пока нет.
                </div>
              ) : (
                riskyAttempts.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedAttemptId(item.id)}
                    className={`rounded-[24px] border p-4 text-left transition ${selectedAttemptId === item.id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-slate-50 hover:border-slate-300"}`}
                  >
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <p className={`font-semibold ${selectedAttemptId === item.id ? "text-white" : "text-slate-900"}`}>{item.title}</p>
                      <Badge variant={item.riskScore >= 70 ? "destructive" : "secondary"} className="rounded-full px-3 py-1">
                        Риск {item.riskScore}
                      </Badge>
                    </div>
                    <p className={`mt-2 text-sm ${selectedAttemptId === item.id ? "text-slate-300" : "text-slate-600"}`}>{item.actionSummary}</p>
                    <p className={`mt-2 text-xs ${selectedAttemptId === item.id ? "text-slate-400" : "text-slate-500"}`}>{formatDate(item.createdAt)} • {getAttackTypeLabel(item.attackType)} • {getDifficultyLabel(item.difficulty)}</p>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-[30px] border border-slate-200 bg-white shadow-lg">
          <CardHeader className="p-6">
            <CardTitle className="text-2xl">Разбор выбранной ошибки</CardTitle>
            <CardDescription>Сначала смотрим, что именно пошло не так, и только потом повторяем этот же сценарий.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            {!selectedAttempt ? (
              <div className="rounded-[24px] border border-dashed border-slate-300 p-8 text-center text-slate-500">
                Выберите ошибку из списка выше, чтобы увидеть подробный разбор.
              </div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">Ошибка</p>
                  <p className="mt-3 text-2xl font-bold text-slate-900">{selectedAttempt.title}</p>
                  <div className="mt-4 grid gap-3">
                    <div className="rounded-[20px] bg-white p-4">
                      <p className="text-xs text-slate-500">Что сделал пользователь</p>
                      <p className="mt-1 font-semibold text-slate-900">{selectedAttempt.actionSummary}</p>
                    </div>
                    <div className="rounded-[20px] bg-white p-4">
                      <p className="text-xs text-slate-500">Итог</p>
                      <p className="mt-1 font-semibold text-slate-900">{selectedAttempt.outcomeLabel}</p>
                    </div>
                    <div className="rounded-[20px] bg-white p-4">
                      <p className="text-xs text-slate-500">Время до клика</p>
                      <p className="mt-1 font-semibold text-slate-900">{selectedAttempt.timeToClick}s</p>
                    </div>
                    <div className="rounded-[20px] bg-white p-4">
                      <p className="text-xs text-slate-500">Почему это ошибка</p>
                      <p className="mt-1 text-sm leading-7 text-slate-700">
                        {selectedAttempt.passwordSubmitted
                          ? "Пароль был отправлен на рискованный сценарий, что создает прямую угрозу компрометации."
                          : selectedAttempt.twoFASubmitted
                            ? "Код 2FA был передан в неподходящем контексте, а значит злоумышленник мог завершить вход."
                            : selectedAttempt.clicked
                              ? "Произошел переход по ссылке без достаточной проверки sender, домена и логики формы."
                              : "Сценарий был обработан с заметным риском и требует повторного разбора."}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">Что делать дальше</p>
                  <div className="mt-4 grid gap-3">
                    <div className="rounded-[20px] bg-white p-4">
                      <p className="font-semibold text-slate-900">Шаг 1. Разбор</p>
                      <p className="mt-2 text-sm leading-7 text-slate-700">Посмотрите на домен, sender, срочность письма и на то, как запрашиваются пароль и 2FA.</p>
                    </div>
                    <div className="rounded-[20px] bg-white p-4">
                      <p className="font-semibold text-slate-900">Шаг 2. Повтор</p>
                      <p className="mt-2 text-sm leading-7 text-slate-700">После разбора запустите этот же сценарий заново и попробуйте пройти его уже без ошибки.</p>
                    </div>
                  </div>
                  <div className="mt-5 flex gap-3 flex-wrap">
                    <Button className="rounded-2xl" onClick={() => onReplayScenario(selectedAttempt.scenarioId)}>
                      Пройти этот сценарий заново
                    </Button>
                    <Button variant="outline" className="rounded-2xl" onClick={() => onNavigate("history")}>
                      Открыть историю попыток
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[30px] border border-slate-200 bg-white shadow-lg">
          <CardHeader className="p-6">
            <CardTitle className="text-2xl">{learningPlan.title}</CardTitle>
            <CardDescription>После ошибок сайт формирует, что именно повторить, какие темы открыть и какой сценарий пройти заново.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 p-6 pt-0 xl:grid-cols-[1fr_1fr]">
            <div className="grid gap-3">
              {learningPlan.modules.map((item, index) => (
                <div key={item.title} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Шаг {index + 1}</p>
                  <p className="mt-2 font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{item.detail}</p>
                </div>
              ))}
            </div>
            <div className="grid gap-3">
              {learningPlan.recommendedScenarios.map((item) => (
                <div key={item.id} className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-semibold text-slate-900">{item.title}</p>
                      <p className="mt-1 text-sm text-slate-500">{getRoleLabel(item.persona?.department)} • {getAttackTypeLabel(item.attackType)}</p>
                    </div>
                    <Badge variant="outline" className="rounded-full px-3 py-1">{getDifficultyLabel(item.difficulty)}</Badge>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-slate-700">{item.subject}</p>
                  <div className="mt-4 flex gap-3 flex-wrap">
                    <Button className="rounded-2xl" onClick={() => onReplayScenario(item.id)}>
                      Пройти этот сценарий
                    </Button>
                    <Button variant="outline" className="rounded-2xl" onClick={() => onNavigate("theory")}>
                      Открыть теорию
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </SiteChrome>
  );
}

function UrlCheckPage({ user, onBack, onNavigate, onLogout }) {
  return (
    <SiteChrome current="url-check" user={user} onNavigate={onNavigate} onLogout={onLogout}>
      <div className="space-y-6">
        <SectionHero
          eyebrow="Анализ ссылок"
          title="Проверить ссылку"
          description="Отдельный модуль для проверки домена, параметров, маскировки бренда и подозрительных токенов. Его удобно использовать как учебный инструмент до перехода по ссылке."
          icon={Link2}
          actions={<Button variant="outline" className="rounded-2xl border-white/20 bg-transparent text-white hover:bg-white/10" onClick={onBack}>Назад</Button>}
        />
        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <UrlAnalyzerPanel />
          <EmailAnalyzerPanel />
        </div>
      </div>
    </SiteChrome>
  );
}

function Auth({ onLogin }) {
  const [mode, setMode] = useState("register");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const registrationPasswordStrength = evaluatePasswordStrength(form.password);

  const submit = async () => {
    const users = readStorage(STORAGE_KEYS.users, []);
    const email = form.email.trim().toLowerCase();
    const password = form.password.trim();
    const name = form.name.trim();

    if (!email || !password || (mode === "register" && !name)) {
      setError("Заполните все обязательные поля.");
      return;
    }

    if (mode === "register") {
      if (users.some((item) => item.email === email)) {
        setError("Пользователь с таким email уже существует.");
        return;
      }
      if (!registrationPasswordStrength.isAcceptable) {
        setError("Пароль слишком слабый. Сделайте его длиннее и добавьте буквы разного регистра, цифры и спецсимволы.");
        return;
      }
    }

    setSubmitting(true);
    setError("");

    try {
      if (mode === "register") {
        const nextUser = await registerUser({ name, email, password });
        writeStorage(STORAGE_KEYS.users, [...users, nextUser]);
        writeStorage(STORAGE_KEYS.session, nextUser);
        onLogin(nextUser);
        return;
      }

      const user = await loginUser({ email, password });
      writeStorage(STORAGE_KEYS.users, [...users.filter((item) => item.id !== user.id), user]);
      writeStorage(STORAGE_KEYS.session, user);
      onLogin(user);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Неверный email или пароль.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_24%),linear-gradient(180deg,#020617_0%,#0f172a_55%,#020617_100%)] p-6">
      <div className="mx-auto grid max-w-6xl items-center gap-6 lg:min-h-[88vh] lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="overflow-hidden rounded-[36px] border border-white/10 bg-slate-950 text-white shadow-[0_30px_80px_rgba(2,6,23,0.55)]">
          <CardContent className="relative p-8 md:p-10">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.16),_transparent_28%),radial-gradient(circle_at_82%_16%,_rgba(251,191,36,0.12),_transparent_22%)]" />
            <div className="relative">
              <Badge className="rounded-full border-0 bg-amber-300 px-3 py-1 text-slate-950 hover:bg-amber-300">Дипломный проект</Badge>
              <h1 className="mt-6 max-w-4xl text-4xl font-bold leading-tight md:text-5xl">
                Обучающий симулятор для противодействия фишинговым атакам среди пользователей
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
                Платформа объединяет учебные сценарии, безопасные и фишинговые flow входа, разбор ошибок,
                оценку риска, анализ ссылок, историю прохождений и административную аналитику в едином интерфейсе.
              </p>
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {[
                  ["24/7 тренажер", "Сценарии с уровнями сложности и типами атак"],
                  ["Обучение после ошибки", "Разбор сразу после клика или ввода данных"],
                  ["Риск-аналитика", "Метрики, графики и профиль риска пользователя"],
                ].map(([title, text]) => (
                  <div key={title} className="rounded-[26px] border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                    <p className="font-semibold text-white">{title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{text}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-[26px] border border-white/10 bg-white/5 p-5 text-sm text-slate-300">
                Дипломный проект выполнил: <strong className="text-white">Кумаров Саят</strong>
              </div>
            </div>
          </CardContent>
        </Card>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="rounded-[36px] border border-white/40 bg-white/95 shadow-[0_24px_70px_rgba(15,23,42,0.22)] backdrop-blur">
            <CardHeader className="p-8 pb-4">
              <CardTitle className="text-2xl">{mode === "register" ? "Регистрация" : "Вход"}</CardTitle>
              <CardDescription className="pt-2 leading-6">
                {mode === "register"
                  ? "Создайте аккаунт, чтобы проходить сценарии и видеть свой риск-профиль."
                  : "Войдите, чтобы открыть симулятор, теорию, историю попыток и аналитику."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-8 pt-0">
              {mode === "register" ? (
                <div className="space-y-2">
                  <Label>Имя</Label>
                  <Input className="rounded-2xl border-slate-200" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
              ) : null}
              <div className="space-y-2">
                <Label>Email</Label>
                <Input className="rounded-2xl border-slate-200" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Пароль</Label>
                <Input className="rounded-2xl border-slate-200" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
              {mode === "register" ? <PasswordStrengthHint password={form.password} /> : null}
              {error ? (
                <Alert variant="destructive" className="rounded-2xl">
                  <AlertTitle>Ошибка</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
              <Button className="h-12 w-full rounded-2xl bg-slate-900 text-white hover:bg-slate-800" onClick={submit} disabled={submitting}>
                {submitting ? "Сохранение..." : mode === "register" ? "Создать аккаунт" : "Войти"}
              </Button>
              <Button variant="outline" className="h-12 w-full rounded-2xl border-slate-200" onClick={() => { setMode(mode === "register" ? "login" : "register"); setError(""); }}>
                {mode === "register" ? "Уже есть аккаунт" : "Нужна регистрация"}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
function Theory({ user, onBack, onNavigate, onLogout }) {
  const [theoryTab, setTheoryTab] = useState("overview");
  const [activePhishingType, setActivePhishingType] = useState(PHISHING_TYPE_DETAILS[0].id);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizCurrentIndex, setQuizCurrentIndex] = useState(0);
  const quizItems = [
    {
      id: "q1",
      type: "single",
      kind: "phishing",
      question: "Письмо просит срочно ввести пароль и код 2FA на одной странице. Это нормальный вход?",
      options: [
        { id: "a", text: "Нет, это сильный признак фишинга", correct: true },
        { id: "b", text: "Да, так делают все корпоративные сервисы", correct: false },
      ],
      explanation: "Безопасный вход обычно разделяет пароль и второй фактор по шагам.",
    },
    {
      id: "q2",
      type: "single",
      kind: "phishing",
      question: "Какой признак надежнее всего проверяет ссылку?",
      options: [
        { id: "a", text: "Цвет кнопки и логотип", correct: false },
        { id: "b", text: "Реальный домен и параметры URL", correct: true },
      ],
      explanation: "Оформление можно скопировать, а домен и структура URL часто выдают подделку.",
    },
    {
      id: "q3",
      type: "truefalse",
      kind: "phishing",
      question: "Если письмо выглядит аккуратно, без ошибок, это гарантирует безопасность?",
      options: [
        { id: "a", text: "Нет, современные атаки часто выглядят правдоподобно", correct: true },
        { id: "b", text: "Да, фишинг всегда заметен по ошибкам", correct: false },
      ],
      explanation: "Сейчас фишинг часто визуально качественный, поэтому важны независимые признаки проверки.",
    },
    {
      id: "q4",
      type: "multiple",
      kind: "phishing",
      question: "Какие признаки могут указывать на spoofing отправителя? Выберите несколько вариантов.",
      options: [
        { id: "a", text: "Домен похож на официальный, но отличается деталями", correct: true },
        { id: "b", text: "Display name выглядит как IT Support", correct: false },
        { id: "c", text: "Фактический email не совпадает с ожидаемым доменом компании", correct: true },
        { id: "d", text: "В письме есть обычное приветствие", correct: false },
      ],
      explanation: "При spoofing важно смотреть не только имя отправителя, а фактический email и домен.",
    },
    {
      id: "q5",
      type: "single",
      kind: "phishing",
      question: "Если ссылка ведет на http:// вместо https://, это хороший знак?",
      options: [
        { id: "a", text: "Нет, отсутствие https повышает риск", correct: true },
        { id: "b", text: "Да, протокол не имеет значения", correct: false },
      ],
      explanation: "Отсутствие HTTPS не всегда означает фишинг, но это заметный технический риск.",
    },
    {
      id: "q6",
      type: "single",
      kind: "phishing",
      question: "Письмо от CEO просит срочно перевести деньги и никому не говорить. Как оценить это?",
      options: [
        { id: "a", text: "Это сильный признак CEO Fraud", correct: true },
        { id: "b", text: "Это нормальная практика руководителя", correct: false },
      ],
      explanation: "Срочность, давление и секретность часто встречаются в сценариях мошенничества от имени руководства.",
    },
    {
      id: "q7",
      type: "single",
      kind: "phishing",
      question: "Что опаснее: вложение Report_2026.docx.exe или обычный PDF-отчет?",
      options: [
        { id: "a", text: "Report_2026.docx.exe, потому что это двойное расширение", correct: true },
        { id: "b", text: "PDF опаснее, потому что его легче открыть", correct: false },
      ],
      explanation: "Двойное расширение маскирует исполняемый файл под документ.",
    },
    {
      id: "q8",
      type: "multiple",
      kind: "phishing",
      question: "Какие запросы на одной странице являются сильными красными флагами? Выберите несколько вариантов.",
      options: [
        { id: "a", text: "Пароль", correct: true },
        { id: "b", text: "Код 2FA", correct: true },
        { id: "c", text: "Данные карты или платежный код", correct: true },
        { id: "d", text: "Обычный email как логин", correct: false },
      ],
      explanation: "Одновременный сбор пароля, 2FA и платежных данных на одной странице почти всегда является критическим сигналом риска.",
    },
    {
      id: "q9",
      type: "single",
      kind: "safe",
      question: "Компания просит сначала ввести пароль, а код 2FA показывает только на следующем шаге. Это больше похоже на что?",
      options: [
        { id: "a", text: "На нормальный безопасный flow входа", correct: true },
        { id: "b", text: "На фишинг, потому что 2FA не спросили сразу", correct: false },
      ],
      explanation: "Пошаговый вход с отдельным экраном 2FA обычно ближе к реальному безопасному сценарию.",
    },
    {
      id: "q10",
      type: "single",
      kind: "safe",
      question: "Если домен страницы полностью совпадает с официальным корпоративным доменом, это что означает?",
      options: [
        { id: "a", text: "Это хороший признак, но все равно стоит проверять остальные детали", correct: true },
        { id: "b", text: "Дальше уже можно ничего не проверять", correct: false },
      ],
      explanation: "Совпадение домена снижает риск, но не отменяет проверку sender, контекста и логики действия.",
    },
    {
      id: "q11",
      type: "truefalse",
      kind: "safe",
      question: "Письмо предлагает открыть внутренний документ в обычном PDF без срочности и без запроса пароля. Это всегда фишинг?",
      options: [
        { id: "a", text: "Нет, это может быть легитимный рабочий сценарий", correct: true },
        { id: "b", text: "Да, любое вложение всегда означает атаку", correct: false },
      ],
      explanation: "Важен не сам факт вложения, а совокупность признаков: расширение файла, контекст, sender и цель письма.",
    },
    {
      id: "q12",
      type: "single",
      kind: "safe",
      question: "Пользователь потратил больше 10 секунд на проверку письма и только потом принял решение. Как это влияет на профиль?",
      options: [
        { id: "a", text: "Это ближе к осторожному поведению", correct: true },
        { id: "b", text: "Это автоматически делает письмо опасным", correct: false },
      ],
      explanation: "Если пользователь думает перед действием, риск обычно ниже, чем при мгновенном клике.",
    },
    {
      id: "q13",
      type: "single",
      kind: "safe",
      question: "Что считается лучшим исходом в безопасном сценарии обучения?",
      options: [
        { id: "a", text: "Пользователь распознал нормальный flow и не ищет угрозу там, где ее нет", correct: true },
        { id: "b", text: "Пользователь сообщает о фишинге на любой легитимный экран без проверки", correct: false },
      ],
      explanation: "Цель обучения не только находить фишинг, но и правильно распознавать безопасные сценарии.",
    },
    {
      id: "q14",
      type: "truefalse",
      kind: "safe",
      question: "Если после ввода пароля система переводит на отдельный экран подтверждения входа, это может быть нормой?",
      options: [
        { id: "a", text: "Да, это типично для безопасного 2FA flow", correct: true },
        { id: "b", text: "Нет, любой второй экран означает фишинг", correct: false },
      ],
      explanation: "Разделение логина и второго фактора чаще характерно для легитимной аутентификации.",
    },
    {
      id: "q15",
      type: "single",
      kind: "safe",
      question: "Если пользователь не уверен, но сам открывает официальный портал из закладок вместо ссылки из письма, это хорошая практика?",
      options: [
        { id: "a", text: "Да, это снижает риск перехода на поддельный лендинг", correct: true },
        { id: "b", text: "Нет, всегда нужно пользоваться только ссылкой из письма", correct: false },
      ],
      explanation: "Открывать официальный сервис напрямую часто безопаснее, чем доверять ссылке из письма.",
    },
    {
      id: "q16",
      type: "single",
      kind: "safe",
      question: "Письмо пришло с ожидаемого корпоративного адреса, без давления, без запроса данных и с понятной рабочей задачей. Как его оценить?",
      options: [
        { id: "a", text: "Как потенциально легитимное письмо, но все равно с базовой проверкой", correct: true },
        { id: "b", text: "Как фишинг только потому, что это письмо", correct: false },
      ],
      explanation: "Безопасная работа включает проверку, но не должна превращаться в подозрение ко всему подряд.",
    },
  ];
  const phishingQuestions = quizItems.filter((item) => item.kind === "phishing").length;
  const safeQuestions = quizItems.filter((item) => item.kind === "safe").length;
  const activeType = PHISHING_TYPE_DETAILS.find((item) => item.id === activePhishingType) || PHISHING_TYPE_DETAILS[0];
  const currentQuizItem = quizItems[quizCurrentIndex];
  const currentQuizAnswer = currentQuizItem ? quizAnswers[currentQuizItem.id] : undefined;
  const getQuizTypeLabel = (type) => {
    if (type === "multiple") return "Несколько ответов";
    if (type === "truefalse") return "Верно / неверно";
    return "Один ответ";
  };
  const hasQuizAnswer = (question, answer) => {
    if (!question) return false;
    if (question.type === "multiple") return Array.isArray(answer) && answer.length > 0;
    return Boolean(answer);
  };
  const isOptionSelected = (question, optionId) => {
    const answer = quizAnswers[question.id];
    return question.type === "multiple" ? Array.isArray(answer) && answer.includes(optionId) : answer === optionId;
  };
  const isQuizAnswerCorrect = (question, answer) => {
    if (!hasQuizAnswer(question, answer)) return false;
    if (question.type === "multiple") {
      const selected = Array.isArray(answer) ? answer.slice().sort() : [];
      const correct = question.options.filter((option) => option.correct).map((option) => option.id).sort();
      return selected.length === correct.length && selected.every((id, index) => id === correct[index]);
    }
    const selected = question.options.find((option) => option.id === answer);
    return Boolean(selected?.correct);
  };
  const currentQuizHasAnswer = hasQuizAnswer(currentQuizItem, currentQuizAnswer);
  const currentQuizCorrect = isQuizAnswerCorrect(currentQuizItem, currentQuizAnswer);
  const quizCompleted = quizItems.every((item) => hasQuizAnswer(item, quizAnswers[item.id]));
  const quizScore = quizItems.filter((item) => {
    const answer = quizAnswers[item.id];
    return isQuizAnswerCorrect(item, answer);
  }).length;
  const quizLevel = quizScore >= 14 ? "Высокий" : quizScore >= 10 ? "Средний" : "Начальный";

  return (
    <SiteChrome current="theory" user={user} onNavigate={onNavigate} onLogout={onLogout}>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-white">Теория и ориентиры</h1>
            <p className="mt-1 text-slate-300">Production-like учебная страница с акцентом на реальные сигналы риска.</p>
          </div>
          <Button variant="outline" className="rounded-2xl border-white/20 bg-transparent text-white hover:bg-white/10" onClick={onBack}>Назад</Button>
        </div>

        <Card className="rounded-[34px] border border-white/10 bg-slate-950 text-white shadow-2xl">
          <CardContent className="grid gap-6 p-8 md:grid-cols-[1.1fr_0.9fr]">
            <div>
              <Badge className="rounded-full border-0 bg-amber-300 px-3 py-1 text-slate-950 hover:bg-amber-300">Теоретический модуль</Badge>
              <h2 className="mt-5 text-4xl font-bold leading-tight">Как понять разницу между безопасным действием и фишингом</h2>
              <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
                Хороший сотрудник не пытается угадывать. Он проверяет независимые признаки: домен, sender, flow авторизации,
                момент запроса 2FA, наличие давления и качество URL.
              </p>
            </div>
            <div className="grid gap-4">
              {THEORY_SECTIONS.map((item) => (
                <div key={item.title} className={`rounded-[26px] border p-5 ${item.tone}`}>
                  <p className="font-semibold">{item.title}</p>
                  <p className="mt-2 text-sm leading-7">{item.body}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[30px] border border-slate-200 bg-white shadow-lg">
          <CardContent className="flex gap-3 flex-wrap p-4">
            {[
              { id: "overview", label: "Обзор" },
              { id: "types", label: "Виды фишинга" },
              { id: "faq", label: "FAQ" },
              { id: "quiz", label: "Тест" },
            ].map((tab) => (
              <FilterPill key={tab.id} active={theoryTab === tab.id} onClick={() => setTheoryTab(tab.id)}>
                {tab.label}
              </FilterPill>
            ))}
          </CardContent>
        </Card>

        {theoryTab === "overview" ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="rounded-[30px] border border-slate-200 bg-white shadow-lg">
              <CardHeader className="p-6">
                <CardTitle className="text-2xl">Чек-лист перед кликом</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 p-6 pt-0">
                {[
                  "Проверить display name и полный email отправителя.",
                  "Навести курсор и сравнить реальный домен ссылки.",
                  "Посмотреть, нет ли слов verify / secure / auth в URL.",
                  "Понять, не пытается ли форма запросить пароль и 2FA сразу.",
                  "Оценить срочность, вложения и необычные требования к оплате.",
                ].map((item, index) => (
                  <div key={item} className="flex items-start gap-4 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">{index + 1}</div>
                    <p className="text-sm leading-7 text-slate-700">{item}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-[30px] border border-slate-200 bg-white shadow-lg">
              <CardHeader className="p-6">
                <CardTitle className="text-2xl">Как читать сценарий правильно</CardTitle>
                <CardDescription>Короткий ориентир перед практикой.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 p-6 pt-0">
                {[
                  "Не доверять письму только потому, что оно выглядит официально и написано без ошибок.",
                  "Отдельно проверять sender, домен, URL и логику авторизации на странице входа.",
                  "Понимать, что нормальный безопасный flow часто разделяет пароль и 2FA на два шага.",
                  "Оценивать не один признак, а всю цепочку: письмо -> ссылка -> лендинг -> запрос данных.",
                ].map((item) => (
                  <div key={item} className="rounded-[24px] border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-700">
                    {item}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        ) : null}

        {theoryTab === "types" ? (
          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <Card className="rounded-[30px] border border-slate-200 bg-white shadow-lg">
              <CardHeader className="p-6">
                <CardTitle className="text-2xl">Виды фишинга</CardTitle>
                <CardDescription>Нажмите на тип атаки, чтобы открыть подробный разбор.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 p-6 pt-0">
                {PHISHING_TYPE_DETAILS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActivePhishingType(item.id)}
                    className={`rounded-[24px] border p-4 text-left transition-all ${
                      activePhishingType === item.id
                        ? "border-slate-900 bg-slate-900 text-white shadow-lg"
                        : "border-slate-200 bg-slate-50 text-slate-900 hover:border-slate-300 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className={`font-semibold ${activePhishingType === item.id ? "text-white" : "text-slate-900"}`}>{item.title}</p>
                      <Badge variant="secondary" className="rounded-full px-3 py-1">
                        {item.badge}
                      </Badge>
                    </div>
                    <p className={`mt-2 text-sm leading-7 ${activePhishingType === item.id ? "text-slate-300" : "text-slate-600"}`}>{item.summary}</p>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-[30px] border border-slate-200 bg-white shadow-lg">
              <CardHeader className="p-6">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <CardTitle className="text-2xl">{activeType.title}</CardTitle>
                    <CardDescription className="pt-2">{activeType.summary}</CardDescription>
                  </div>
                  <Badge className="rounded-full bg-slate-900 px-3 py-1 text-white hover:bg-slate-900">{activeType.badge}</Badge>
                </div>
              </CardHeader>
              <CardContent className="grid gap-5 p-6 pt-0">
                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-400">Подробный разбор</p>
                  <p className="mt-3 text-sm leading-8 text-slate-700">{activeType.description}</p>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-[24px] border border-rose-200 bg-rose-50 p-5">
                    <p className="font-semibold text-rose-900">На что обращать внимание</p>
                    <div className="mt-4 grid gap-3">
                      {activeType.cues.map((cue) => (
                        <div key={cue} className="rounded-[18px] bg-white/80 p-4 text-sm leading-7 text-slate-700">
                          {cue}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-5">
                    <p className="font-semibold text-emerald-900">Как действовать правильно</p>
                    <div className="mt-4 rounded-[18px] bg-white/80 p-4 text-sm leading-8 text-slate-700">
                      {activeType.prevention}
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-sky-200 bg-sky-50 p-5">
                  <p className="font-semibold text-sky-900">Учебный пример</p>
                  <p className="mt-3 text-sm leading-8 text-slate-700">{activeType.example}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {theoryTab === "faq" ? (
          <Card className="rounded-[30px] border border-slate-200 bg-white shadow-lg">
            <CardHeader className="p-6">
              <CardTitle className="text-2xl">Частые вопросы</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 p-6 pt-0">
              {THEORY_FAQ.map((item, index) => (
                <div key={item.q} className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-400">FAQ {index + 1}</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{item.q}</p>
                  <p className="mt-3 text-sm leading-7 text-slate-700">{item.a}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        {theoryTab === "quiz" ? (
          <Card className="rounded-[30px] border border-slate-200 bg-white shadow-lg">
            <CardHeader className="p-6">
              <CardTitle className="text-2xl">Тест после теории</CardTitle>
              <CardDescription>Сбалансированная проверка: {phishingQuestions} вопросов про фишинг и {safeQuestions} вопросов про безопасные сценарии.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 p-6 pt-0">
              <div className="flex items-center justify-between gap-3 flex-wrap rounded-[22px] bg-slate-50 px-4 py-3">
                <p className="text-sm text-slate-500">Прогресс теста</p>
                <p className="text-sm font-semibold text-slate-900">Вопрос {Math.min(quizCurrentIndex + 1, quizItems.length)} из {quizItems.length}</p>
              </div>

              {!quizCompleted && currentQuizItem ? (
                <div className="rounded-[26px] border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-400">Вопрос {quizCurrentIndex + 1}</p>
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="outline" className="rounded-full px-3 py-1">
                        {getQuizTypeLabel(currentQuizItem.type)}
                      </Badge>
                      {currentQuizHasAnswer ? (
                        <Badge variant="secondary" className={`rounded-full px-3 py-1 ${currentQuizItem.kind === "phishing" ? "bg-rose-100 text-rose-700 hover:bg-rose-100" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"}`}>
                          {currentQuizItem.kind === "phishing" ? "Фишинг" : "Безопасный сценарий"}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  <p className="mt-2 text-2xl font-semibold leading-9 text-slate-900">{currentQuizItem.question}</p>
                  {currentQuizItem.type === "multiple" ? (
                    <p className="mt-3 text-sm leading-7 text-slate-500">
                      Можно выбрать несколько вариантов. Ответ засчитывается только если выбраны все правильные и нет лишних.
                    </p>
                  ) : null}
                  <div className="mt-5 flex gap-3 flex-wrap">
                    {currentQuizItem.options.map((option) => (
                      <Button
                        key={option.id}
                        variant={isOptionSelected(currentQuizItem, option.id) ? "default" : "outline"}
                        className="rounded-2xl"
                        onClick={() => {
                          setQuizAnswers((prev) => {
                            if (currentQuizItem.type !== "multiple") {
                              return { ...prev, [currentQuizItem.id]: option.id };
                            }
                            const current = Array.isArray(prev[currentQuizItem.id]) ? prev[currentQuizItem.id] : [];
                            const next = current.includes(option.id)
                              ? current.filter((id) => id !== option.id)
                              : [...current, option.id];
                            return { ...prev, [currentQuizItem.id]: next };
                          });
                        }}
                      >
                        {option.text}
                      </Button>
                    ))}
                  </div>
                  {currentQuizHasAnswer ? (
                    <div className={`mt-5 rounded-[22px] border p-5 ${currentQuizCorrect ? "border-emerald-300 bg-emerald-50 text-emerald-950" : "border-rose-300 bg-rose-50 text-rose-950"}`}>
                      <p className="text-lg font-bold">{currentQuizCorrect ? "Правильно" : "Неправильно"}</p>
                      <p className="mt-3 text-sm leading-7">{currentQuizItem.explanation}</p>
                    </div>
                  ) : null}
                  <div className="mt-5 flex gap-3 flex-wrap">
                    <Button
                      variant="outline"
                      className="rounded-2xl"
                      onClick={() => setQuizCurrentIndex((prev) => (prev === 0 ? 0 : prev - 1))}
                      disabled={quizCurrentIndex === 0}
                    >
                      Назад
                    </Button>
                    <Button
                      className="rounded-2xl"
                      onClick={() => setQuizCurrentIndex((prev) => Math.min(prev + 1, quizItems.length - 1))}
                      disabled={!currentQuizHasAnswer}
                    >
                      {quizCurrentIndex === quizItems.length - 1 ? "Завершить тест" : "Следующий вопрос"}
                    </Button>
                  </div>
                </div>
              ) : null}

              {quizCompleted ? (
                <div className="grid gap-4">
                  <div className="rounded-[26px] border border-slate-200 bg-slate-50 p-6">
                    <p className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-400">Результат</p>
                    <div className="mt-4 grid gap-4 md:grid-cols-3">
                      <div className="rounded-[22px] bg-white p-5">
                        <p className="text-sm text-slate-500">Итоговый счет</p>
                        <p className="mt-2 text-4xl font-bold text-slate-900">{quizScore}/{quizItems.length}</p>
                      </div>
                      <div className="rounded-[22px] bg-white p-5">
                        <p className="text-sm text-slate-500">Уровень</p>
                        <p className="mt-2 text-4xl font-bold text-slate-900">{quizLevel}</p>
                      </div>
                      <div className="rounded-[22px] bg-white p-5">
                        <p className="text-sm text-slate-500">Правильных ответов</p>
                        <p className="mt-2 text-4xl font-bold text-slate-900">{quizScore}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 flex-wrap">
                    <Button
                      className="rounded-2xl"
                      onClick={() => {
                        setQuizAnswers({});
                        setQuizCurrentIndex(0);
                      }}
                    >
                      Пройти тест заново
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-2xl"
                      onClick={() => setTheoryTab("overview")}
                    >
                      Вернуться к теории
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </SiteChrome>
  );
}

function MailSurface({ item, hoverUrl, onHoverUrl, onRevealSender, revealSender, onOpenLanding, onOpenFile, onReport }) {
  const isUrlVisible = hoverUrl === item.landingUrl;
  const highlightedUrl = isUrlVisible ? highlightUrlParts(hoverUrl, item.officialUrl) : [];
  const showLandingUrl = () => onHoverUrl(item.landingUrl);
  const hideLandingUrl = () => onHoverUrl("");
  const toggleLandingUrl = () => {
    if (isUrlVisible) {
      hideLandingUrl();
      return;
    }
    showLandingUrl();
  };

  return (
    <Card className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
      <div className="border-b border-slate-200 bg-[linear-gradient(180deg,#eff6ff_0%,#e2e8f0_100%)] p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-blue-600 p-3 text-white"><Mail className="h-5 w-5" /></div>
            <div>
              <p className="text-lg font-semibold text-slate-900">{item.mailbox}</p>
              <p className="text-sm text-slate-500">Учебный эмулятор почтовой среды</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Badge className={`rounded-full px-3 py-1 ${getDifficultyClasses(item.difficulty)}`}>{getDifficultyLabel(item.difficulty)}</Badge>
            <Badge variant="secondary" className="rounded-full px-3 py-1">{getAttackTypeLabel(item.attackType)}</Badge>
          </div>
        </div>
      </div>
      <CardContent className="space-y-5 p-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-3xl font-semibold text-slate-950">{item.subject}</p>
            <p className="mt-4 text-lg font-semibold text-slate-900">{item.senderName}</p>
            <button type="button" className="mt-1 text-sm text-slate-500 underline-offset-4 hover:underline" onClick={onRevealSender}>
              От: {revealSender ? item.senderEmail : item.displayEmail}
            </button>
            <p className="mt-2 text-sm text-slate-500">Получатель: {item.persona.email}</p>
          </div>
          <div className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-700 transition-colors duration-200 hover:bg-slate-200">{item.preview}</div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm leading-8 text-slate-700">{item.body}</p>
          <div className="mt-4 rounded-[22px] border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
            {item.callout}
          </div>
          <div className="mt-5 flex gap-3 flex-wrap">
            <Button
              className="rounded-2xl bg-blue-600 hover:bg-blue-500"
              onClick={onOpenLanding}
            >
              Открыть страницу
            </Button>
            <Button
              variant="outline"
              className="rounded-2xl"
              onClick={toggleLandingUrl}
            >
              {isUrlVisible ? "Скрыть URL" : "Показать URL"}
            </Button>
            <Button variant="outline" className="rounded-2xl" onClick={onReport}>
              Сообщить о фишинге
            </Button>
            {item.attachment ? (
              <Button variant="outline" className="rounded-2xl" onClick={onOpenFile}>
                Открыть вложение
              </Button>
            ) : null}
          </div>
        </div>

        {item.attachment ? (
          <div className="flex items-center justify-between gap-3 rounded-[26px] border border-slate-200 bg-white p-5 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl bg-rose-50 p-3 text-rose-600"><FileWarning className="h-5 w-5" /></div>
              <div>
                <p className="font-semibold text-slate-900">{item.attachment.name}</p>
                <p className="mt-1 text-sm text-slate-500">{item.attachment.danger}</p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="rounded-[24px] border border-slate-200 bg-slate-950 px-4 py-3 text-sm text-white">
          {isUrlVisible ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
              <Link2 className="h-4 w-4 text-amber-300" />
              <span className="truncate">
                {highlightedUrl.map((part, index) => (
                  <span key={`${part.text}-${index}`} className={part.tone}>{part.text}</span>
                ))}
              </span>
              </div>
              <button type="button" className="shrink-0 text-xs text-slate-300 underline-offset-4 hover:underline" onClick={hideLandingUrl}>
                Скрыть
              </button>
            </div>
          ) : (
            <span className="text-slate-300">Наведите курсор на кнопку или нажмите «Показать URL», чтобы увидеть реальный адрес.</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function LandingSurface({ item, form, setForm, step, onBack, onSubmit, onSafeNext, onReport }) {
  const isSafe = item.isSafeFlow;
  const passwordClass = `rounded-2xl transition-all duration-200 ${form.password.trim() ? (isSafe ? "border-emerald-200 bg-emerald-50 ring-4 ring-emerald-100" : "border-rose-300 bg-rose-50 ring-4 ring-rose-100") : ""}`;
  const twoFactorClass = `rounded-2xl transition-all duration-200 ${form.twoFactor.trim() ? (isSafe && step === "2fa" ? "border-emerald-200 bg-emerald-50 ring-4 ring-emerald-100" : "border-rose-300 bg-rose-50 ring-4 ring-rose-100") : ""}`;
  const paymentClass = `rounded-2xl transition-all duration-200 ${form.payment.trim() ? "border-rose-300 bg-rose-50 ring-4 ring-rose-100" : ""}`;
  return (
    <Card className="rounded-[30px] border border-slate-200 bg-white shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
      <CardHeader className="border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-2xl">{isSafe ? "Официальный вход" : "Страница проверки доступа"}</CardTitle>
            <CardDescription className="pt-2">
              {isSafe
                ? step === "password"
                  ? "Шаг 1 из 2: email и password"
                  : "Шаг 2 из 2: отдельный экран 2FA"
                : "Подтвердите доступ, чтобы продолжить работу с сервисом."}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary" className="rounded-full px-3 py-1">{new URL(item.officialUrl).host}</Badge>
            {item.isSafeFlow ? (
              <Badge className="rounded-full px-3 py-1 bg-emerald-600 text-white hover:bg-emerald-600">
                Безопасно
              </Badge>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          {(step === "password" || !isSafe) ? (
            <>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input className="rounded-2xl transition-all duration-200 focus:ring-4 focus:ring-sky-100" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              {item.asksPassword ? (
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input className={passwordClass} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                </div>
              ) : null}
            </>
          ) : null}

          {(step === "2fa" || (!isSafe && item.asks2FA)) ? (
            <div className="space-y-2">
              <Label>2FA code</Label>
              <Input className={twoFactorClass} value={form.twoFactor} onChange={(e) => setForm({ ...form, twoFactor: e.target.value })} />
            </div>
          ) : null}

          {!isSafe && item.asksPayment ? (
            <div className="space-y-2 md:col-span-2">
              <Label>Платежные данные</Label>
              <Input className={paymentClass} value={form.payment} onChange={(e) => setForm({ ...form, payment: e.target.value })} placeholder="Введите карту или платежный код" />
            </div>
          ) : null}
        </div>

        {!isSafe ? null : null}

        <div className="flex gap-3 flex-wrap">
          <Button variant="outline" className="rounded-2xl" onClick={onBack}>Назад к письму</Button>
          <Button variant="outline" className="rounded-2xl" onClick={onReport}>Сообщить о фишинге</Button>
          {isSafe && step === "password" && item.asks2FA ? (
            <Button className="rounded-2xl bg-emerald-600 hover:bg-emerald-500" onClick={onSafeNext}>Перейти к шагу 2FA</Button>
          ) : (
            <Button className="rounded-2xl" onClick={onSubmit}>{isSafe ? "Завершить вход" : "Отправить данные"}</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
function LearningReview({ item, result, onSave, onNext, saved, autoSaved = false }) {
  const isFailure = item.scenarioType !== "safe" && (result.clicked || result.passwordSubmitted || result.twoFASubmitted || result.paymentSubmitted);
  const isFalseAlarm = item.scenarioType === "safe" && result.falseAlarm;
  const title = isFailure
    ? "Вы попались на фишинг"
    : isFalseAlarm
      ? "Безопасный сценарий ошибочно отмечен как фишинг"
      : result.detectedWithoutInteraction || result.reportedCorrectly
        ? "Фишинг остановлен вовремя"
        : "Безопасный сценарий завершен";
  const riskStatus = getRiskStatus(result.riskScore);
  const cues = isFalseAlarm
    ? [
        "Официальный домен совпадал с ожидаемым сервисом",
        "Sender выглядел нормальным для рабочего процесса",
        "Логика входа была пошаговой и ближе к безопасному flow",
      ]
    : buildRiskCueList(item);
  const consequences = buildRealWorldConsequences(result, item);

  return (
    <Card className={`rounded-[30px] border ${isFailure ? "border-rose-200 bg-rose-50" : "border-emerald-200 bg-emerald-50"} shadow-xl`}>
      <CardHeader className="p-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className={`rounded-2xl p-3 ${isFailure ? "bg-rose-600 text-white" : "bg-emerald-600 text-white"}`}>
              {isFailure ? <Siren className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
            </div>
            <div>
              <CardTitle className="text-2xl">{title}</CardTitle>
              <CardDescription className="pt-2 text-slate-700">
                Итог: {result.outcomeLabel} • Риск {result.riskScore}
              </CardDescription>
            </div>
          </div>
          <Badge variant={riskStatus.variant} className="rounded-full px-3 py-1">{riskStatus.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 p-6 pt-0 lg:grid-cols-2">
        <div className="rounded-[24px] border border-white/60 bg-white/80 p-5">
          <p className="text-lg font-semibold text-slate-900">{isFalseAlarm ? "Что указывало на безопасный сценарий" : "Что выдало фишинг"}</p>
          <div className="mt-4 grid gap-3">
            {cues.map((cue) => (
              <div key={cue} className="rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-700">{cue}</div>
            ))}
          </div>
        </div>
        <div className="rounded-[24px] border border-white/60 bg-white/80 p-5">
          <p className="text-lg font-semibold text-slate-900">{isFalseAlarm ? "Что нужно было учесть перед сообщением о фишинге" : "Какие признаки нужно было заметить"}</p>
          <div className="mt-4 grid gap-3">
            {item.cues.map((cue) => (
              <div key={cue} className="rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-700">{cue}</div>
            ))}
          </div>
        </div>
        <div className="rounded-[24px] border border-white/60 bg-white/80 p-5">
          <p className="text-lg font-semibold text-slate-900">Что делать в реальной жизни</p>
          <div className="mt-4 grid gap-3 text-sm leading-7 text-slate-700">
            {isFalseAlarm ? (
              <>
                <div className="rounded-2xl bg-slate-50 p-4">Перед сообщением о фишинге перепроверьте домен, sender и последовательность шагов входа.</div>
                <div className="rounded-2xl bg-slate-50 p-4">Если сервис открыт на официальном домене и использует ожидаемый flow, не помечайте его как атаку автоматически.</div>
                <div className="rounded-2xl bg-slate-50 p-4">Цель обучения — не подозревать все подряд, а уверенно отличать легитимный сценарий от подделки.</div>
              </>
            ) : (
              <>
                <div className="rounded-2xl bg-slate-50 p-4">Остановить взаимодействие и не повторять ввод данных на сомнительной странице.</div>
                <div className="rounded-2xl bg-slate-50 p-4">Сменить пароль через официальный портал и проверить активные сессии.</div>
                <div className="rounded-2xl bg-slate-50 p-4">Сообщить в IT / ИБ и приложить тему письма, sender и URL.</div>
              </>
            )}
          </div>
        </div>
        <div className="rounded-[24px] border border-white/60 bg-white/80 p-5">
          <p className="text-lg font-semibold text-slate-900">Что произошло бы в реальности</p>
          <div className="mt-4 grid gap-3 text-sm leading-7 text-slate-700">
            {consequences.map((itemText) => (
              <div key={itemText} className="rounded-2xl bg-slate-50 p-4">{itemText}</div>
            ))}
          </div>
        </div>
        <div className="rounded-[24px] border border-white/60 bg-white/80 p-5">
          <p className="text-lg font-semibold text-slate-900">Сводка попытки</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Тип атаки</p><p className="mt-1 font-semibold">{getAttackTypeLabel(item.attackType)}</p></div>
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Сложность</p><p className="mt-1 font-semibold">{getDifficultyLabel(item.difficulty)}</p></div>
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Время до клика</p><p className="mt-1 font-semibold">{result.timeToClick}s</p></div>
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Время до распознавания</p><p className="mt-1 font-semibold">{result.timeToDetect}s</p></div>
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Реакция</p><p className="mt-1 font-semibold">{result.reactionLabel}</p><p className="mt-2 text-xs text-slate-500">{result.reactionHint}</p></div>
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Баллы за попытку</p><p className={`mt-1 font-semibold ${result.scoreDelta >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{result.scoreDelta >= 0 ? `+${result.scoreDelta}` : result.scoreDelta}</p></div>
            <div className="rounded-2xl bg-slate-50 p-4 md:col-span-2"><p className="text-xs text-slate-500">Реакция системы безопасности</p><p className="mt-1 font-semibold">{result.systemReaction}</p></div>
          </div>
        </div>
        <div className="rounded-[24px] border border-white/60 bg-white/80 p-5">
          <p className="text-lg font-semibold text-slate-900">Лог атаки</p>
          <div className="mt-4 grid gap-3">
            {result.attackTimeline.map((entry) => (
              <div key={entry.step} className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold ${entry.state === "done" ? "bg-rose-600 text-white" : entry.state === "prevented" ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700"}`}>
                  {entry.step}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{entry.title}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {entry.state === "done" ? "Этап выполнен" : entry.state === "prevented" ? "Этап предотвращен" : "Этап не произошел"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="lg:col-span-2 flex gap-3 flex-wrap">
          {autoSaved ? (
            <Button className="rounded-2xl" disabled>
              Результат сохранен автоматически
            </Button>
          ) : (
            <Button className="rounded-2xl" onClick={onSave} disabled={saved}>
              {saved ? "Результат сохранен" : "Сохранить результат"}
            </Button>
          )}
          <Button variant="outline" className="rounded-2xl" onClick={onNext}>Пройти следующий сценарий</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Simulator({ user, onBack, onSaved, initialExamMode = false, onNavigate, onLogout, initialScenarioId = null }) {
  const [difficultyFilter, setDifficultyFilter] = useState(readStorage(STORAGE_KEYS.settings, {}).difficultyFilter || "All");
  const [attackTypeFilter, setAttackTypeFilter] = useState(readStorage(STORAGE_KEYS.settings, {}).attackTypeFilter || "All");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [view, setView] = useState("mail");
  const [landingStep, setLandingStep] = useState("password");
  const [hoveredUrl, setHoveredUrl] = useState("");
  const [revealSender, setRevealSender] = useState(false);
  const [openedFile, setOpenedFile] = useState(false);
  const [startedAt, setStartedAt] = useState(Date.now());
  const [clickedAt, setClickedAt] = useState(null);
  const [saved, setSaved] = useState(false);
  const [result, setResult] = useState(null);
  const [form, setForm] = useState({ email: "", password: "", twoFactor: "", payment: "" });
  const [mobileMode, setMobileMode] = useState(false);
  const [examMode, setExamMode] = useState(false);
  const [examType, setExamType] = useState("standard");
  const [examQueue, setExamQueue] = useState([]);
  const [examResults, setExamResults] = useState([]);
  const [examSessionId, setExamSessionId] = useState(null);
  const [pendingScenarioId, setPendingScenarioId] = useState(null);

  const allScenarios = useMemo(() => buildScenarioItems(), []);
  const attackTypesForDifficulty = useMemo(() => {
    const filteredByDifficulty =
      difficultyFilter === "All"
        ? allScenarios
        : allScenarios.filter((item) => item.difficulty === difficultyFilter);

    const uniqueTypes = Array.from(new Set(filteredByDifficulty.map((item) => item.attackType)));
    return ["All", ...uniqueTypes];
  }, [allScenarios, difficultyFilter]);

  const scenarios = useMemo(
    () =>
      prioritizeScenariosForUser(
        allScenarios.filter((item) => {
          const difficultyOk = difficultyFilter === "All" || item.difficulty === difficultyFilter;
          const attackTypeOk = attackTypeFilter === "All" || item.attackType === attackTypeFilter;
          return difficultyOk && attackTypeOk;
        }),
        user
      ),
    [allScenarios, difficultyFilter, attackTypeFilter, user]
  );
  const activeScenarios = examMode ? examQueue : scenarios;

  useEffect(() => {
    if (!attackTypesForDifficulty.includes(attackTypeFilter)) {
      setAttackTypeFilter("All");
    }
  }, [attackTypeFilter, attackTypesForDifficulty]);

  useEffect(() => {
    if (!pendingScenarioId) return;
    const targetIndex = activeScenarios.findIndex((scenario) => scenario.id === pendingScenarioId);
    if (targetIndex >= 0) {
      setCurrentIndex(targetIndex);
      setPendingScenarioId(null);
    }
  }, [pendingScenarioId, activeScenarios]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.settings, {
      ...readStorage(STORAGE_KEYS.settings, {}),
      difficultyFilter,
      attackTypeFilter,
    });
  }, [difficultyFilter, attackTypeFilter]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [difficultyFilter, attackTypeFilter]);

  useEffect(() => {
    if (!initialScenarioId || examMode) return;
    const nextScenario = allScenarios.find((scenario) => scenario.id === initialScenarioId);
    if (!nextScenario) return;
    setDifficultyFilter(nextScenario.difficulty);
    setAttackTypeFilter(nextScenario.attackType);
    setPendingScenarioId(nextScenario.id);
    setCurrentIndex(0);
    setView("mail");
  }, [allScenarios, examMode, initialScenarioId]);

  const item = activeScenarios[currentIndex] || null;

  const persistAttempt = async (attemptRecord) => {
    const storedAttempt = await saveAttempt(attemptRecord);
    writeStorage(STORAGE_KEYS.attempts, [...readStorage(STORAGE_KEYS.attempts, []), storedAttempt]);
    return storedAttempt;
  };

  useEffect(() => {
    if (!item) return;
    setView("mail");
    setLandingStep("password");
    setHoveredUrl("");
    setRevealSender(false);
    setOpenedFile(false);
    setClickedAt(null);
    setStartedAt(Date.now());
    setSaved(false);
    setResult(null);
    setForm({ email: item.persona.email, password: "", twoFactor: "", payment: "" });
  }, [item?.id]);

  const startExam = (nextExamType = "standard") => {
    const config = getExamTypeConfig(nextExamType);
    const queue = buildExamQueue(allScenarios, config.total, user, nextExamType);
    setExamType(config.id);
    setExamQueue(queue);
    setExamResults([]);
    setExamMode(true);
    setExamSessionId(`exam-${config.id}-${Date.now()}`);
    setCurrentIndex(0);
    setView("mail");
  };

  if (initialExamMode && !examMode) {
    return (
      <SiteChrome current="exam" user={user} onNavigate={onNavigate} onLogout={onLogout}>
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold text-white">Выберите вид тестирования</h1>
              <p className="mt-2 max-w-3xl text-slate-300">
                В системе доступно несколько режимов проверки: от короткого экспресс-теста до сложного экзамена и отдельных тестов по безопасным или фишинговым сценариям.
              </p>
            </div>
            <Button variant="outline" className="rounded-2xl border-white/20 bg-transparent text-white hover:bg-white/10" onClick={onBack}>
              Назад
            </Button>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {EXAM_TYPES.map((type) => (
              <Card key={type.id} className="group rounded-[30px] border border-slate-200 bg-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                <CardHeader className="p-6">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-xl">{type.title}</CardTitle>
                    <Badge variant="secondary" className="rounded-full px-3 py-1">{type.badge}</Badge>
                  </div>
                  <CardDescription className="leading-7">{type.description}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 p-6 pt-0">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-[20px] bg-slate-50 p-4">
                      <p className="text-xs text-slate-500">Количество</p>
                      <p className="mt-1 text-2xl font-bold text-slate-900">{type.total}</p>
                    </div>
                    <div className="rounded-[20px] bg-slate-50 p-4">
                      <p className="text-xs text-slate-500">Формат</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">Без подсказок</p>
                    </div>
                  </div>
                  <Button className="rounded-2xl" onClick={() => startExam(type.id)}>
                    Начать этот тест
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </SiteChrome>
    );
  }

  if (!item) {
    return (
      <SiteChrome current={initialExamMode ? "exam" : "simulator"} user={user} onNavigate={onNavigate} onLogout={onLogout}>
        <div className="mx-auto max-w-5xl">
          <Card className="rounded-[30px] border border-white/10 bg-slate-950 text-white shadow-2xl">
            <CardContent className="p-10 text-center">
              <p className="text-2xl font-semibold">Нет сценариев под выбранные фильтры</p>
              <p className="mt-3 text-slate-300">Сбросьте сложность или тип атаки, чтобы продолжить тренировку.</p>
              <div className="mt-6 flex justify-center gap-3">
                <Button onClick={() => { setDifficultyFilter("All"); setAttackTypeFilter("All"); }}>Сбросить фильтры</Button>
                <Button variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white/10" onClick={onBack}>Назад</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </SiteChrome>
    );
  }

  const finishAttempt = async (reportedStage = "") => {
    const nextResult = createAttemptResult({
      user,
      item,
      clicked: Boolean(clickedAt),
      passwordSubmitted: Boolean(form.password.trim()),
      twoFASubmitted: Boolean(form.twoFactor.trim()),
      paymentSubmitted: Boolean(form.payment.trim()),
      reportedStage,
      openedFile,
      startedAt,
      clickedAt,
      examMode,
      examSessionId,
    });
    if (examMode) {
      try {
        const storedAttempt = await persistAttempt(nextResult);
        setExamResults((prev) => [...prev, storedAttempt]);
        setSaved(true);
        onSaved();
        setResult(storedAttempt);
      } catch {
        setResult(nextResult);
      }
    } else {
      setSaved(false);
      setResult(nextResult);
    }
    setView("review");
  };

  const saveResult = async () => {
    if (!result || saved) return;
    try {
      const storedAttempt = await persistAttempt(result);
      if (examMode) setExamResults((prev) => [...prev, storedAttempt]);
      setResult(storedAttempt);
      setSaved(true);
      onSaved();
    } catch {
      setSaved(false);
    }
  };

  const goNextScenario = () => {
    if (examMode && currentIndex === activeScenarios.length - 1) {
      setView("examSummary");
      return;
    }

    if (!examMode && activeScenarios.length <= 1) {
      const currentGlobalIndex = allScenarios.findIndex((scenario) => scenario.id === item.id);
      const fallbackIndex = currentGlobalIndex === allScenarios.length - 1 ? 0 : currentGlobalIndex + 1;
      const fallbackScenario = allScenarios[fallbackIndex];

      if (fallbackScenario) {
        setDifficultyFilter(fallbackScenario.difficulty);
        setAttackTypeFilter(fallbackScenario.attackType);
        setPendingScenarioId(fallbackScenario.id);
      }
      return;
    }

    const nextIndex = currentIndex === activeScenarios.length - 1 ? 0 : currentIndex + 1;
    setCurrentIndex(nextIndex);
  };

  const progressValue = ((currentIndex + 1) / activeScenarios.length) * 100;
  const riskCues = buildRiskCueList(item);
  const difficultyBreakdown = buildScenarioDifficultyBreakdown(item);
  const examCorrect = examResults.filter((entry) => entry.correctDecision).length;
  const examPercent = examResults.length ? Math.round((examCorrect / examResults.length) * 100) : 0;
  const examLevel = examCorrect >= 8 ? "Высокий" : examCorrect >= 5 ? "Средний" : "Начальный";
  const examProtocol = buildExamProtocol(examResults);
  const examTypeConfig = getExamTypeConfig(examType);
  const isReviewView = view === "review";
  const liveInsights = !examMode
    ? buildLiveActionInsights(item, {
        clicked: Boolean(clickedAt),
        openedFile,
        form,
        step: landingStep,
      })
    : [];

  const stopExam = () => {
    setExamMode(false);
    setExamQueue([]);
    setExamResults([]);
    setExamSessionId(null);
    setExamType("standard");
    setCurrentIndex(0);
    setView("mail");
  };

  const exportCertificate = () => {
    exportHtmlReport({
      title: `Сертификат ${getSafeDisplayName(user)}`,
      fileName: `certificate-${user.id}-${examSessionId || "exam"}.html`,
      body: `
        <div class="hero light">
          <span class="badge gold">Сертификат после тестирования</span>
          <h1>Сертификат обучающего симулятора</h1>
          <p class="muted">Подтверждает прохождение итогового тестирования по распознаванию фишинговых атак и безопасному поведению пользователя.</p>
        </div>
        <div class="section">
          <div class="grid three">
            <div class="card"><div class="kicker">Пользователь</div><strong class="metric">${getSafeDisplayName(user)}</strong></div>
            <div class="card"><div class="kicker">Результат</div><strong class="metric">${examCorrect}/${examResults.length || activeScenarios.length}</strong></div>
            <div class="card"><div class="kicker">Процент</div><strong class="metric">${examPercent}%</strong></div>
          </div>
        </div>
        <div class="section">
          <h2>Итоги тестирования</h2>
          <div class="grid">
            <div class="card"><h3>Дата прохождения</h3><p>${formatDate(new Date().toISOString())}</p></div>
            <div class="card"><h3>Уровень подготовки</h3><p>${examLevel}</p></div>
            <div class="card"><h3>Статус</h3><p>${examPercent >= 80 ? "Тестирование успешно пройдено" : "Тестирование завершено, рекомендуется повторение"}</p></div>
            <div class="card"><h3>Режим</h3><p>${examTypeConfig.title}</p></div>
          </div>
        </div>
        <div class="footer">
          Документ сформирован автоматически в системе «Обучающий симулятор для противодействия фишинговым атакам среди пользователей».
          <div class="author">Дипломный проект: Кумаров Саят</div>
        </div>
      `,
    });
  };

  const generateAttack = (category) => {
    const categoryMap = {
      bank: ["Finance / Bonus", "Password Reset"],
      social: ["Telegram", "Instagram", "QR Phishing"],
      work: ["Microsoft 365", "CEO Fraud", "Password Reset"],
    };
    const pool = allScenarios.filter((scenario) => categoryMap[category].includes(scenario.attackType));
    const next = pool[Math.floor(Math.random() * pool.length)];
    if (!next) return;
    setExamMode(false);
    setDifficultyFilter(next.difficulty);
    setAttackTypeFilter(next.attackType);
    setPendingScenarioId(next.id);
    setCurrentIndex(0);
    setView("mail");
  };

  return (
    <SiteChrome current={examMode ? "exam" : "simulator"} user={user} onNavigate={onNavigate} onLogout={onLogout}>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-white">Эмулятор почтовой среды</h1>
            <p className="mt-1 text-slate-300">
              Пользователь: {getSafeDisplayName(user)} • {examMode ? examTypeConfig.title : "Сценарий"} {currentIndex + 1} из {activeScenarios.length}
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Button variant="outline" className="rounded-2xl border-white/20 bg-transparent text-white hover:bg-white/10" onClick={() => setMobileMode((prev) => !prev)}>
              <Smartphone className="mr-2 h-4 w-4" />{mobileMode ? "Обычный режим" : "Открыть как телефон"}
            </Button>
            {!examMode ? (
              <Button variant="outline" className="rounded-2xl border-white/20 bg-transparent text-white hover:bg-white/10" onClick={startExam}>
                <Trophy className="mr-2 h-4 w-4" />Пройти тестирование
              </Button>
            ) : (
              <Button variant="outline" className="rounded-2xl border-white/20 bg-transparent text-white hover:bg-white/10" onClick={stopExam}>
                Выйти из тестирования
              </Button>
            )}
            <Button variant="outline" className="rounded-2xl border-white/20 bg-transparent text-white hover:bg-white/10" onClick={onBack}>Назад</Button>
          </div>
        </div>

        <Card className="rounded-[30px] border border-white/10 bg-slate-950 text-white shadow-2xl">
          <CardContent className="space-y-5 p-6">
            <div className={`grid gap-4 ${examMode ? "lg:grid-cols-1" : "lg:grid-cols-[1.1fr_0.9fr]"}`}>
              <div>
                <p className="text-sm text-slate-300">Прогресс сценариев</p>
                <div className="mt-3">
                  <Progress value={progressValue} />
                </div>
              </div>
              {!examMode ? (
                <div className="flex gap-3 flex-wrap lg:justify-end">
                  <Button variant="outline" className="rounded-2xl border-white/20 bg-transparent text-white hover:bg-white/10" onClick={() => generateAttack("bank")}><Sparkles className="mr-2 h-4 w-4" />Банк</Button>
                  <Button variant="outline" className="rounded-2xl border-white/20 bg-transparent text-white hover:bg-white/10" onClick={() => generateAttack("social")}><Sparkles className="mr-2 h-4 w-4" />Соцсети</Button>
                  <Button variant="outline" className="rounded-2xl border-white/20 bg-transparent text-white hover:bg-white/10" onClick={() => generateAttack("work")}><Sparkles className="mr-2 h-4 w-4" />Работа</Button>
                  <Button variant="outline" className="rounded-2xl border-white/20 bg-transparent text-white hover:bg-white/10" onClick={() => setCurrentIndex((prev) => (prev === 0 ? activeScenarios.length - 1 : prev - 1))}><ChevronLeft className="mr-2 h-4 w-4" />Назад</Button>
                  <Button variant="outline" className="rounded-2xl border-white/20 bg-transparent text-white hover:bg-white/10" onClick={() => setCurrentIndex((prev) => (prev === activeScenarios.length - 1 ? 0 : prev + 1))}>Далее<ChevronRight className="ml-2 h-4 w-4" /></Button>
                </div>
              ) : null}
            </div>

            {!examMode ? <div className="space-y-3">
              <p className="text-sm uppercase tracking-[0.16em] text-slate-400">Сложность</p>
              <div className="flex gap-2 flex-wrap">
                {scenarioDifficulties.map((value) => (
                  <FilterPill key={value} active={difficultyFilter === value} onClick={() => setDifficultyFilter(value)}>{getDifficultyLabel(value)}</FilterPill>
                ))}
              </div>
            </div> : null}

            {!examMode ? <div className="space-y-3">
              <p className="text-sm uppercase tracking-[0.16em] text-slate-400">Тип атаки</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {attackTypesForDifficulty.map((value) => (
                  <FilterPill key={value} active={attackTypeFilter === value} onClick={() => setAttackTypeFilter(value)}>{getAttackTypeLabel(value)}</FilterPill>
                ))}
              </div>
            </div> : null}
          </CardContent>
        </Card>

        {view === "examSummary" ? (
          <Card className="rounded-[30px] border border-slate-200 bg-white shadow-xl">
            <CardHeader className="p-6">
              <CardTitle className="text-2xl">Результат тестирования</CardTitle>
              <CardDescription>{examTypeConfig.title} завершено без подсказок</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 p-6 pt-0">
              <div className="rounded-[30px] border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-amber-100 p-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <Badge className="rounded-full bg-slate-950 px-3 py-1 text-white hover:bg-slate-950">Сертификат после тестирования</Badge>
                    <h3 className="mt-4 text-3xl font-bold text-slate-900">{getSafeDisplayName(user)}</h3>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      Итоговая карточка фиксирует результат, уровень, процент правильных ответов и дату прохождения.
                    </p>
                  </div>
                  <div className="rounded-[24px] bg-slate-950 px-5 py-4 text-white">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-300">Процент</p>
                    <p className="mt-2 text-4xl font-bold">{examPercent}%</p>
                  </div>
                </div>
                <div className="mt-6 grid gap-4 md:grid-cols-4">
                  <div className="rounded-[22px] bg-white p-5"><p className="text-sm text-slate-500">Дата</p><p className="mt-2 font-semibold text-slate-900">{formatDate(new Date().toISOString())}</p></div>
                  <div className="rounded-[22px] bg-white p-5"><p className="text-sm text-slate-500">Результат</p><p className="mt-2 text-3xl font-bold text-slate-900">{examCorrect}/{examResults.length || activeScenarios.length}</p></div>
                  <div className="rounded-[22px] bg-white p-5"><p className="text-sm text-slate-500">Уровень</p><p className="mt-2 text-3xl font-bold text-slate-900">{examLevel}</p></div>
                  <div className="rounded-[22px] bg-white p-5"><p className="text-sm text-slate-500">Статус</p><p className="mt-2 font-semibold text-slate-900">{examPercent >= 80 ? "Тестирование успешно пройдено" : "Нужно повторение"}</p></div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-[24px] bg-slate-50 p-5"><p className="text-sm text-slate-500">Ваш результат</p><p className="mt-2 text-4xl font-bold">{examCorrect}/{examResults.length || activeScenarios.length}</p></div>
                <div className="rounded-[24px] bg-slate-50 p-5"><p className="text-sm text-slate-500">Уровень</p><p className="mt-2 text-4xl font-bold">{examLevel}</p></div>
                <div className="rounded-[24px] bg-slate-50 p-5"><p className="text-sm text-slate-500">Режим</p><p className="mt-2 text-2xl font-bold">{examTypeConfig.badge}</p></div>
              </div>

              <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">Итоговый протокол</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-[20px] bg-white p-4">
                      <p className="text-xs text-slate-500">Фишинговых кейсов</p>
                      <p className="mt-1 text-2xl font-bold text-slate-900">{examProtocol.phishingTotal}</p>
                    </div>
                    <div className="rounded-[20px] bg-white p-4">
                      <p className="text-xs text-slate-500">Безопасных кейсов</p>
                      <p className="mt-1 text-2xl font-bold text-slate-900">{examProtocol.safeTotal}</p>
                    </div>
                    <div className="rounded-[20px] bg-white p-4">
                      <p className="text-xs text-slate-500">Распознано атак</p>
                      <p className="mt-1 text-2xl font-bold text-slate-900">{examProtocol.phishingDetected}</p>
                    </div>
                    <div className="rounded-[20px] bg-white p-4">
                      <p className="text-xs text-slate-500">Корректно пройдено safe-flow</p>
                      <p className="mt-1 text-2xl font-bold text-slate-900">{examProtocol.safeCorrect}</p>
                    </div>
                  </div>
                  <div className="mt-4 rounded-[20px] border border-sky-200 bg-sky-50 p-4">
                    <p className="text-sm font-semibold text-sky-900">Персонализация тестирования</p>
                    <p className="mt-2 text-sm leading-7 text-slate-700">
                      {getUserDepartment(user)
                        ? `В итоговый набор приоритетно попали сценарии для роли «${getRoleLabel(getUserDepartment(user))}», чтобы тестирование было ближе к реальной рабочей нагрузке.`
                        : "Набор сформирован из смешанных безопасных и фишинговых сценариев без подсказок."}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                    <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">Результаты по типам атак</p>
                    <div className="mt-4 grid gap-3">
                      {examProtocol.byAttackType.length ? examProtocol.byAttackType.map((entry) => (
                        <div key={entry.attackType} className="rounded-[20px] bg-white p-4">
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <p className="font-semibold text-slate-900">{getAttackTypeLabel(entry.attackType)}</p>
                            <Badge variant={entry.failed > 0 ? "secondary" : "default"} className="rounded-full px-3 py-1">
                              Верно {entry.correct}/{entry.total}
                            </Badge>
                          </div>
                          <p className="mt-2 text-sm text-slate-500">Ошибок: {entry.failed}</p>
                        </div>
                      )) : (
                        <div className="rounded-[20px] bg-white p-4 text-sm text-slate-500">Нет данных для детализации.</div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-5">
                    <p className="text-sm font-semibold uppercase tracking-[0.14em] text-amber-700">Что повторить после тестирования</p>
                    <div className="mt-4 grid gap-3">
                      {examProtocol.topMistakes.length ? examProtocol.topMistakes.map((entry) => (
                        <div key={entry.id} className="rounded-[20px] bg-white p-4">
                          <p className="font-semibold text-slate-900">{entry.title}</p>
                          <p className="mt-2 text-sm text-slate-600">{entry.actionSummary}</p>
                          <p className="mt-2 text-xs text-slate-500">{getAttackTypeLabel(entry.attackType)} • Риск {entry.riskScore}</p>
                        </div>
                      )) : (
                        <div className="rounded-[20px] bg-white p-4 text-sm text-slate-600">
                          Критичных ошибок не выявлено. Можно повторить сложные сценарии только для закрепления навыка.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 flex-wrap">
                <Button variant="outline" className="rounded-2xl" onClick={exportCertificate}>Экспорт сертификата</Button>
                <Button className="rounded-2xl" onClick={() => startExam(examType)}>Пройти этот вид снова</Button>
                <Button variant="outline" className="rounded-2xl" onClick={stopExam}>Вернуться к обучению</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
        <div className={isReviewView ? "grid gap-6" : `grid gap-6 ${mobileMode ? "mx-auto max-w-md" : examMode ? "mx-auto max-w-5xl" : "xl:grid-cols-[1.2fr_0.8fr]"}`}>
          <div className="space-y-6">
            {view === "mail" ? (
              <MailSurface
                item={item}
                hoverUrl={hoveredUrl}
                onHoverUrl={setHoveredUrl}
                onRevealSender={() => setRevealSender((prev) => !prev)}
                revealSender={revealSender}
                onOpenLanding={() => {
                  if (!clickedAt) setClickedAt(Date.now());
                  setView("landing");
                }}
                onOpenFile={() => setOpenedFile(true)}
                onReport={() => finishAttempt("mail")}
              />
            ) : null}

            {view === "landing" ? (
              <LandingSurface
                item={item}
                form={form}
                setForm={setForm}
                step={landingStep}
                onBack={() => setView("mail")}
                onSafeNext={() => setLandingStep("2fa")}
                onReport={() => finishAttempt("landing")}
                onSubmit={() => finishAttempt("")}
              />
            ) : null}

            {view === "review" && result ? (
              <LearningReview item={{ ...item, scenarioType: item.isSafeFlow ? "safe" : "phishing" }} result={result} onSave={saveResult} onNext={goNextScenario} saved={saved} autoSaved={examMode} />
            ) : null}

            {view !== "review" && !examMode ? (
              <>
                <Card className="rounded-[30px] border border-slate-200 bg-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                  <CardHeader className="p-6">
                    <CardTitle className="text-xl">Как разбирать этот сценарий</CardTitle>
                    <CardDescription>Короткая памятка, чтобы левая часть экрана тоже работала как учебный модуль.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3 p-6 pt-0">
                    {[
                      `Сначала проверьте sender и сравните ${item.displayEmail} с реальным адресом отправителя.`,
                      `Потом посмотрите, совпадает ли домен ${new URL(item.landingUrl).host} с официальным ${new URL(item.officialUrl).host}.`,
                      item.isSafeFlow
                        ? "Обратите внимание, что безопасный вход обычно идет по шагам: пароль, затем отдельный экран 2FA."
                        : "Если страница просит пароль и 2FA сразу, это сильный сигнал риска.",
                      item.attachment
                        ? `Отдельно оцените вложение ${item.attachment.name} и его расширение перед открытием.`
                        : "Если вложения нет, основной фокус должен быть на sender, ссылке и запросе данных.",
                    ].map((tip, index) => (
                      <div key={tip} className="flex items-start gap-4 rounded-[22px] border border-slate-200 bg-slate-50 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-sm">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white">
                          {index + 1}
                        </div>
                        <p className="text-sm leading-7 text-slate-700">{tip}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="rounded-[30px] border border-slate-200 bg-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                  <CardHeader className="p-6">
                    <CardTitle className="text-xl">Что будет хорошим решением</CardTitle>
                    <CardDescription>Ниже показано, какое поведение считается правильным именно для этого кейса.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 p-6 pt-0 md:grid-cols-2">
                    <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-5">
                      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">Правильное действие</p>
                      <p className="mt-3 text-sm leading-8 text-slate-700">
                        {item.isSafeFlow
                          ? "Проверить домен, увидеть нормальный пошаговый вход и завершить сценарий без ложного сообщения о фишинге."
                          : "Не вводить данные, не открывать сомнительное вложение и сообщить о фишинге сразу после проверки sender и URL."}
                      </p>
                    </div>
                    <div className="rounded-[24px] border border-rose-200 bg-rose-50 p-5">
                      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-rose-700">Ошибка в этом кейсе</p>
                      <p className="mt-3 text-sm leading-8 text-slate-700">
                        {item.isSafeFlow
                          ? "Принять легитимный сценарий за атаку только по одному признаку и не дочитать flow до конца."
                          : "Перейти по ссылке без проверки и особенно отправить пароль, код 2FA или платежные данные."}
                      </p>
                    </div>
                    <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5 md:col-span-2">
                      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Фокус пользователя</p>
                      <p className="mt-3 text-sm leading-8 text-slate-700">
                        В этом сценарии самые важные признаки: <strong>{buildRiskCueList(item).slice(0, 2).join(" и ") || "sender, домен и структура формы"}</strong>.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : null}
          </div>

          {!isReviewView && !examMode ? <div className="space-y-6">
            {examMode ? (
              <>
                <Card className="rounded-[30px] border border-slate-200 bg-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                  <CardHeader className="p-6">
                    <CardTitle className="text-xl">Тестирование: прогресс</CardTitle>
                    <CardDescription>Без подсказок и с оценкой результата по всей серии кейсов.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3 p-6 pt-0">
                    <div className="rounded-[22px] bg-slate-50 p-4">
                      <p className="text-xs text-slate-500">Текущий вопрос</p>
                      <p className="mt-1 text-2xl font-bold text-slate-900">{currentIndex + 1} / {activeScenarios.length}</p>
                    </div>
                    <div className="rounded-[22px] bg-slate-50 p-4">
                      <p className="text-xs text-slate-500">Правильных решений</p>
                      <p className="mt-1 text-2xl font-bold text-slate-900">{examCorrect}</p>
                    </div>
                    <div className="rounded-[22px] bg-slate-50 p-4">
                      <p className="text-xs text-slate-500">Текущий уровень</p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">{examCorrect >= 8 ? "Высокий" : examCorrect >= 5 ? "Средний" : "Начальный"}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-[30px] border border-slate-200 bg-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                  <CardHeader className="p-6">
                    <CardTitle className="text-xl">Фокус по текущему кейсу</CardTitle>
                    <CardDescription>На что смотреть в этом письме до любого клика или ввода данных.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3 p-6 pt-0">
                    {riskCues.map((cue) => (
                      <div key={cue} className="rounded-[22px] border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-sm">
                        {cue}
                      </div>
                    ))}
                    <div className="rounded-[22px] border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-slate-700">
                      В тестировании нет предварительных подсказок на самом лендинге, поэтому решение нужно принимать по sender, домену, URL и структуре формы.
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-[30px] border border-slate-200 bg-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                  <CardHeader className="p-6">
                    <CardTitle className="text-xl">Сценарий тестирования</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 p-6 pt-0 text-sm text-slate-700">
                    <div className="rounded-[22px] bg-slate-50 p-4">Тип атаки: {getAttackTypeLabel(item.attackType)}</div>
                    <div className="rounded-[22px] bg-slate-50 p-4">Сложность: {getDifficultyLabel(item.difficulty)}</div>
                    <div className="rounded-[22px] bg-slate-50 p-4">Роль: {getRoleLabel(item.persona?.department)}</div>
                    <div className="rounded-[22px] bg-slate-50 p-4">Домен лендинга: {new URL(item.landingUrl).host}</div>
                    <div className="rounded-[22px] bg-slate-50 p-4">Официальный домен: {new URL(item.officialUrl).host}</div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <>
                <Card className="rounded-[30px] border border-slate-200 bg-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                  <CardHeader className="p-6">
                    <CardTitle className="text-xl">Что происходит сейчас</CardTitle>
                    <CardDescription>Динамическое объяснение действий пользователя по ходу сценария.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3 p-6 pt-0">
                    {liveInsights.length === 0 ? (
                      <div className="rounded-[22px] border border-dashed border-slate-300 bg-slate-50 p-4 text-sm leading-7 text-slate-500">
                        Пока действий нет. Проверьте sender, домен и логику формы до любого клика и ввода данных.
                      </div>
                    ) : (
                      liveInsights.map((entry) => (
                        <motion.div
                          key={entry.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                          className={`rounded-[22px] border p-4 text-sm leading-7 ${
                            entry.tone === "danger"
                              ? "border-rose-200 bg-rose-50 text-rose-950"
                              : entry.tone === "risk"
                                ? "border-amber-200 bg-amber-50 text-amber-950"
                                : entry.tone === "safe"
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                                  : "border-slate-200 bg-slate-50 text-slate-700"
                          }`}
                        >
                          <p className="font-semibold">{entry.title}</p>
                          <p className="mt-2">{entry.text}</p>
                        </motion.div>
                      ))
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-[30px] border border-slate-200 bg-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                  <CardHeader className="p-6">
                    <CardTitle className="text-xl">Признаки риска</CardTitle>
                    <CardDescription>Карточка поясняет, на что должен обратить внимание пользователь</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3 p-6 pt-0">
                    {riskCues.map((cue) => (
                      <div key={cue} className="rounded-[22px] border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-sm">{cue}</div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="rounded-[30px] border border-slate-200 bg-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                  <CardHeader className="p-6">
                    <CardTitle className="text-xl">Сценарий</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 p-6 pt-0 text-sm text-slate-700">
                    <div className="rounded-[22px] bg-slate-50 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-sm">Тип атаки: {getAttackTypeLabel(item.attackType)}</div>
                    <div className="rounded-[22px] bg-slate-50 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-sm">Сложность: {getDifficultyLabel(item.difficulty)}</div>
                    <div className="rounded-[22px] bg-slate-50 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-sm">Роль: {getRoleLabel(item.persona?.department)}</div>
                    <div className="rounded-[22px] bg-slate-50 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-sm">Подозрительный домен: {new URL(item.landingUrl).host}</div>
                    <div className="rounded-[22px] bg-slate-50 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-sm">Официальный домен: {new URL(item.officialUrl).host}</div>
                  </CardContent>
                </Card>

                <Card className="rounded-[30px] border border-slate-200 bg-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                  <CardHeader className="p-6">
                    <CardTitle className="text-xl">Уровни сложности по параметрам</CardTitle>
                    <CardDescription>Каждый признак сценария отдельно оценивается как легкий, средний или сложный</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3 p-6 pt-0">
                    {difficultyBreakdown.map((entry) => (
                      <div key={entry.label} className="rounded-[22px] border border-slate-200 bg-slate-50 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-sm">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <p className="font-semibold text-slate-900">{entry.label}</p>
                          <div className={`rounded-full border px-3 py-1 text-xs font-semibold ${getDifficultyTone(entry.value)}`}>
                            {getDifficultyLabel(entry.value)}
                          </div>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{entry.hint}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </>
            )}
          </div> : null}
        </div>
        )}
      </div>
    </SiteChrome>
  );
}

function Dashboard({ user, attempts, onOpenProfile, onOpenTheory, onOpenSimulator, onOpenExam, onOpenHistory, onOpenUrlCheck, onOpenMistakes, onOpenComparison, onOpenAdmin, onLogout, onNavigate }) {
  const metrics = buildRiskMetrics(attempts);
  const attackStats = buildAttackTypeStats(attempts);
  const progressData = buildProgressSeries(attempts);
  const outcomeData = buildOutcomeBreakdown(attempts);
  const scenarios = useMemo(() => buildScenarioItems(), []);
  const roleStats = buildRoleCoverageStats(scenarios, attempts);
  const timeStats = buildTimeProgressStats(attempts);
  const learningPlan = buildPersonalLearningPlan(attempts, scenarios);
  const beforeAfter = buildBeforeAfterComparison(attempts);
  const displayName = getSafeDisplayName(user);
  const behaviorProfile = buildBehaviorProfile(attempts);
  const gamification = buildGamificationStats(attempts);
  const userRoleScenarios = useMemo(
    () => scenarios.filter((item) => item.persona?.department === getUserDepartment(user)).slice(0, 4),
    [scenarios, user]
  );
  const userRoleAttempts = useMemo(
    () => attempts.filter((item) => item.personaDepartment === getUserDepartment(user)),
    [attempts, user]
  );
  const exportReport = () => {
    exportHtmlReport({
      title: `Отчет пользователя ${displayName}`,
      fileName: `phishing-report-${user.id}.html`,
      body: `
        <div class="hero">
          <span class="badge">Персональный отчет</span>
          <h1>Отчет по пользователю ${displayName}</h1>
          <p class="muted">Дата формирования: ${formatDate(new Date().toISOString())}</p>
        </div>
        <div class="section">
          <h2>Ключевые показатели</h2>
          <div class="grid">
            <div class="card">
              <div class="kicker">Риск-профиль</div>
              <strong class="metric">${metrics.riskScore}</strong>
              <p class="muted">${metrics.riskStatus.label}</p>
            </div>
            <div class="card">
              <div class="kicker">Поведенческий профиль</div>
              <strong class="metric">${behaviorProfile.label}</strong>
              <p class="muted">${behaviorProfile.description}</p>
            </div>
            <div class="card">
              <div class="kicker">Завершено сценариев</div>
              <strong class="metric">${metrics.totalScenariosCompleted}</strong>
              <p class="muted">Все завершенные попытки пользователя</p>
            </div>
            <div class="card">
              <div class="kicker">Доля отчетов о риске</div>
              <strong class="metric">${metrics.reportRate}%</strong>
              <p class="muted">Сколько раз пользователь корректно сообщил о риске</p>
            </div>
          </div>
        </div>
        <div class="section">
          <h2>Рабочая сводка</h2>
          <div class="grid">
            <div class="card"><h3>Доля кликов</h3><p>${metrics.clickRate}%</p></div>
            <div class="card"><h3>Отправка пароля</h3><p>${metrics.credentialSubmissionRate}%</p></div>
            <div class="card"><h3>Отправка 2FA</h3><p>${metrics.twoFASubmissionRate}%</p></div>
            <div class="card"><h3>Среднее время распознавания</h3><p>${metrics.avgTimeToDetect}s</p></div>
          </div>
        </div>
        <div class="section">
          <h2>Прогресс до и после обучения</h2>
          <div class="grid">
            <div class="card"><h3>Первые попытки</h3><p>Риск: ${beforeAfter.before.avgRisk} • Точность: ${beforeAfter.before.correctRate}%</p></div>
            <div class="card"><h3>Последние попытки</h3><p>Риск: ${beforeAfter.after.avgRisk} • Точность: ${beforeAfter.after.correctRate}%</p></div>
            <div class="card"><h3>Изменение риска</h3><p>${beforeAfter.deltas.risk <= 0 ? beforeAfter.deltas.risk : `+${beforeAfter.deltas.risk}`}</p></div>
            <div class="card"><h3>Изменение точности</h3><p>${beforeAfter.deltas.correctRate >= 0 ? `+${beforeAfter.deltas.correctRate}` : beforeAfter.deltas.correctRate}%</p></div>
          </div>
        </div>
        <div class="section">
          <h2>Персональный план обучения</h2>
          <div class="list">
            ${learningPlan.modules
              .map(
                (item, index) => `
                  <div class="list-item">
                    <div class="kicker">Шаг ${index + 1}</div>
                    <h3>${item.title}</h3>
                    <p>${item.detail}</p>
                  </div>
                `
              )
              .join("")}
          </div>
        </div>
        <div class="section">
          <h2>Рекомендуемые сценарии для повтора</h2>
          <div class="list">
            ${learningPlan.recommendedScenarios
              .map(
                (item) => `
                  <div class="list-item">
                    <h3>${item.title}</h3>
                    <p class="muted">${getRoleLabel(item.persona?.department)} • ${getAttackTypeLabel(item.attackType)} • ${getDifficultyLabel(item.difficulty)}</p>
                    <p style="margin-top:8px">${item.subject}</p>
                  </div>
                `
              )
              .join("")}
          </div>
        </div>
        <div class="footer">
          Документ сформирован автоматически в системе «Обучающий симулятор для противодействия фишинговым атакам среди пользователей».
          <div class="author">Дипломный проект: Кумаров Саят</div>
        </div>
      `,
    });
  };

  return (
    <SiteChrome current="dashboard" user={user} onNavigate={onNavigate} onLogout={onLogout}>
      <div className="space-y-6">
        <Card className="rounded-[36px] border border-white/10 bg-slate-950 text-white shadow-2xl">
          <CardContent className="grid gap-6 p-8 md:grid-cols-[1.2fr_0.8fr]">
            <div>
              <Badge className="rounded-full bg-white/10 px-3 py-1 text-white hover:bg-white/10">Личный кабинет</Badge>
              <h1 className="mt-4 text-4xl font-bold">Здравствуйте, {displayName}</h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
                Тренажер показывает полную цепочку атаки: письмо, скрытый URL, realistic vs phishing login flow, 2FA-логику и последствия ошибок пользователя.
              </p>
              <div className="mt-7 flex gap-3 flex-wrap">
                <Button className="rounded-2xl bg-amber-300 px-5 text-slate-950 hover:bg-amber-200" onClick={onOpenSimulator}><Mail className="mr-2 h-4 w-4" />Запустить симулятор</Button>
                <Button variant="outline" className="rounded-2xl border-white/20 bg-transparent px-5 text-white hover:bg-white/10" onClick={onOpenProfile}><UserRound className="mr-2 h-4 w-4" />Профиль</Button>
                <Button variant="outline" className="rounded-2xl border-white/20 bg-transparent px-5 text-white hover:bg-white/10" onClick={onOpenExam}><Trophy className="mr-2 h-4 w-4" />Пройти тестирование</Button>
                <Button variant="outline" className="rounded-2xl border-white/20 bg-transparent px-5 text-white hover:bg-white/10" onClick={onOpenTheory}><BookOpen className="mr-2 h-4 w-4" />Теория</Button>
                <Button variant="outline" className="rounded-2xl border-white/20 bg-transparent px-5 text-white hover:bg-white/10" onClick={onOpenHistory}>История</Button>
                <Button variant="outline" className="rounded-2xl border-white/20 bg-transparent px-5 text-white hover:bg-white/10" onClick={onOpenUrlCheck}>Проверить ссылку</Button>
                <Button variant="outline" className="rounded-2xl border-white/20 bg-transparent px-5 text-white hover:bg-white/10" onClick={onOpenMistakes}>Работа над ошибками</Button>
                <Button variant="outline" className="rounded-2xl border-white/20 bg-transparent px-5 text-white hover:bg-white/10" onClick={onOpenComparison}><SearchCheck className="mr-2 h-4 w-4" />Сравнение</Button>
                <Button variant="outline" className="rounded-2xl border-white/20 bg-transparent px-5 text-white hover:bg-white/10" onClick={exportReport}>Экспорт отчета</Button>
                {user.role === "admin" ? (
                  <Button variant="outline" className="rounded-2xl border-white/20 bg-transparent px-5 text-white hover:bg-white/10" onClick={onOpenAdmin}><LayoutDashboard className="mr-2 h-4 w-4" />Админ-панель</Button>
                ) : null}
              </div>
            </div>
            <div className="grid gap-3">
              <MetricCard title="Завершено сценариев" value={metrics.totalScenariosCompleted} hint="Все завершенные попытки" dark />
              <MetricCard title="Доля переходов" value={`${metrics.clickRate}%`} hint="Сценарии с кликом по ссылке" dark />
              <MetricCard title="Риск-профиль" value={`${metrics.riskScore}`} hint={metrics.riskStatus.label} dark />
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Отправка пароля" value={`${metrics.credentialSubmissionRate}%`} hint="Доля сценариев с отправкой пароля" />
          <MetricCard title="Отправка 2FA" value={`${metrics.twoFASubmissionRate}%`} hint="Доля сценариев с отправкой кода 2FA" />
          <MetricCard title="Доля сообщений о риске" value={`${metrics.reportRate}%`} hint="Сколько раз пользователь сообщил о риске" />
          <MetricCard title="Среднее время до распознавания" value={`${metrics.avgTimeToDetect}s`} hint="Среднее время до обнаружения риска" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="rounded-[30px] border border-slate-200 bg-white shadow-lg">
            <CardHeader className="p-6">
              <CardTitle className="text-2xl">Поведенческий профиль пользователя</CardTitle>
              <CardDescription>Классификация по уровню киберустойчивости на основе кликов, ввода данных и распознавания атак.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 p-6 pt-0 md:grid-cols-3">
              {[
                ["Осторожный", "Редко кликает, замечает сигналы риска и сообщает о фишинге."],
                ["Невнимательный", "Иногда переходит по ссылкам и не всегда замечает признаки атаки."],
                ["Уязвимый", "Часто кликает и отправляет чувствительные данные."],
              ].map(([label, text]) => (
                <div key={label} className={`rounded-[24px] border p-5 ${behaviorProfile.label === label ? "border-slate-900 bg-slate-950 text-white" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
                  <p className="font-semibold">{label}</p>
                  <p className={`mt-2 text-sm leading-7 ${behaviorProfile.label === label ? "text-slate-300" : "text-slate-600"}`}>{text}</p>
                </div>
              ))}
              <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-5 md:col-span-3">
                <p className="text-sm font-semibold uppercase tracking-[0.15em] text-amber-700">Ваш профиль</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{behaviorProfile.description}</p>
                <p className="mt-3 text-sm leading-7 text-slate-700">{behaviorProfile.recommendation}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[30px] border border-slate-200 bg-white shadow-lg">
            <CardHeader className="p-6">
              <CardTitle className="text-2xl">Геймификация</CardTitle>
              <CardDescription>Баллы и серия правильных решений помогают отслеживать прогресс в тренировке.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 p-6 pt-0">
              <div className="rounded-[24px] bg-slate-950 p-5 text-white">
                <p className="text-sm text-slate-300">Баллы</p>
                <p className="mt-2 text-4xl font-bold">{gamification.score}</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-[24px] bg-slate-50 p-5">
                  <p className="text-sm text-slate-500">Серия</p>
                  <p className="mt-2 flex items-center gap-2 text-3xl font-bold text-slate-900"><Flame className="h-6 w-6 text-amber-500" />{gamification.streak}</p>
                </div>
                <div className="rounded-[24px] bg-slate-50 p-5">
                  <p className="text-sm text-slate-500">Уровень</p>
                  <p className="mt-2 flex items-center gap-2 text-3xl font-bold text-slate-900"><Trophy className="h-6 w-6 text-sky-600" />{gamification.level}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <ChartsPanel progressData={progressData} attackTypeData={attackStats} outcomeData={outcomeData} />

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <Card className="rounded-[30px] border border-slate-200 bg-white shadow-lg">
            <CardHeader className="p-6">
              <CardTitle className="text-2xl">Сравнение до и после обучения</CardTitle>
              <CardDescription>Наглядно показывает, стал ли пользователь внимательнее по мере прохождения сценариев.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 p-6 pt-0 md:grid-cols-2">
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">Первые попытки</p>
                <div className="mt-4 grid gap-3">
                  <div className="rounded-[20px] bg-white p-4"><p className="text-xs text-slate-500">Количество</p><p className="mt-1 text-2xl font-bold text-slate-900">{beforeAfter.before.attempts}</p></div>
                  <div className="rounded-[20px] bg-white p-4"><p className="text-xs text-slate-500">Средний риск</p><p className="mt-1 text-2xl font-bold text-slate-900">{beforeAfter.before.avgRisk}</p></div>
                  <div className="rounded-[20px] bg-white p-4"><p className="text-xs text-slate-500">Точность решений</p><p className="mt-1 text-2xl font-bold text-slate-900">{beforeAfter.before.correctRate}%</p></div>
                </div>
              </div>
              <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">Последние попытки</p>
                <div className="mt-4 grid gap-3">
                  <div className="rounded-[20px] bg-white p-4"><p className="text-xs text-slate-500">Количество</p><p className="mt-1 text-2xl font-bold text-slate-900">{beforeAfter.after.attempts}</p></div>
                  <div className="rounded-[20px] bg-white p-4"><p className="text-xs text-slate-500">Средний риск</p><p className="mt-1 text-2xl font-bold text-slate-900">{beforeAfter.after.avgRisk}</p></div>
                  <div className="rounded-[20px] bg-white p-4"><p className="text-xs text-slate-500">Точность решений</p><p className="mt-1 text-2xl font-bold text-slate-900">{beforeAfter.after.correctRate}%</p></div>
                </div>
              </div>
              <div className="rounded-[24px] border border-sky-200 bg-sky-50 p-5 md:col-span-2">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.14em] text-sky-700">Итог динамики</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">
                      {beforeAfter.available
                        ? beforeAfter.deltas.risk < 0
                          ? "Риск снижается, а пользователь становится устойчивее."
                          : beforeAfter.deltas.correctRate > 0
                            ? "Точность решений растет, даже если риск еще неустойчив."
                            : "Динамика пока нестабильна. Стоит продолжить обучение и повторить сложные кейсы."
                        : "Пока слишком мало попыток для полноценного сравнения. После нескольких прохождений здесь появится реальная динамика."}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant={beforeAfter.deltas.risk <= 0 ? "default" : "secondary"} className="rounded-full px-3 py-1">
                      Риск {beforeAfter.deltas.risk <= 0 ? beforeAfter.deltas.risk : `+${beforeAfter.deltas.risk}`}
                    </Badge>
                    <Badge variant={beforeAfter.deltas.correctRate >= 0 ? "default" : "secondary"} className="rounded-full px-3 py-1">
                      Точность {beforeAfter.deltas.correctRate >= 0 ? `+${beforeAfter.deltas.correctRate}` : beforeAfter.deltas.correctRate}%
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[30px] border border-slate-200 bg-white shadow-lg">
            <CardHeader className="p-6">
              <CardTitle className="text-2xl">Прогресс пользователя по времени</CardTitle>
              <CardDescription>Показывает, как меняется средний риск и точность решений по последним дням.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 p-6 pt-0">
              {timeStats.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-slate-300 p-8 text-center text-slate-500">
                  Пока нет завершенных попыток. После первых сценариев здесь появится временная динамика.
                </div>
              ) : (
                timeStats.map((item) => (
                  <div key={item.date} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="font-semibold text-slate-900">{item.date}</p>
                        <p className="mt-1 text-sm text-slate-500">Попыток: {item.attempts}</p>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant={item.avgRisk >= 70 ? "destructive" : item.avgRisk >= 40 ? "secondary" : "default"} className="rounded-full px-3 py-1">
                          Риск {item.avgRisk}
                        </Badge>
                        <Badge variant="outline" className="rounded-full px-3 py-1">
                          Точность {item.correctRate}%
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[30px] border border-slate-200 bg-white shadow-lg">
            <CardHeader className="p-6">
              <CardTitle className="text-2xl">Сценарии по ролям</CardTitle>
              <CardDescription>Показывает адаптацию тренажера под бухгалтерию, HR, IT, руководство и другие роли.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 p-6 pt-0">
              {roleStats.map((item) => (
                <div key={item.role} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-semibold text-slate-900">{item.roleLabel}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        Сценариев: {item.totalScenarios} • Фишинговых: {item.phishingScenarios} • Безопасных: {item.safeScenarios}
                      </p>
                    </div>
                    <Badge variant={item.avgRisk >= 70 ? "destructive" : item.avgRisk >= 40 ? "secondary" : "default"} className="rounded-full px-3 py-1">
                      Средний риск {item.avgRisk}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-[30px] border border-slate-200 bg-white shadow-lg">
            <CardHeader className="p-6">
              <CardTitle className="text-2xl">Персонализация под вашу роль</CardTitle>
              <CardDescription>Правый блок поясняет, как система подбирает сценарии под текущий рабочий контекст.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 p-6 pt-0">
              <div className="rounded-[24px] border border-sky-200 bg-sky-50 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-sky-700">Активная роль пользователя</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{getRoleLabel(getUserDepartment(user))}</p>
                <p className="mt-3 text-sm leading-7 text-slate-700">
                  Для этой роли в обучение и тестирование поднимаются более релевантные кейсы: темы писем, домены, sender и типы атак ближе к реальной работе пользователя.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-[22px] bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Сценариев под роль</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{userRoleScenarios.length}</p>
                </div>
                <div className="rounded-[22px] bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Попыток по роли</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{userRoleAttempts.length}</p>
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Рекомендованные ролевые сценарии</p>
                <div className="mt-3 grid gap-3">
                  {userRoleScenarios.length ? userRoleScenarios.map((scenario) => (
                    <div key={scenario.id} className="rounded-[20px] bg-white p-4">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <p className="font-semibold text-slate-900">{scenario.title}</p>
                          <p className="mt-1 text-sm text-slate-500">{getAttackTypeLabel(scenario.attackType)} • {getDifficultyLabel(scenario.difficulty)}</p>
                        </div>
                        <Badge variant={scenario.isSafeFlow ? "default" : "secondary"} className="rounded-full px-3 py-1">
                          {scenario.isSafeFlow ? "Безопасный" : "Фишинговый"}
                        </Badge>
                      </div>
                    </div>
                  )) : (
                    <div className="rounded-[20px] bg-white p-4 text-sm text-slate-500">
                      Для текущей роли пока нет отдельной подборки. Используется общий смешанный набор сценариев.
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-[30px] border border-slate-200 bg-white shadow-lg">
          <CardHeader className="p-6">
            <CardTitle className="text-2xl">{learningPlan.title}</CardTitle>
            <CardDescription>{learningPlan.summary}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 p-6 pt-0 xl:grid-cols-[1fr_1fr]">
            <div className="grid gap-3">
              {learningPlan.modules.map((item) => (
                <div key={item.title} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{item.detail}</p>
                </div>
              ))}
            </div>
            <div className="grid gap-3">
              {learningPlan.recommendedScenarios.map((item) => (
                <div key={item.id} className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-semibold text-slate-900">{item.title}</p>
                      <p className="mt-1 text-sm text-slate-500">{getRoleLabel(item.persona?.department)} • {getAttackTypeLabel(item.attackType)}</p>
                    </div>
                    <Badge variant="outline" className="rounded-full px-3 py-1">{getDifficultyLabel(item.difficulty)}</Badge>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-slate-700">{item.subject}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </SiteChrome>
  );
}

function Admin({ user, onBack, attempts, onNavigate, onLogout }) {
  const registeredUsers = readStorage(STORAGE_KEYS.users, []);
  const mockUsers = readStorage(STORAGE_KEYS.adminUsers, []);
  const [riskFilter, setRiskFilter] = useState("All");
  const campaigns = readStorage(STORAGE_KEYS.campaigns, defaultCampaigns);
  const scenarios = useMemo(() => buildScenarioItems(), []);
  const roleStats = buildRoleCoverageStats(scenarios, attempts);
  const attackTypeOverview = buildAttackTypeStats(attempts);

  const users = (registeredUsers.length ? registeredUsers : mockUsers).map((item) => {
    const ownAttempts = attempts.filter(
      (attempt) =>
        attempt.userId === item.id ||
        attempt.userName === item.name ||
        attempt.userEmail === item.email
    );
    const latestAttempt =
      ownAttempts
        .slice()
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null;

    return {
      ...item,
      name: getSafeDisplayName(item),
      department:
        item.department ||
        latestAttempt?.personaDepartment ||
        (item.role === "admin" ? "Администрирование" : "Пользователь"),
      jobTitle:
        item.jobTitle ||
        latestAttempt?.personaJobTitle ||
        (item.role === "admin" ? "Администратор" : "Зарегистрированный пользователь"),
    };
  });

  const rows = users.map((user) => {
    const ownAttempts = attempts.filter((item) => item.userId === user.id || item.userName === user.name);
    const metrics = buildRiskMetrics(ownAttempts);
    const highErrors = ownAttempts.filter((item) => item.riskScore >= 70).length;
    return {
      ...user,
      attempts: ownAttempts.length,
      metrics,
      repeatOffender: highErrors >= 2,
      latest: ownAttempts.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null,
    };
  });

  const filteredRows = rows.filter((row) => riskFilter === "All" || row.metrics.riskStatus.label === riskFilter);

  return (
    <SiteChrome current="admin" user={user} onNavigate={onNavigate} onLogout={onLogout}>
      <div className="space-y-6">
        <SectionHero
          eyebrow="Панель управления"
          title="Админ-панель"
          description="Список пользователей, риск-профиль, repeat offender flag, последние результаты и библиотека кампаний. Раздел нужен для анализа устойчивости команды и планирования обучения."
          icon={LayoutDashboard}
          actions={<Button variant="outline" className="rounded-2xl border-white/20 bg-transparent text-white hover:bg-white/10" onClick={onBack}>Назад</Button>}
        />

        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Пользователи" value={users.length} hint={registeredUsers.length ? "Реальные зарегистрированные профили" : "Пока используются демонстрационные профили"} dark />
          <MetricCard title="Попытки" value={attempts.length} hint="Все сохраненные попытки" dark />
          <MetricCard title="Повторные нарушения" value={rows.filter((row) => row.repeatOffender).length} hint="Два и более сценария с высоким риском" dark />
          <MetricCard title="Средний риск" value={`${attempts.length ? Math.round(attempts.reduce((sum, item) => sum + item.riskScore, 0) / attempts.length) : 0}`} hint="Средний риск по платформе" dark />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <Card className="rounded-[30px] border border-slate-200 bg-white shadow-lg">
            <CardHeader className="p-6">
              <CardTitle className="text-2xl">Статистика по ролям</CardTitle>
              <CardDescription>Показывает, какие роли участвуют в сценариях и где риск выше.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 p-6 pt-0">
              {roleStats.map((item) => (
                <div key={item.role} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-semibold text-slate-900">{item.roleLabel}</p>
                      <p className="mt-1 text-sm text-slate-500">Всего кейсов: {item.totalScenarios} • Попыток: {item.attempts}</p>
                    </div>
                    <Badge variant={item.avgRisk >= 70 ? "destructive" : item.avgRisk >= 40 ? "secondary" : "default"} className="rounded-full px-3 py-1">
                      Риск {item.avgRisk}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">Фишинговых: {item.phishingScenarios} • Безопасных: {item.safeScenarios}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-[30px] border border-slate-200 bg-white shadow-lg">
            <CardHeader className="p-6">
              <CardTitle className="text-2xl">Статистика по типам атак</CardTitle>
              <CardDescription>Помогает увидеть, какие векторы атак чаще распознаются, а где команда ошибается.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 p-6 pt-0">
              {attackTypeOverview.map((item) => (
                <div key={item.attackType} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-semibold text-slate-900">{getAttackTypeLabel(item.attackType)}</p>
                      <p className="mt-1 text-sm text-slate-500">Распознано: {item.detected} • Ошибок: {item.failed}</p>
                    </div>
                    <Badge variant={item.failed > item.detected ? "destructive" : "default"} className="rounded-full px-3 py-1">
                      Всего {item.detected + item.failed}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-[30px] border border-slate-200 bg-white shadow-lg">
          <CardHeader className="p-6">
            <CardTitle className="text-2xl">Фильтр по уровню риска</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2 flex-wrap p-6 pt-0">
            {["All", "Низкий риск", "Средний риск", "Высокий риск"].map((item) => (
              <FilterPill key={item} active={riskFilter === item} onClick={() => setRiskFilter(item)}>{item}</FilterPill>
            ))}
          </CardContent>
        </Card>
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="rounded-[30px] border border-slate-200 bg-white shadow-lg">
            <CardHeader className="p-6">
              <CardTitle className="text-2xl">Пользователи и риск-профиль</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-6 pt-0">
              {filteredRows.map((row) => (
                <div key={row.id} className="rounded-[26px] border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-start gap-3">
                      <div className="rounded-2xl bg-slate-900 p-3 text-white"><UserRound className="h-5 w-5" /></div>
                      <div>
                        <p className="text-lg font-semibold text-slate-900">{row.name}</p>
                        <p className="mt-1 text-sm text-slate-500">{row.email} • {row.department}</p>
                        <p className="mt-1 text-xs text-slate-400">{row.jobTitle}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant={row.metrics.riskStatus.variant} className="rounded-full px-3 py-1">{row.metrics.riskStatus.label}</Badge>
                      {row.repeatOffender ? <Badge variant="destructive" className="rounded-full px-3 py-1">Повторяется</Badge> : null}
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <div className="rounded-2xl bg-white p-4"><p className="text-xs text-slate-500">Риск-профиль</p><p className="mt-1 text-2xl font-bold">{row.metrics.riskScore}</p></div>
                    <div className="rounded-2xl bg-white p-4"><p className="text-xs text-slate-500">Ошибки</p><p className="mt-1 text-2xl font-bold">{row.metrics.clickRate}%</p></div>
                    <div className="rounded-2xl bg-white p-4"><p className="text-xs text-slate-500">Попыток</p><p className="mt-1 text-2xl font-bold">{row.attempts}</p></div>
                    <div className="rounded-2xl bg-white p-4"><p className="text-xs text-slate-500">Последний итог</p><p className="mt-1 text-sm font-semibold">{row.latest ? row.latest.outcomeLabel : "Нет данных"}</p></div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="rounded-[30px] border border-slate-200 bg-white shadow-lg">
              <CardHeader className="p-6">
                <CardTitle className="text-2xl">Последние результаты</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-6 pt-0">
                {attempts.slice().reverse().slice(0, 8).map((item) => (
                  <div key={item.id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <p className="font-semibold text-slate-900">{item.userName}</p>
                      <Badge variant={item.riskScore >= 70 ? "destructive" : item.riskScore >= 40 ? "secondary" : "default"} className="rounded-full px-3 py-1">
                        {item.outcomeLabel}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{item.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatDate(item.createdAt)} • {getAttackTypeLabel(item.attackType)} • Риск {item.riskScore}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-[30px] border border-slate-200 bg-white shadow-lg">
              <CardHeader className="p-6">
                <CardTitle className="text-2xl">Библиотека кампаний</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 p-6 pt-0">
                {campaigns.map((item) => (
                  <div key={item.id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <p className="font-semibold text-slate-900">{item.name}</p>
                      <Badge variant="secondary" className="rounded-full px-3 py-1">{getDifficultyLabel(item.difficulty)}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{item.subject}</p>
                    <p className="mt-2 text-xs text-slate-500">{getAttackTypeLabel(item.attackType)}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </SiteChrome>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [screen, setScreen] = useState("dashboard");
  const [tick, setTick] = useState(0);
  const [replayScenarioId, setReplayScenarioId] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      seedAppData();
      try {
        await migrateLegacyStorageToServer().catch(() => null);
        await hydrateAppStorage();
      } catch (error) {
        console.error("Failed to hydrate app storage from PostgreSQL API:", error);
      }

      if (cancelled) return;

      const saved = readStorage(STORAGE_KEYS.session, null);
      const users = readStorage(STORAGE_KEYS.users, []);
      const nextUser = saved ? users.find((item) => item.id === saved.id) || null : null;
      if (nextUser) {
        writeStorage(STORAGE_KEYS.session, nextUser);
        setUser(nextUser);
      } else {
        localStorage.removeItem(STORAGE_KEYS.session);
      }
      setReady(true);
    };

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  const attempts = useMemo(() => {
    const allAttempts = readStorage(STORAGE_KEYS.attempts, []);
    if (!user) return [];
    if (user.role === "admin") return allAttempts;
    return allAttempts.filter((item) => item.userId === user.id);
  }, [user, tick]);

  if (!ready) return null;
  if (!user) return <Auth onLogin={setUser} />;
  if (screen === "profile") return <ProfilePage user={user} attempts={attempts} onBack={() => setScreen("dashboard")} onNavigate={setScreen} onUserUpdate={setUser} onDeleteAccount={async () => {
    if (!confirm("Удалить аккаунт и связанные попытки? Это действие нельзя отменить.")) return;
    try {
      await deleteUser(user.id);
      const users = readStorage(STORAGE_KEYS.users, []).filter((item) => item.id !== user.id);
      const nextAttempts = readStorage(STORAGE_KEYS.attempts, []).filter((item) => item.userId !== user.id);
      writeStorage(STORAGE_KEYS.users, users);
      writeStorage(STORAGE_KEYS.attempts, nextAttempts);
      localStorage.removeItem(STORAGE_KEYS.session);
      setUser(null);
      setReplayScenarioId(null);
      setScreen("dashboard");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Не удалось удалить аккаунт.");
    }
  }} onLogout={() => {
    localStorage.removeItem(STORAGE_KEYS.session);
    setUser(null);
    setReplayScenarioId(null);
    setScreen("dashboard");
  }} />;
  if (screen === "theory") return <Theory user={user} onBack={() => setScreen("dashboard")} onNavigate={setScreen} onLogout={() => {
    localStorage.removeItem(STORAGE_KEYS.session);
    setUser(null);
    setScreen("dashboard");
  }} />;
  if (screen === "simulator") return <Simulator user={user} initialScenarioId={replayScenarioId} onBack={() => { setReplayScenarioId(null); setScreen("dashboard"); }} onSaved={() => setTick((value) => value + 1)} onNavigate={setScreen} onLogout={() => {
    localStorage.removeItem(STORAGE_KEYS.session);
    setUser(null);
    setReplayScenarioId(null);
    setScreen("dashboard");
  }} />;
  if (screen === "exam") return <Simulator user={user} initialExamMode onBack={() => setScreen("dashboard")} onSaved={() => setTick((value) => value + 1)} onNavigate={setScreen} onLogout={() => {
    localStorage.removeItem(STORAGE_KEYS.session);
    setUser(null);
    setScreen("dashboard");
  }} />;
  if (screen === "history") return <HistoryPage user={user} attempts={attempts} onBack={() => setScreen("dashboard")} onNavigate={setScreen} onLogout={() => {
    localStorage.removeItem(STORAGE_KEYS.session);
    setUser(null);
    setScreen("dashboard");
  }} />;
  if (screen === "url-check") return <UrlCheckPage user={user} onBack={() => setScreen("dashboard")} onNavigate={setScreen} onLogout={() => {
    localStorage.removeItem(STORAGE_KEYS.session);
    setUser(null);
    setScreen("dashboard");
  }} />;
  if (screen === "mistakes") return <MistakesPage user={user} attempts={attempts} onBack={() => setScreen("dashboard")} onNavigate={setScreen} onReplayScenario={(scenarioId) => {
    setReplayScenarioId(scenarioId);
    setScreen("simulator");
  }} onLogout={() => {
    localStorage.removeItem(STORAGE_KEYS.session);
    setUser(null);
    setReplayScenarioId(null);
    setScreen("dashboard");
  }} />;
  if (screen === "comparison") return (
    <SiteChrome current="comparison" user={user} onNavigate={setScreen} onLogout={() => {
      localStorage.removeItem(STORAGE_KEYS.session);
      setUser(null);
      setScreen("dashboard");
    }}>
      <ComparisonPage onBack={() => setScreen("dashboard")} />
    </SiteChrome>
  );
  if (screen === "admin" && user.role === "admin") return <Admin user={user} onBack={() => setScreen("dashboard")} attempts={readStorage(STORAGE_KEYS.attempts, [])} onNavigate={setScreen} onLogout={() => {
    localStorage.removeItem(STORAGE_KEYS.session);
    setUser(null);
    setScreen("dashboard");
  }} />;

  return (
    <Dashboard
      user={user}
      attempts={attempts}
      onOpenProfile={() => setScreen("profile")}
      onOpenTheory={() => setScreen("theory")}
      onOpenSimulator={() => setScreen("simulator")}
      onOpenExam={() => setScreen("exam")}
      onOpenHistory={() => setScreen("history")}
      onOpenUrlCheck={() => setScreen("url-check")}
      onOpenMistakes={() => setScreen("mistakes")}
      onOpenComparison={() => setScreen("comparison")}
      onOpenAdmin={() => setScreen("admin")}
      onNavigate={setScreen}
      onLogout={() => {
        localStorage.removeItem(STORAGE_KEYS.session);
        setUser(null);
        setReplayScenarioId(null);
        setScreen("dashboard");
      }}
    />
  );
}
