import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function extractOutputText(payload) {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text;
  }

  const outputItems = Array.isArray(payload?.output) ? payload.output : [];
  for (const outputItem of outputItems) {
    const contentItems = Array.isArray(outputItem?.content) ? outputItem.content : [];
    for (const contentItem of contentItems) {
      if (typeof contentItem?.text === "string" && contentItem.text.trim()) {
        return contentItem.text;
      }
    }
  }

  return "";
}

function buildOpenAiRequest(url, model) {
  return {
    model,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text:
              "Ты анализируешь только URL как эксперт по phishing detection. " +
              "Оцени ссылку по структуре домена, поддоменам, query string, брендовым подменам, бесплатному хостингу и вероятности фишинга. " +
              "Не выдумывай внешнюю репутацию сайта и не ссылайся на базы, к которым у тебя нет доступа. " +
              "Если вывод строится только на структуре URL, скажи это прямо.",
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text:
              `Проанализируй URL: ${url}\n` +
              "Верни только структурированный JSON на русском языке. " +
              "Определи риск фишинга по одной только ссылке.",
          },
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "url_ai_analysis",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            score: { type: "integer", minimum: 0, maximum: 100 },
            risk: { type: "string", enum: ["low", "medium", "high"] },
            verdict: { type: "string" },
            summary: { type: "string" },
            confidence: { type: "integer", minimum: 0, maximum: 100 },
            indicators: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  title: { type: "string" },
                  severity: { type: "string", enum: ["low", "medium", "high"] },
                  detail: { type: "string" },
                },
                required: ["title", "severity", "detail"],
              },
            },
          },
          required: ["score", "risk", "verdict", "summary", "confidence", "indicators"],
        },
      },
    },
  };
}

function buildAiUrlAnalyzerPlugin(env) {
  const apiKey = env.OPENAI_API_KEY;
  const model = env.OPENAI_URL_ANALYZER_MODEL || "gpt-4.1-mini";

  return {
    name: "ai-url-analyzer-endpoint",
    configureServer(server) {
      server.middlewares.use("/api/ai-url-analysis", async (req, res, next) => {
        if (req.method !== "POST") {
          return next();
        }

        if (!apiKey) {
          return sendJson(res, 503, {
            error: "AI-анализ не настроен: задайте OPENAI_API_KEY в .env.local",
            configured: false,
            code: "missing_api_key",
          });
        }

        try {
          const body = await readJsonBody(req);
          const url = String(body?.url || "").trim();

          if (!url) {
            return sendJson(res, 400, {
              error: "Нужно передать URL для анализа.",
              configured: true,
              code: "missing_url",
            });
          }

          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 25000);

          const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(buildOpenAiRequest(url, model)),
            signal: controller.signal,
          }).finally(() => clearTimeout(timeout));

          const payload = await openaiResponse.json().catch(() => ({}));

          if (!openaiResponse.ok) {
            return sendJson(res, openaiResponse.status, {
              error: payload?.error?.message || "OpenAI request failed",
              configured: true,
              provider: "openai",
              model,
              code: payload?.error?.code || "openai_error",
            });
          }

          const outputText = extractOutputText(payload);
          if (!outputText) {
            return sendJson(res, 502, {
              error: "Модель не вернула текстовый результат для разбора.",
              configured: true,
              provider: "openai",
              model,
              code: "empty_model_output",
            });
          }

          let parsed;
          try {
            parsed = JSON.parse(outputText);
          } catch {
            return sendJson(res, 502, {
              error: "Не удалось разобрать структурированный ответ модели.",
              configured: true,
              provider: "openai",
              model,
              rawOutput: outputText,
              code: "invalid_model_json",
            });
          }

          return sendJson(res, 200, {
            configured: true,
            provider: "openai",
            model,
            source: "openai-responses-api",
            ...parsed,
          });
        } catch (error) {
          const isAbort = error?.name === "AbortError";
          return sendJson(res, 500, {
            error: isAbort
              ? "AI-анализ не успел получить ответ от модели вовремя."
              : error instanceof Error
                ? error.message
                : "Unknown AI analysis error",
            configured: Boolean(apiKey),
            code: isAbort ? "request_timeout" : "unknown_ai_error",
          });
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react(), buildAiUrlAnalyzerPlugin(env)],
    server: {
      proxy: {
        "/db-api": {
          target: env.VITE_API_URL || "http://127.0.0.1:4000",
          changeOrigin: true,
        },
      },
    },
    resolve: {
      alias: [
        {
          find: "@",
          replacement: path.resolve(__dirname, "src"),
        },
        {
          find: /^@\//,
          replacement: `${path.resolve(__dirname, "src")}/`,
        },
      ],
    },
  };
});
