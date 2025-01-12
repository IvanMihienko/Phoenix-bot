const { Router } = require('@grammyjs/router');
const { STATES, stateFilterMiddleware } = require('./stateManager');
const { createMainKeyboard, createCountersKeyboard, loadCounters } = require('./keyboard');
const { handleStart, sendUserProfile, handleLocation } = require('./handlers/userHandlers');
const { editOrReply, handleTasks, handleSettings, handleBackToMenu, handleAchievements, handleRating } = require('./handlers/generalHandlers');
const { handlePoll, handleAnswer, handleTestCompletion, loadAndStartTest } = require('./handlers/testHandlers');
const { getTestFiles } = require('./getTestFiles');
const { handleCounterCallback, ensureCounterExists, handleCouners, createCounterKeyboard } = require('./counters');
const path = require('path');
const fs = require('fs');

// Центральная конфигурация маршрутов для каждого состояния
const stateRoutes = {
    IDLE: {
        start: { command: '/start', handler: handleStart },
        profile: { text: '📋 Профиль', handler: sendUserProfile },
        tasks: { text: '🗂 Задания', handler: handleTasks },
        settings: { text: '⚙️ Настройка', handler: handleSettings },
        toprofile: { text: '⬅️ Назад в профиль', handler: sendUserProfile },
        backtomenu: { text: '🏠 Назад в меню', handler: handleBackToMenu },
        achievements: { text: '🏆 Достижения', handler: handleAchievements },
        rating: { text: '📊 Рейтинг', handler: handleRating },
        poll: { text: '📊 Пройти опрос', handler: handlePoll },
        counters: { text: '🧮 Счётчик Побед', handler: handleCouners },
    },
    TESTING: {
        completeTest: { text: '✅ Завершить тест', handler: handleTestCompletion },
        start: { command: '/start', handler: handleTestCompletion },
    },
    REGISTRATION: {
        start: { command: '/start', handler: handleStart },
    },
};

// Загрузка счётчиков из JSON-файла
const countersRoutes = loadCounters();

countersRoutes.forEach(({ name, id }) => {
    stateRoutes.IDLE[id] = {
        text: name,
        handler: async (ctx) => {
            const user = await ensureCounterExists(ctx.db, ctx.from.id, id);
            const currentValue = user.counters[id] || 0;
            await ctx.reply(`Счётчик "${name}": ${currentValue}`, {
                reply_markup: createCounterKeyboard(id, currentValue),
            });
        },
    };
});

// Динамическое добавление маршрутов для тестов
getTestFiles().forEach((testName) => {
    if (!stateRoutes.IDLE) stateRoutes.IDLE = {};
    stateRoutes.IDLE[testName] = {
        text: testName,
        handler: async (ctx) => {
            console.log(`Запуск теста: ${testName}`);
            await loadAndStartTest(ctx, testName);
        },
    };
});

// Инициализация маршрутизатора
const router = new Router((ctx) => {
    const messageText = ctx.message?.text;
    const userState = ctx.session?.state || 'IDLE';

    console.log(`Получено сообщение: "${messageText}" в состоянии: "${userState}"`);

    const stateConfig = stateRoutes[userState];
    if (stateConfig) {
        for (const [key, route] of Object.entries(stateConfig)) {
            if (
                (route.command && messageText === route.command) ||
                (route.text && messageText === route.text)
            ) {
                console.log(`Маршрут найден: ${key}`);
                return key;
            }
        }
    }

    console.log(`Маршрут не найден для сообщения: "${messageText}"`);
    return 'unknown';
});

// Регистрация обработчиков маршрутов для каждого состояния
Object.entries(stateRoutes).forEach(([state, routes]) => {
    Object.entries(routes).forEach(([key, route]) => {
        router.route(key, stateFilterMiddleware(), async (ctx) => {
            console.log(`Вызов обработчика для маршрута: ${key}`);
            if (typeof route.handler === 'function') {
                try {
                    await route.handler(ctx);
                    console.log(`Обработчик ${key} успешно выполнен.`);
                } catch (error) {
                    console.error(`Ошибка в обработчике для маршрута ${key}:`, error);
                    await editOrReply(ctx, 'Произошла ошибка при обработке вашего запроса.', {
                        reply_markup: createMainKeyboard(),
                    });
                }
            } else {
                console.error(`Ошибка: Обработчик для маршрута ${key} не является функцией.`);
                await editOrReply(ctx, 'Произошла ошибка. Попробуйте снова позже.', {
                    reply_markup: createMainKeyboard(),
                });
            }
        });
    });
});

// Обработка callback_query в router.otherwise
router.otherwise(stateFilterMiddleware(), async (ctx) => {
    const telegramId = ctx.from?.id;
    const userState = ctx.session?.state || 'IDLE';

    console.log(`Обработка неизвестного сообщения от пользователя ${ctx.from?.id || 'неизвестный'} в состоянии: ${userState}`);


    // Обработка состояния REGISTRATION
    if (userState === 'REGISTRATION') {
        console.log(`Обработка локации или неизвестного сообщения в состоянии REGISTRATION для пользователя ${telegramId}`);
        await handleLocation(ctx);
        return;
    }

  // Обработка состояния IDLE
    if (userState === 'IDLE' && ctx.message?.location) {
        console.log(`Обработка локации для пользователя ${telegramId} в состоянии IDLE`);
        await handleLocation(ctx);
        return;
    }
    if (userState === 'IDLE' && ctx.callbackQuery) {
        console.log(`Обработка callback_query: ${ctx.callbackQuery.data} для пользователя ${ctx.from?.id}`);
        await handleCounterCallback(ctx);
        return;
    }

    // Обработка состояния TESTING
    if (userState === 'TESTING') {
        console.log('Сообщение обработано как ввод для тестирования.');
        await handleAnswer(ctx);
        return;
    }

    // Универсальная обработка для всех других состояний
    await ctx.reply('Сообщение не распознано. Выберите действие из меню.', {
        reply_markup: createMainKeyboard(),
    });
});


module.exports = router;
