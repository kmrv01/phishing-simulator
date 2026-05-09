import React, { useMemo, useState } from "react";
import { Search, ShieldCheck } from "lucide-react";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { formatDate } from "../lib/storage";

export function HistoryLog({ attempts, difficulties, attackTypes }) {
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState("All");
  const [attackType, setAttackType] = useState("All");
  const [sortBy, setSortBy] = useState("date");

  const rows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const filtered = attempts.filter((item) => {
      const matchesQuery =
        !normalized ||
        item.title.toLowerCase().includes(normalized) ||
        item.attackType.toLowerCase().includes(normalized) ||
        item.outcomeLabel.toLowerCase().includes(normalized);
      const matchesDifficulty = difficulty === "All" || item.difficulty === difficulty;
      const matchesAttackType = attackType === "All" || item.attackType === attackType;
      return matchesQuery && matchesDifficulty && matchesAttackType;
    });

    return filtered.sort((a, b) => {
      if (sortBy === "risk") return b.riskScore - a.riskScore;
      if (sortBy === "click") return b.timeToClick - a.timeToClick;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [attempts, query, difficulty, attackType, sortBy]);

  return (
    <Card className="rounded-[32px] border border-slate-200 bg-white shadow-lg">
      <CardHeader className="p-6">
        <CardTitle className="text-2xl">История прохождений</CardTitle>
        <CardDescription>Поиск, сортировка и фильтрация по прохождениям</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-6 pt-0">
        <div className="grid gap-3 lg:grid-cols-[1.2fr_0.7fr_0.8fr_0.8fr]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input className="rounded-2xl pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск по сценарию, типу атаки или итогу" />
          </div>
          <select className="h-10 rounded-2xl border border-slate-200 px-3 text-sm" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            {difficulties.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <select className="h-10 rounded-2xl border border-slate-200 px-3 text-sm" value={attackType} onChange={(e) => setAttackType(e.target.value)}>
            {attackTypes.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <select className="h-10 rounded-2xl border border-slate-200 px-3 text-sm" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="date">Сначала новые</option>
            <option value="risk">По риску</option>
            <option value="click">По времени до клика</option>
          </select>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[18px] bg-slate-900 text-white">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <p className="mt-4 text-lg font-semibold text-slate-900">История пока не найдена</p>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              Либо пользователь еще не проходил сценарии, либо текущие фильтры слишком узкие. Попробуйте сбросить
              поиск, выбрать все уровни сложности и посмотреть последние попытки целиком.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {rows.map((item) => (
              <div key={item.id} className="rounded-[26px] border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-slate-900">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{formatDate(item.createdAt)} • {item.attackType} • {item.difficulty}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge className="rounded-full px-3 py-1">{item.outcomeLabel}</Badge>
                    <Badge variant="secondary" className="rounded-full px-3 py-1">Риск {item.riskScore}</Badge>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-5">
                  <div className="rounded-2xl bg-white p-4"><p className="text-xs text-slate-500">Действие</p><p className="mt-1 font-medium">{item.actionSummary}</p></div>
                  <div className="rounded-2xl bg-white p-4"><p className="text-xs text-slate-500">Итог</p><p className="mt-1 font-medium">{item.outcomeLabel}</p></div>
                  <div className="rounded-2xl bg-white p-4"><p className="text-xs text-slate-500">Риск</p><p className="mt-1 font-medium">{item.riskScore}%</p></div>
                  <div className="rounded-2xl bg-white p-4"><p className="text-xs text-slate-500">Время до клика</p><p className="mt-1 font-medium">{item.timeToClick}s</p></div>
                  <div className="rounded-2xl bg-white p-4"><p className="text-xs text-slate-500">Время до распознавания</p><p className="mt-1 font-medium">{item.timeToDetect}s</p></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
