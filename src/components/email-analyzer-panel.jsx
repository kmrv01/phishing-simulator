import React, { useMemo, useState } from "react";
import { AtSign, ShieldAlert } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { analyzeSenderEmail } from "../lib/emailAnalyzer";

const EXAMPLES = [
  "support@micr0soft.com",
  "support@microsoft.com",
  "security@telegrern.org",
  "helpdesk@corp.nurbank.kz",
];

export function EmailAnalyzerPanel() {
  const [value, setValue] = useState("support@micr0soft.com");
  const [submittedValue, setSubmittedValue] = useState("");
  const analysis = useMemo(() => analyzeSenderEmail(submittedValue), [submittedValue]);

  const riskColor =
    analysis.risk === "high" ? "bg-rose-600 hover:bg-rose-600" : analysis.risk === "medium" ? "bg-amber-500 hover:bg-amber-500" : "bg-emerald-600 hover:bg-emerald-600";

  return (
    <Card className="rounded-[32px] border border-slate-200 bg-white shadow-lg">
      <CardHeader className="p-6">
        <CardTitle className="text-2xl">Проверить email отправителя</CardTitle>
        <CardDescription>Мини-модуль для оценки sender address по домену, бренду и признакам маскировки.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-6 pt-0">
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setValue(item)}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-sm"
            >
              {item}
            </button>
          ))}
        </div>

        <div className="flex gap-3 flex-wrap">
          <Input className="min-w-[280px] flex-1 rounded-2xl" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Вставьте email отправителя" />
          <Button className="rounded-2xl" onClick={() => setSubmittedValue(value.trim())}>Проверить</Button>
        </div>

        {!submittedValue ? (
          <div className="rounded-[26px] border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[18px] bg-slate-900 text-white">
              <AtSign className="h-6 w-6" />
            </div>
            <p className="mt-4 text-lg font-semibold text-slate-900">Проверка email еще не запускалась</p>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              Введите адрес отправителя и нажмите <strong>Проверить</strong>. Модуль покажет, выглядит ли email официальным
              или похож на фишинговую подмену.
            </p>
          </div>
        ) : !analysis.valid ? (
          <div className="rounded-[24px] border border-rose-200 bg-rose-50 p-5 text-rose-900">
            Введите корректный email отправителя, чтобы запустить анализ.
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[26px] border border-slate-200 bg-slate-50 p-5">
              <div>
                <p className="text-sm text-slate-500">Нормализованный sender</p>
                <p className="mt-1 break-all text-sm text-slate-900">{analysis.normalizedEmail}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge className={`rounded-full px-3 py-1 text-white ${riskColor}`}>
                  {analysis.risk === "high" ? "Подозрительно" : analysis.risk === "medium" ? "Требует проверки" : "Похоже на безопасный"}
                </Badge>
                <div className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900">Оценка {analysis.score}/100</div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {analysis.checks.map((item) => (
                <div key={item.label} className="rounded-[24px] border border-slate-200 bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-900">{item.label}</p>
                    <Badge variant={item.risk === "high" ? "destructive" : item.risk === "medium" ? "secondary" : "default"} className="rounded-full px-3 py-1">
                      {item.risk === "high" ? "высокий" : item.risk === "medium" ? "средний" : "низкий"}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-slate-700">{item.verdict}</p>
                </div>
              ))}
            </div>

            <div className="rounded-[26px] border border-sky-200 bg-sky-50 p-5 text-sky-950">
              <div className="flex items-center gap-3">
                <ShieldAlert className="h-5 w-5" />
                <p className="font-semibold">Как интерпретировать результат</p>
              </div>
              <p className="mt-3 text-sm leading-7">
                Адрес вроде <strong>support@micr0soft.com</strong> выглядит правдоподобно, но домен искажает бренд. А
                <strong> support@microsoft.com</strong> ближе к нормальному официальному сценарию и получает низкий риск.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
