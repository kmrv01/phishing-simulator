import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

const PIE_COLORS = ["#38bdf8", "#f59e0b", "#ef4444"];

export function ChartsPanel({ progressData, attackTypeData, outcomeData }) {
  return (
    <div className="grid gap-5 xl:grid-cols-3">
      <Card className="rounded-[28px] border border-white/10 bg-slate-950 text-white shadow-xl xl:col-span-2">
        <CardHeader className="p-6">
          <CardTitle className="text-xl">Прогресс по последним попыткам</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] p-6 pt-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={progressData}>
              <CartesianGrid stroke="rgba(148,163,184,0.18)" vertical={false} />
              <XAxis dataKey="attempt" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" domain={[0, 100]} />
              <Tooltip />
              <Line type="monotone" dataKey="riskScore" stroke="#fbbf24" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="rounded-[28px] border border-slate-200 bg-white shadow-lg">
        <CardHeader className="p-6">
          <CardTitle className="text-xl">Распознано / переходы / отправка данных</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] p-6 pt-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={outcomeData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={92} paddingAngle={3}>
                {outcomeData.map((entry, index) => (
                  <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="rounded-[28px] border border-slate-200 bg-white shadow-lg xl:col-span-3">
        <CardHeader className="p-6">
          <CardTitle className="text-xl">Результаты по типам атак</CardTitle>
        </CardHeader>
        <CardContent className="h-[340px] p-6 pt-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={attackTypeData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="attackType" stroke="#64748b" angle={-8} textAnchor="end" height={70} interval={0} />
              <YAxis stroke="#64748b" />
              <Tooltip />
              <Legend />
              <Bar dataKey="detected" fill="#10b981" radius={[8, 8, 0, 0]} />
              <Bar dataKey="failed" fill="#ef4444" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
