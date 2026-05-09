import React, { useMemo, useState } from "react";
import { Loader2, ShieldAlert, Sparkles } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { fetchAiUrlAnalysis } from "../lib/ai-url-analysis";
import { analyzeUrl } from "../lib/urlAnalyzer";

function getRiskLabel(risk) {
  if (risk === "high") return "высокий";
  if (risk === "medium") return "средний";
  return "низкий";
}

function getRiskColor(risk) {
  return risk === "high"
    ? "bg-rose-600 hover:bg-rose-600"
    : risk === "medium"
      ? "bg-amber-500 hover:bg-amber-500"
      : "bg-emerald-600 hover:bg-emerald-600";
}

function getAiErrorMessage(error) {
  const status = error?.status;
  const code = error?.code;
  const raw = error?.message || "";

  if (status === 503 || code === "missing_api_key" || raw.includes("OPENAI_API_KEY")) {
    return "AI-анализ не настроен. Создайте `.env.local`, добавьте `OPENAI_API_KEY` и перезапустите `npm run dev`.";
  }
  if (status === 400 || code === "missing_url") {
    return "Для AI-анализа нужно ввести корректную ссылку.";
  }
  if (status === 401) {
    return "AI-анализ недоступен: ключ OpenAI неверный или просрочен.";
  }
  if (status === 429) {
    return "AI-анализ временно недоступен: превышен лимит запросов или квота API.";
  }
  if (code === "request_timeout") {
    return "AI-анализ не успел получить ответ от модели вовремя. Попробуйте еще раз.";
  }
  if (code === "invalid_model_json") {
    return "Модель вернула ответ, но он не был разобран как структурированный JSON.";
  }
  if (status >= 500) {
    return "AI-анализ временно недоступен: сервер не смог получить корректный ответ от модели.";
  }
  if (raw.toLowerCase().includes("failed to fetch")) {
    return "AI-анализ недоступен: проблема с сетью или dev-сервером.";
  }

  return `AI-анализ недоступен: ${raw || "неизвестная ошибка"}`;
}

function combineRisk(localAnalysis, aiAnalysis) {
  if (!localAnalysis?.valid) return { score: 0, risk: "low" };
  if (!aiAnalysis) return { score: localAnalysis.score, risk: localAnalysis.risk };

  const riskOrder = { low: 0, medium: 1, high: 2 };
  const risk = riskOrder[aiAnalysis.risk] > riskOrder[localAnalysis.risk] ? aiAnalysis.risk : localAnalysis.risk;
  const score = Math.max(localAnalysis.score, aiAnalysis.score);
  return { score, risk };
}

export function UrlAnalyzerPanel() {
  const [value, setValue] = useState("https://telegrern-security.com/verify?auth=session-confirm-2026");
  const [submittedValue, setSubmittedValue] = useState("");
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiError, setAiError] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const localAnalysis = useMemo(() => analyzeUrl(submittedValue), [submittedValue]);
  const combined = combineRisk(localAnalysis, aiAnalysis);
  const combinedRiskColor = getRiskColor(combined.risk);

  const runAnalysis = async () => {
    const nextValue = value.trim();
    setSubmittedValue(nextValue);
    setAiAnalysis(null);
    setAiError("");

    if (!nextValue) return;

    setAiLoading(true);
    try {
      const result = await fetchAiUrlAnalysis(nextValue);
      setAiAnalysis(result);
    } catch (error) {
      setAiError(getAiErrorMessage(error));
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <Card className="rounded-[32px] border border-slate-200 bg-white shadow-lg">
      <CardHeader className="p-6">
        <CardTitle className="text-2xl">Проверить ссылку</CardTitle>
        <CardDescription>
          Локальная эвристика и AI-анализ работают вместе: сначала проверяется структура URL, затем при наличии ключа
          запускается модель OpenAI для дополнительного вердикта.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-6 pt-0">
        <div className="flex gap-3 flex-wrap">
          <Input
            className="min-w-[280px] flex-1 rounded-2xl"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Вставьте ссылку для проверки"
          />
          <Button className="rounded-2xl" onClick={runAnalysis} disabled={aiLoading}>
            {aiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Анализировать
          </Button>
        </div>

        {!submittedValue ? (
          <div className="rounded-[26px] border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[18px] bg-slate-900 text-white">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <p className="mt-4 text-lg font-semibold text-slate-900">Анализ еще не запускался</p>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              Вставьте ссылку и нажмите <strong>Анализировать</strong>. Модуль выполнит локальную проверку URL и,
              если настроен `OPENAI_API_KEY`, запросит дополнительный AI-вердикт.
            </p>
          </div>
        ) : !localAnalysis.valid ? (
          <div className="rounded-[24px] border border-rose-200 bg-rose-50 p-5 text-rose-900">
            Введите корректный URL, чтобы запустить анализ.
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[26px] border border-slate-200 bg-slate-50 p-5">
              <div>
                <p className="text-sm text-slate-500">Нормализованный адрес</p>
                <p className="mt-1 break-all text-sm text-slate-900">{localAnalysis.normalizedUrl}</p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <Badge className={`rounded-full px-3 py-1 text-white ${combinedRiskColor}`}>
                  Риск: {getRiskLabel(combined.risk)}
                </Badge>
                <div className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900">
                  Оценка {combined.score}/100
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
              <div className="rounded-[26px] border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-slate-900" />
                    <p className="font-semibold text-slate-900">Локальная эвристика</p>
                  </div>
                  <Badge className={`rounded-full px-3 py-1 text-white ${getRiskColor(localAnalysis.risk)}`}>
                    {getRiskLabel(localAnalysis.risk)}
                  </Badge>
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Проверка по домену, поддоменам, токенам, брендовым подменам, типу хостинга и подозрительным словам.
                </p>
              </div>

              <div className="rounded-[26px] border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-slate-900" />
                    <p className="font-semibold text-slate-900">AI-анализ</p>
                  </div>
                  {aiLoading ? (
                    <Badge variant="secondary" className="rounded-full px-3 py-1">анализ</Badge>
                  ) : aiAnalysis ? (
                    <Badge className={`rounded-full px-3 py-1 text-white ${getRiskColor(aiAnalysis.risk)}`}>
                      {getRiskLabel(aiAnalysis.risk)}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="rounded-full px-3 py-1">нет</Badge>
                  )}
                </div>

                {aiError ? (
                  <div className="mt-3 rounded-[18px] border border-amber-200 bg-amber-50 p-3 text-sm leading-7 text-amber-800">
                    {aiError}
                  </div>
                ) : aiAnalysis ? (
                  <>
                    <p className="mt-3 text-sm font-semibold text-slate-900">{aiAnalysis.verdict}</p>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{aiAnalysis.summary}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      Уверенность модели: {aiAnalysis.confidence}% • {aiAnalysis.model}
                    </p>
                  </>
                ) : (
                  <div className="mt-3 rounded-[18px] border border-slate-200 bg-white p-3 text-sm leading-7 text-slate-600">
                    Если настроен `OPENAI_API_KEY`, после нажатия кнопки здесь появится дополнительный вердикт модели.
                    <div className="mt-2 font-mono text-xs text-slate-500">.env.local → OPENAI_API_KEY=...</div>
                  </div>
                )}
              </div>
            </div>

            {aiAnalysis?.indicators?.length ? (
              <div className="rounded-[26px] border border-violet-200 bg-violet-50 p-5">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-violet-700" />
                  <p className="font-semibold text-violet-950">Что заметил AI</p>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {aiAnalysis.indicators.map((item) => (
                    <div key={`${item.title}-${item.detail}`} className="rounded-[22px] border border-violet-200 bg-white p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-slate-900">{item.title}</p>
                        <Badge
                          variant={item.severity === "high" ? "destructive" : item.severity === "medium" ? "secondary" : "default"}
                          className="rounded-full px-3 py-1"
                        >
                          {getRiskLabel(item.severity)}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm leading-7 text-slate-700">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="grid gap-3 md:grid-cols-2">
              {localAnalysis.checks.map((item) => (
                <div key={item.label} className="rounded-[24px] border border-slate-200 bg-white p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-900">{item.label}</p>
                    <Badge
                      variant={item.risk === "high" ? "destructive" : item.risk === "medium" ? "secondary" : "default"}
                      className="rounded-full px-3 py-1"
                    >
                      {getRiskLabel(item.risk)}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-slate-700">{item.verdict}</p>
                </div>
              ))}
            </div>

            <div className="rounded-[26px] border border-sky-200 bg-sky-50 p-5 text-sky-950">
              <div className="flex items-center gap-3">
                <ShieldAlert className="h-5 w-5" />
                <p className="font-semibold">Итог</p>
              </div>
              <p className="mt-3 text-sm leading-7">
                Модуль объединяет локальную проверку URL и AI-анализ. Это не заменяет внешние threat-intelligence
                сервисы, но делает автоматическую оценку ссылок заметно более реалистичной и полезной для обучения.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
