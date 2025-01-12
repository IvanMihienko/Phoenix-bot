const { Bot } = require('grammy');
const dotenv = require('dotenv');
const { session } = require('grammy');
const { connectToDatabase, closeDatabaseConnection } = require('./db');
const router = require('./routes');
const { handleCallbackQuery } = require('./handlers/callbackQueryHandlers');
const { handleCounterCallback } = require('./counters');
const { STATES } = require('./stateManager');

dotenv.config();

if (!process.env.BOT_TOKEN) {
    console.error('Ошибка: отсутствует BOT_TOKEN в .env файле');
    process.exit(1);
}

// Функция для завершения работы
async function gracefulShutdown(signal, bot) {
    console.log(`Получен сигнал ${signal}. Завершаем работу бота и соединение с MongoDB...`);
    try {
        await bot.stop(); // Остановка бота
        await closeDatabaseConnection();
        console.log('Соединение с MongoDB закрыто. Завершение работы.');
        process.exit(0);
    } catch (error) {
        console.error('Ошибка во время завершения работы:', error);
        process.exit(1);
    }
}

(async () => {
    try {
        // Подключение к базе данных
        const db = await connectToDatabase();

        // Создание экземпляра бота
        const bot = new Bot(process.env.BOT_TOKEN);

        // Middleware для работы с сессиями
        bot.use(session({ initial: () => ({}) }));

        // Middleware для передачи подключения к базе данных в контекст
        bot.use(async (ctx, next) => {
            ctx.db = db;
            if (!ctx.state) {
                const user = await db.collection('users').findOne({ telegramId: ctx.from.id });
                ctx.state = user && user.state ? user.state : STATES.IDLE; // Восстановление состояния из БД или установка IDLE
                console.log(`Начальное состояние для пользователя ${ctx.from.id}: ${ctx.state}`);
            }
            return next();
        });

        // Подключение маршрутов
        bot.use(async (ctx, next) => {
            console.log(`Обработка сообщения: ${ctx.message?.text || 'Нет текста'} от пользователя ${ctx.from?.id || 'Неизвестный'}`);
            return router.middleware()(ctx, next);
        });

        // Обработка callback_query
        bot.on('callback_query:data', async (ctx) => {
            const callbackData = ctx.callbackQuery.data;
            console.log(`Получен callback_query от пользователя ${ctx.from.id}: ${callbackData}`);

            // Проверяем, связано ли callbackQuery с подсчётом
            if (callbackData.match(/_(increment|decrement)/)) {
                console.log(`Обработка callbackQuery для счётчика: ${callbackData}`);
                try {
                    await handleCounterCallback(ctx);
                    console.log(`Обработка callbackQuery успешно завершена: ${callbackData}`);
                } catch (error) {
                    console.error(`Ошибка при обработке callbackQuery для счётчика: ${callbackData}`, error);
                }
                return;
            }

            // Обработка других callbackQuery
            console.log(`Обработка callbackQuery через общий обработчик: ${callbackData}`);
            try {
                await handleCallbackQuery(ctx);
                console.log(`Обработка общего callbackQuery завершена: ${callbackData}`);
            } catch (error) {
                console.error(`Ошибка при обработке общего callbackQuery: ${callbackData}`, error);
            }
        });

        // Обработка ошибок
        bot.catch((err) => {
            const ctx = err.ctx;
            const userInfo = ctx?.from
                ? `Пользователь: ${ctx.from.id} (${ctx.from.username || 'без имени'})`
                : 'Нет информации о пользователе';
            const updateInfo = JSON.stringify(ctx.update, null, 2);
            console.error(`Ошибка при обработке обновления ${ctx.update.update_id}:
Тип ошибки: ${err.error?.name || 'Неизвестная'}
${userInfo}
Детали: ${updateInfo}
Ошибка:`, err.error);
        });

        // Запуск бота
        bot.start();
        console.log('Бот запущен и готов к работе!');

        // Обработка сигналов завершения работы
        process.on('SIGINT', async () => await gracefulShutdown('SIGINT', bot));
        process.on('SIGTERM', async () => await gracefulShutdown('SIGTERM', bot));

    } catch (error) {
        console.error('Ошибка инициализации бота:', error);
        process.exit(1);
    }
})();
