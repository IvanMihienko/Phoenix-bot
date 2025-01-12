// Counters.js - Модуль для работы со счётчиками побед
const { InlineKeyboard } = require('grammy');
const { createCountersKeyboard } = require('./keyboard');

/**
 * Создаёт inline клавиатуру для управления счётчиком.
 * @param {string} counterName - Имя счётчика.
 * @param {number} currentValue - Текущее значение счётчика.
 * @returns {InlineKeyboard} Inline-клавиатура.
 */
function createCounterKeyboard(counterName, currentValue) {
    return new InlineKeyboard()
        .text(`-1`, `${counterName}_decrement`).text(`+1`, `${counterName}_increment`).row();
}

/**
 * Проверяет наличие счётчика в базе данных для пользователя.
 * Если счётчика нет, создаёт запись с начальным значением 0.
 * @param {Object} db - Подключение к базе данных.
 * @param {number} telegramId - Telegram ID пользователя.
 * @param {string} counterId - Идентификатор счётчика.
 * @returns {Promise<Object>} Обновлённый или существующий объект пользователя.
 */
async function ensureCounterExists(db, telegramId, counterId) {
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne({ telegramId });

    if (!user) {
        const newUser = {
            telegramId,
            counters: { [counterId]: 0 },
        };
        await usersCollection.insertOne(newUser);
        return newUser;
    }

    if (!user.counters) {
        user.counters = {};
    }

    if (!(counterId in user.counters)) {
        user.counters[counterId] = 0;
        await usersCollection.updateOne(
            { telegramId },
            { $set: { [`counters.${counterId}`]: 0 } }
        );
    }

    return user;
}

/**
 * Обрабатывает нажатия на inline-кнопки счётчиков.
 * @param {Object} ctx - Контекст выполнения команды.
 */
async function handleCounterCallback(ctx) {
    const callbackData = ctx.callbackQuery.data;
    const match = callbackData.match(/(\w+)_(increment|decrement)/);

    if (!match) {
        await ctx.answerCallbackQuery({ text: "Некорректные данные.", show_alert: true });
        return;
    }

    const [_, counterId, action] = match;
    const increment = action === 'increment' ? 1 : -1;

    // Убедиться, что счётчик существует
    const telegramId = ctx.from.id;
    const user = await ensureCounterExists(ctx.db, telegramId, counterId);

    // Обновляем значение счётчика
    const newCount = (user.counters[counterId] || 0) + increment;

    if (newCount < 0) {
        await ctx.answerCallbackQuery({ text: "Счётчик не может быть меньше нуля.", show_alert: true });
        return;
    }

    await ctx.db.collection('users').updateOne(
        { telegramId },
        { $set: { [`counters.${counterId}`]: newCount } }
    );

    await ctx.editMessageText(`Счётчик обновлён: ${newCount}`, {
        reply_markup: createCounterKeyboard(counterId, newCount),
    });

    await ctx.answerCallbackQuery();
}

/**
 * Обрабатывает команду для отображения доступных счётчиков.
 * @param {Object} ctx - Контекст выполнения команды.
 */
async function handleCouners(ctx) {
    await ctx.reply("Вот доступные счётчики:", {
        reply_markup: createCountersKeyboard(),
    });
}

module.exports = {
    createCounterKeyboard,
    ensureCounterExists,
    handleCounterCallback,
    handleCouners,
};
