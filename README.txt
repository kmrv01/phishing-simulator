1. Откройте папку проекта в VS Code.
2. В терминале выполните:

npm install
npm run dev

3. Откройте в браузере:
http://localhost:5173

Вход администратора:
admin@phishguard.kz
admin123

AI-анализ ссылок:
1. Скопируйте `.env.example` в `.env.local`
2. Укажите `OPENAI_API_KEY`
3. При необходимости смените модель через `OPENAI_URL_ANALYZER_MODEL`
4. Перезапустите `npm run dev`

Без `OPENAI_API_KEY` модуль проверки ссылок работает только на локальной эвристике.
