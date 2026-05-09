import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, GitCompareArrows, MoveRight, ShieldCheck } from "lucide-react";

import { buildScenarioItems } from "../data/scenarios";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

function getAttackTypeLabel(value) {
  const labels = {
    "Password Reset": "Сброс пароля",
    "Microsoft 365": "Microsoft 365",
    "Finance / Bonus": "Финансы / бонус",
    "CEO Fraud": "Мошенничество от имени руководителя",
    Telegram: "Telegram",
    Instagram: "Instagram",
    "QR Phishing": "QR-сценарии",
    Smishing: "Смишинг",
  };

  return labels[value] || value;
}

function getDifficultyLabel(value) {
  if (value === "Hard") return "Сложный";
  if (value === "Medium") return "Средний";
  if (value === "Easy") return "Легкий";
  return value;
}

function getHost(url) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function getLoginFlowText(item, isSafe) {
  if (isSafe) {
    return item.asks2FA
      ? "Сначала вводится пароль, затем открывается отдельный шаг подтверждения 2FA."
      : "Сервис просит только ожидаемые данные и не собирает лишние секреты на одной странице.";
  }

  if (item.asksPassword && item.asks2FA) {
    return "Пароль и код 2FA собираются сразу на одной странице, что выглядит как сильный риск-признак.";
  }

  if (item.asksPayment) {
    return "Сценарий сразу подталкивает к вводу платежных данных или чувствительной информации.";
  }

  return "Логика входа нетипична: форма пытается собрать данные быстрее и агрессивнее обычного процесса.";
}

function getScenarioActionText(item, isSafe) {
  if (isSafe) {
    return "Проверить ожидаемый контекст, домен и пройти стандартный сценарий только через официальный портал.";
  }

  return "Не переходить по подозрительной ссылке, не вводить данные и сообщить о сценарии как о возможном фишинге.";
}

function getComparisonTheme(attackType) {
  const themes = {
    "Password Reset": {
      title: "Проверка доступа к корпоративной учетной записи",
      preview: "Сотруднику нужно подтвердить доступ к рабочей учетной записи по стандартному процессу.",
      mailbox: "Корпоративная почта",
    },
    "Microsoft 365": {
      title: "Проверка доступа к Microsoft 365",
      preview: "Пользователь получает уведомление о входе и должен понять, безопасный это процесс или нет.",
      mailbox: "Outlook 365",
    },
    "Finance / Bonus": {
      title: "Подтверждение финансового уведомления",
      preview: "Письмо связано с бонусом, выплатой или реквизитами и требует внимательной проверки.",
      mailbox: "Корпоративная почта",
    },
    "CEO Fraud": {
      title: "Срочное письмо от руководства",
      preview: "Сценарий имитирует запрос от руководителя и показывает разницу между рабочим и опасным кейсом.",
      mailbox: "Outlook 365",
    },
    Telegram: {
      title: "Проверка безопасности аккаунта Telegram",
      preview: "Пользователь получает уведомление о защите аккаунта и должен оценить домен, sender и flow.",
      mailbox: "Gmail Workspace",
    },
    Instagram: {
      title: "Подтверждение доступа к корпоративному Instagram",
      preview: "Обе карточки показывают один и тот же контекст: восстановление или проверка рабочего профиля.",
      mailbox: "Gmail Workspace",
    },
    "QR Phishing": {
      title: "Восстановление доступа через QR-сценарий",
      preview: "Сценарий показывает, как один и тот же QR-контекст может быть безопасным или фишинговым.",
      mailbox: "Корпоративная почта",
    },
    Smishing: {
      title: "Проверка ссылки из SMS-уведомления",
      preview: "Сотрудник получает короткое сообщение и должен понять, можно ли ему доверять.",
      mailbox: "SMS / почта",
    },
  };

  return (
    themes[attackType] || {
      title: "Сравнение безопасного и фишингового сценария",
      preview: "Один и тот же рабочий контекст может выглядеть безопасно или содержать признаки атаки.",
      mailbox: "Корпоративная почта",
    }
  );
}

function buildComparisonRows(safeScenario, phishingScenario) {
  return [
    {
      label: "Отправитель",
      safe: "Ожидаемый sender и совпадающий домен отправителя без подмены.",
      phish: phishingScenario?.isSpoofed
        ? "Display name выглядит знакомо, но фактический sender внешний или искаженный."
        : "Письмо выглядит похожим на рабочее, но требует дополнительной проверки источника.",
    },
    {
      label: "Домен страницы",
      safe: getHost(safeScenario?.landingUrl || ""),
      phish: getHost(phishingScenario?.landingUrl || ""),
    },
    {
      label: "Логика входа",
      safe: getLoginFlowText(safeScenario, true),
      phish: getLoginFlowText(phishingScenario, false),
    },
    {
      label: "Срочность",
      safe: safeScenario?.asksUrgentAction
        ? "Срочность может быть, но письмо остается в рамках понятного рабочего процесса."
        : "Без давления и искусственного ускорения решения.",
      phish: phishingScenario?.asksUrgentAction
        ? "Письмо давит на пользователя и подталкивает к немедленному действию."
        : "Срочность может быть замаскирована под обычное уведомление.",
    },
    {
      label: "Что делать пользователю",
      safe: getScenarioActionText(safeScenario, true),
      phish: getScenarioActionText(phishingScenario, false),
    },
  ];
}

function ComparisonMailCard({ item, tone, comparisonTheme }) {
  const isSafe = tone === "safe";

  return (
    <Card
      className={`rounded-[32px] border bg-white shadow-xl ${
        isSafe ? "border-emerald-200" : "border-rose-200"
      }`}
    >
      <CardHeader className="p-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <Badge
              className={`w-fit rounded-full px-3 py-1 text-white ${
                isSafe
                  ? "bg-emerald-600 hover:bg-emerald-600"
                  : "bg-rose-600 hover:bg-rose-600"
              }`}
            >
              {isSafe ? "Безопасный сценарий" : "Фишинговый сценарий"}
            </Badge>
            <CardTitle className="pt-4 text-2xl">{comparisonTheme.title}</CardTitle>
            <CardDescription className="pt-2">
              {comparisonTheme.mailbox} • {getAttackTypeLabel(item.attackType)} •{" "}
              {getDifficultyLabel(item.difficulty)}
            </CardDescription>
          </div>
          <div
            className={`max-w-xs rounded-2xl px-4 py-3 text-sm ${
              isSafe ? "bg-emerald-50 text-emerald-900" : "bg-rose-50 text-rose-900"
            }`}
          >
            {comparisonTheme.preview}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-6 pt-0">
        <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm text-slate-500">От кого</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{item.senderName}</p>
          <p className="mt-2 text-sm text-slate-600">Показываемый адрес: {item.displayEmail}</p>
          <p className="mt-1 text-sm text-slate-600">Фактический sender: {item.senderEmail}</p>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm text-slate-500">Содержание письма</p>
          <p className="mt-2 text-sm leading-7 text-slate-700">{item.body}</p>
          <div
            className={`mt-4 rounded-[20px] border p-4 text-sm ${
              isSafe
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-amber-200 bg-amber-50 text-amber-900"
            }`}
          >
            {item.callout}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-[22px] bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Официальный домен</p>
            <p className="mt-1 font-semibold text-slate-900">{getHost(item.officialUrl)}</p>
          </div>
          <div className="rounded-[22px] bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Фактический домен</p>
            <p className={`mt-1 font-semibold ${isSafe ? "text-emerald-700" : "text-rose-700"}`}>
              {getHost(item.landingUrl)}
            </p>
          </div>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm text-slate-500">Логика входа</p>
          <p className="mt-2 text-sm leading-7 text-slate-700">
            {getLoginFlowText(item, isSafe)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function ComparisonPage({ onBack, showBack = true }) {
  const scenarios = useMemo(() => buildScenarioItems(), []);

  const comparisonGroups = useMemo(() => {
    const grouped = new Map();

    scenarios.forEach((item) => {
      const key = item.attackType;
      if (!grouped.has(key)) {
        grouped.set(key, { attackType: key, safe: [], phishing: [] });
      }

      const bucket = grouped.get(key);
      if (item.isSafeFlow) bucket.safe.push(item);
      else bucket.phishing.push(item);
    });

    return Array.from(grouped.values()).filter((group) => group.safe.length && group.phishing.length);
  }, [scenarios]);

  const [groupKey, setGroupKey] = useState(comparisonGroups[0]?.attackType || "");
  const currentGroup =
    comparisonGroups.find((group) => group.attackType === groupKey) || comparisonGroups[0];

  const [safeId, setSafeId] = useState(currentGroup?.safe[0]?.id || "");
  const [phishId, setPhishId] = useState(currentGroup?.phishing[0]?.id || "");

  useEffect(() => {
    if (!currentGroup) return;
    setSafeId((prev) =>
      currentGroup.safe.some((item) => item.id === prev) ? prev : currentGroup.safe[0]?.id || ""
    );
    setPhishId((prev) =>
      currentGroup.phishing.some((item) => item.id === prev)
        ? prev
        : currentGroup.phishing[0]?.id || ""
    );
  }, [currentGroup]);

  const safeScenario =
    currentGroup?.safe.find((item) => item.id === safeId) || currentGroup?.safe[0] || null;
  const phishingScenario =
    currentGroup?.phishing.find((item) => item.id === phishId) ||
    currentGroup?.phishing[0] ||
    null;
  const comparisonTheme = getComparisonTheme(currentGroup?.attackType);

  const comparisonRows = buildComparisonRows(safeScenario, phishingScenario);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-white">Сравнение: безопасный и фишинговый сценарий</h1>
          <p className="mt-1 max-w-3xl text-slate-300">
            Здесь можно сравнивать не случайные письма, а парные сценарии одного типа. Это помогает
            увидеть реальную разницу между нормальным процессом и подделкой в одинаковом контексте.
          </p>
        </div>
        {showBack ? (
          <Button
            variant="outline"
            className="rounded-2xl border-white/20 bg-transparent text-white hover:bg-white/10"
            onClick={onBack}
          >
            Назад
          </Button>
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="rounded-[30px] border border-white/10 bg-slate-950 text-white shadow-2xl">
          <CardHeader className="p-6">
            <CardTitle className="text-2xl">Реальное парное сравнение</CardTitle>
            <CardDescription className="pt-2 text-slate-300">
              Сначала выбирается общий тип атаки, а затем внутри него сопоставляются безопасный и
              фишинговый сценарии. Так сравнение становится честным: одна тема, один контекст,
              разные признаки.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 p-6 pt-0 md:grid-cols-3">
            <div className="rounded-[24px] border border-emerald-400/20 bg-emerald-400/10 p-5">
              <ShieldCheck className="h-6 w-6 text-emerald-300" />
              <p className="mt-3 font-semibold">Что нормально</p>
              <p className="mt-2 text-sm leading-7 text-slate-300">
                Официальный домен, ожидаемый sender и логичный пошаговый flow входа.
              </p>
            </div>
            <div className="rounded-[24px] border border-rose-400/20 bg-rose-400/10 p-5">
              <AlertTriangle className="h-6 w-6 text-rose-300" />
              <p className="mt-3 font-semibold">Что выдает подделку</p>
              <p className="mt-2 text-sm leading-7 text-slate-300">
                Подмененный домен, искусственная срочность и сбор секретов в нетипичной форме.
              </p>
            </div>
            <div className="rounded-[24px] border border-sky-400/20 bg-sky-400/10 p-5">
              <GitCompareArrows className="h-6 w-6 text-sky-300" />
              <p className="mt-3 font-semibold">Почему так удобнее</p>
              <p className="mt-2 text-sm leading-7 text-slate-300">
                Пользователь видит разницу внутри одной темы, а не между двумя несвязанными кейсами.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[30px] border border-white/10 bg-slate-950 text-white shadow-2xl">
          <CardHeader className="p-6">
            <CardTitle className="text-2xl">Выбор пары</CardTitle>
            <CardDescription className="pt-2 text-slate-300">
              Сначала выбери общий тип сценария, затем безопасный и фишинговый варианты внутри него.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 p-6 pt-0">
            <div>
              <p className="mb-2 text-sm text-slate-300">Общий тип сценария</p>
              <select
                className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white"
                value={currentGroup?.attackType || ""}
                onChange={(e) => setGroupKey(e.target.value)}
              >
                {comparisonGroups.map((group) => (
                  <option key={group.attackType} value={group.attackType} className="text-slate-900">
                    {getAttackTypeLabel(group.attackType)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <p className="mb-2 text-sm text-slate-300">Безопасный вариант</p>
              <select
                className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white"
                value={safeScenario?.id || ""}
                onChange={(e) => setSafeId(e.target.value)}
              >
                {currentGroup?.safe.map((item) => (
                  <option key={item.id} value={item.id} className="text-slate-900">
                    {item.subject}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <p className="mb-2 text-sm text-slate-300">Фишинговый вариант</p>
              <select
                className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white"
                value={phishingScenario?.id || ""}
                onChange={(e) => setPhishId(e.target.value)}
              >
                {currentGroup?.phishing.map((item) => (
                  <option key={item.id} value={item.id} className="text-slate-900">
                    {item.subject}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-[22px] border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
              Сейчас сравниваются два сценария одного типа:{" "}
              <span className="font-semibold text-white">
                {currentGroup ? getAttackTypeLabel(currentGroup.attackType) : "—"}
              </span>
              . Это дает более реальную картину: пользователь видит, как меняются домен, sender и
              flow внутри одной и той же темы.
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {safeScenario ? (
          <ComparisonMailCard item={safeScenario} tone="safe" comparisonTheme={comparisonTheme} />
        ) : null}
        {phishingScenario ? (
          <ComparisonMailCard
            item={phishingScenario}
            tone="phish"
            comparisonTheme={comparisonTheme}
          />
        ) : null}
      </div>

      <Card className="rounded-[30px] border border-slate-200 bg-white shadow-xl">
        <CardHeader className="p-6">
          <CardTitle className="text-2xl">Ключевые различия</CardTitle>
          <CardDescription>
            Ниже собраны признаки, которые нужно сопоставлять перед кликом и вводом данных.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 p-6 pt-0">
          {comparisonRows.map((row) => (
            <div
              key={row.label}
              className="grid gap-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4 xl:grid-cols-[0.28fr_0.36fr_0.36fr]"
            >
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">
                  {row.label}
                </p>
              </div>
              <div className="rounded-[18px] border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-semibold text-emerald-800">Безопасно</p>
                <p className="mt-2 text-sm leading-7 text-slate-700">{row.safe}</p>
              </div>
              <div className="rounded-[18px] border border-rose-200 bg-rose-50 p-4">
                <p className="text-sm font-semibold text-rose-800">Фишинг</p>
                <p className="mt-2 text-sm leading-7 text-slate-700">{row.phish}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-[30px] border border-slate-200 bg-white shadow-xl">
        <CardHeader className="p-6">
          <CardTitle className="text-2xl">Как пользоваться этим разделом</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 p-6 pt-0 md:grid-cols-3">
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-900">1. Выбери тему</p>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Например, Microsoft 365, Telegram или сброс пароля.
            </p>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-900">2. Сравни признаки</p>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Смотри на sender, домен, срочность и логику формы, а не только на внешний вид письма.
            </p>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-900">3. Запомни разницу</p>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Цель раздела не пугать всем подряд, а научить замечать именно нетипичные отклонения.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
