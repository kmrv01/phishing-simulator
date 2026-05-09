export const outcomeLabels = {
  detectedWithoutInteraction: "Обнаружено без взаимодействия",
  reportedCorrectly: "Сообщил корректно",
  falseAlarm: "Ложная тревога",
  safeCompleted: "Безопасный сценарий завершен",
  clickOnly: "Только клик",
  passwordSubmitted: "Отправлен пароль",
  passwordAnd2FA: "Отправлены пароль и 2FA",
};

export function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

export function safePercent(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

export function calculateRiskScore({
  clickRate = 0,
  credentialSubmissionRate = 0,
  twoFASubmissionRate = 0,
  repeatOffenderPenalty = 0,
}) {
  const weighted =
    clickRate * 0.25 +
    credentialSubmissionRate * 0.35 +
    twoFASubmissionRate * 0.2 +
    repeatOffenderPenalty * 0.2;
  return clamp(Math.round(weighted));
}

export function getRiskStatus(score) {
  if (score >= 70) return { label: "Высокий риск", variant: "destructive" };
  if (score >= 40) return { label: "Средний риск", variant: "secondary" };
  return { label: "Низкий риск", variant: "default" };
}

export function buildRiskMetrics(attempts) {
  const total = attempts.length;
  const clicked = attempts.filter((item) => item.clicked).length;
  const credentialSubmitted = attempts.filter((item) => item.passwordSubmitted).length;
  const twoFASubmitted = attempts.filter((item) => item.twoFASubmitted).length;
  const reported = attempts.filter((item) => item.reportedCorrectly).length;
  const detected = attempts.filter((item) => item.detectedWithoutInteraction).length;
  const avgTimeToClick = clicked
    ? Math.round(
        attempts.filter((item) => item.clicked).reduce((sum, item) => sum + item.timeToClick, 0) /
          clicked
      )
    : 0;
  const avgTimeToDetect = detected
    ? Math.round(
        attempts
          .filter((item) => item.detectedWithoutInteraction)
          .reduce((sum, item) => sum + item.timeToDetect, 0) / detected
      )
    : 0;
  const repeatOffenderPenalty = clamp(attempts.filter((item) => item.riskScore >= 70).length * 10);
  const clickRate = safePercent(clicked, total);
  const credentialSubmissionRate = safePercent(credentialSubmitted, total);
  const twoFASubmissionRate = safePercent(twoFASubmitted, total);
  const reportRate = safePercent(reported, total);
  const riskScore = calculateRiskScore({
    clickRate,
    credentialSubmissionRate,
    twoFASubmissionRate,
    repeatOffenderPenalty,
  });

  return {
    totalScenariosCompleted: total,
    clickRate,
    credentialSubmissionRate,
    twoFASubmissionRate,
    reportRate,
    avgTimeToClick,
    avgTimeToDetect,
    repeatOffenderPenalty,
    phishingDetected: detected,
    riskScore,
    riskStatus: getRiskStatus(riskScore),
  };
}

export function buildAttackTypeStats(attempts) {
  const grouped = new Map();

  attempts.forEach((item) => {
    if (!grouped.has(item.attackType)) {
      grouped.set(item.attackType, { attackType: item.attackType, detected: 0, failed: 0 });
    }
    const bucket = grouped.get(item.attackType);
    if (item.reportedCorrectly || item.detectedWithoutInteraction) bucket.detected += 1;
    else bucket.failed += 1;
  });

  return Array.from(grouped.values());
}

export function buildProgressSeries(attempts) {
  return attempts.slice(-10).map((item, index) => ({
    attempt: index + 1,
    riskScore: item.riskScore,
  }));
}

export function buildOutcomeBreakdown(attempts) {
  const detected = attempts.filter((item) => item.reportedCorrectly || item.detectedWithoutInteraction).length;
  const clicked = attempts.filter((item) => item.clicked && !item.passwordSubmitted && !item.twoFASubmitted).length;
  const submitted = attempts.filter((item) => item.passwordSubmitted || item.twoFASubmitted).length;

  return [
    { name: "Распознано", value: detected },
    { name: "Переходы", value: clicked },
    { name: "Отправка данных", value: submitted },
  ];
}

export function buildBehaviorProfile(attempts) {
  const metrics = buildRiskMetrics(attempts);
  if (metrics.riskScore >= 70 || metrics.credentialSubmissionRate >= 35 || metrics.twoFASubmissionRate >= 20) {
    return {
      label: "Уязвимый",
      tone: "destructive",
      description: "Ваш профиль: уязвимый пользователь",
      recommendation: "Рекомендация: пройти обучение и повторить симуляции с разбором ошибок.",
    };
  }
  if (metrics.riskScore >= 35 || metrics.clickRate >= 30) {
    return {
      label: "Невнимательный",
      tone: "secondary",
      description: "Ваш профиль: невнимательный пользователь",
      recommendation: "Рекомендация: уделять больше времени проверке sender, URL и flow входа.",
    };
  }
  return {
    label: "Осторожный",
    tone: "default",
    description: "Ваш профиль: осторожный пользователь",
    recommendation: "Рекомендация: сохранить текущий уровень внимательности и поддерживать навык.",
  };
}

export function buildGamificationStats(attempts) {
  const score = attempts.reduce((sum, item) => sum + (item.scoreDelta || 0), 0);
  let streak = 0;
  const latest = attempts.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  for (const item of latest) {
    if (item.correctDecision) streak += 1;
    else break;
  }

  const level = score >= 1800 ? "Advanced" : score >= 800 ? "Intermediate" : "Beginner";
  return { score, streak, level };
}

export function buildMistakeInsights(attempts) {
  const buckets = [
    {
      id: "fast_click",
      title: "Слишком быстрый переход по ссылке",
      count: attempts.filter((item) => item.clicked && item.timeToClick > 0 && item.timeToClick < 2).length,
      why: "Быстрый клик обычно означает, что письмо и URL не были проверены.",
      training:
        "Перед переходом тратьте хотя бы несколько секунд на sender, домен и смысл запроса.",
    },
    {
      id: "password_submission",
      title: "Ввод пароля на подозрительном ресурсе",
      count: attempts.filter((item) => item.passwordSubmitted).length,
      why: "Передача пароля на поддельный лендинг напрямую ведет к компрометации аккаунта.",
      training:
        "Проверяйте домен и не вводите пароль после перехода из сомнительного письма.",
    },
    {
      id: "twofa_submission",
      title: "Передача кода 2FA",
      count: attempts.filter((item) => item.twoFASubmitted).length,
      why: "Даже при включенном MFA злоумышленник может завершить вход, если получил код подтверждения.",
      training:
        "Код 2FA вводите только после проверки официального домена и нормального flow входа.",
    },
    {
      id: "report_missed",
      title: "Пропущенная возможность сообщить о фишинге",
      count: attempts.filter((item) => !item.reportedCorrectly && !item.detectedWithoutInteraction && item.riskScore >= 40).length,
      why: "Если не сообщать о подозрительных письмах, атака может повториться для других сотрудников.",
      training:
        "При сомнении используйте кнопку сообщения о фишинге вместо взаимодействия с письмом.",
    },
    {
      id: "safe_false_alarm",
      title: "Ложная тревога на безопасном сценарии",
      count: attempts.filter((item) => item.isSafeScenario && item.falseAlarm).length,
      why: "Важно не только находить фишинг, но и уверенно различать нормальные рабочие сценарии.",
      training:
        "Смотрите на совокупность признаков: официальный домен, ожидаемый sender и пошаговый 2FA flow.",
    },
  ];

  const topMistakes = buckets.filter((item) => item.count > 0).sort((a, b) => b.count - a.count);

  return {
    totalMistakes: topMistakes.reduce((sum, item) => sum + item.count, 0),
    topMistakes,
    focusArea: topMistakes[0]?.title || "Ошибки пока не выявлены",
  };
}

export function buildAchievementStats(attempts) {
  const gamification = buildGamificationStats(attempts);
  const detectedWithoutClick = attempts.filter((item) => item.detectedWithoutInteraction).length;
  const examSessions = new Map();

  attempts.forEach((item) => {
    if (!item.examMode || !item.examSessionId) return;
    if (!examSessions.has(item.examSessionId)) {
      examSessions.set(item.examSessionId, { total: 0, correct: 0 });
    }
    const session = examSessions.get(item.examSessionId);
    session.total += 1;
    if (item.correctDecision) session.correct += 1;
  });

  const passedExam = Array.from(examSessions.values()).some(
    (session) => session.total >= 10 && session.correct >= 8
  );

  return [
    {
      id: "streak",
      title: "Серия внимательности",
      unlocked: gamification.streak >= 3,
      hint: "Открывается за 3 правильных решения подряд.",
      detail: gamification.streak >= 3 ? `Текущая серия: ${gamification.streak}` : `Сейчас: ${gamification.streak} из 3`,
    },
    {
      id: "no_click_detect",
      title: "Обнаружение без клика",
      unlocked: detectedWithoutClick >= 3,
      hint: "Открывается, если пользователь 3 раза распознал фишинг до перехода по ссылке.",
      detail: detectedWithoutClick >= 3 ? `Распознано без клика: ${detectedWithoutClick}` : `Сейчас: ${detectedWithoutClick} из 3`,
    },
    {
      id: "exam_pass",
      title: "Успешное тестирование",
      unlocked: passedExam,
      hint: "Открывается за успешную сдачу тестирования: минимум 8 правильных ответов из 10.",
      detail: passedExam ? "Тестирование успешно пройдено" : "Тестирование еще не пройдено",
    },
  ];
}
