// Обработчики команд и событий бота

// Импортируем необходимые модули и утилиты
const { STATES, isState, setState, resetState, ensureState, isMessageAllowed } = require('./stateManager');
const { createMainKeyboard } = require('./keyboard');
const { handleTestTextMessage, handleTestCompletion } = require('./handlers/testHandlers');
const { handleCallbackQuery } = require('./handlers/callbackQueryHandlers');

/**
 * Универсальная функция проверки коллекции базы данных.
 * @param {Object} ctx - Контекст выполнения команды.
 * @param {string} collectionName - Название коллекции.
 * @returns {Object} Коллекция базы данных.
 */
const getCollection = (ctx, collectionName) => {
    if (!ctx.db) {
        console.error("Ошибка: база данных недоступна.");
        throw new Error("База данных недоступна.");
    }
    const collection = ctx.db.collection(collectionName);
    if (!collection) {
        console.error(`Ошибка: коллекция ${collectionName} недоступна.`);
        throw new Error(`Коллекция ${collectionName} недоступна.`);
    }
    return collection;
};

/**
 * Обрабатывает отправку местоположения пользователем.
 * Проверяет доступность базы данных, извлекает местоположение и сохраняет часовой пояс.
 * @param {Object} ctx - Контекст выполнения команды.
 */
async function handleLocation(ctx) {
    try {
        const telegramId = ctx.from.id;
        const usersCollection = getCollection(ctx, 'users');

        if (!ctx.message.location) {
            await ctx.reply("Не удалось получить местоположение. Попробуйте снова.");
            return;
        }

        const location = ctx.message.location;
        const timeZone = `UTC${Math.round(location.longitude / 15)}`;

        const result = await usersCollection.updateOne(
            { telegramId },
            { $set: { timeZone } },
            { upsert: true }
        );

        if (result.modifiedCount > 0 || result.upsertedCount > 0) {
            console.log(`Местоположение успешно обновлено для пользователя ${telegramId}`);
        }

        setState(ctx, STATES.IDLE);
        await ctx.reply(`Ваш часовой пояс установлен как: ${timeZone}`, {
            reply_markup: createMainKeyboard()
        });
    } catch (error) {
        console.error("Ошибка в handleLocation:", error);
        await ctx.reply("Произошла ошибка при обработке вашего местоположения. Пожалуйста, попробуйте позже.");
    }
}

/**
 * Обрабатывает callback_query или текстовые сообщения от пользователя.
 * @param {Object} ctx - Контекст выполнения команды.
 */
async function handleMessage(ctx) {
    const allowedMessages = {
        [STATES.TESTING]: ["✅ Завершить тест"],
        [STATES.IDLE]: ["/start", "/help"],
    };

    if (!isMessageAllowed(ctx, allowedMessages)) {
        await ctx.reply("Это сообщение не поддерживается в текущем состоянии.");
        return;
    }

    if (isState(ctx, STATES.TESTING)) {
        if (ctx.message?.text === "✅ Завершить тест") {
            await handleTestCompletion(ctx);
        } else {
            await handleTestTextMessage(ctx);
        }
    } else {
        console.log("Неизвестное сообщение", {
            messageText: ctx.message?.text,
        });
        await ctx.reply("Неизвестное действие или команда.", {
            reply_markup: createMainKeyboard()
        });
    }
}

/**
 * Обрабатывает команду /start.
 * Проверяет, зарегистрирован ли пользователь, и перенаправляет его в нужное состояние.
 * @param {Object} ctx - Контекст выполнения команды.
 */
async function handleStart(ctx) {
    try {
        const telegramId = ctx.from.id;
        const usersCollection = getCollection(ctx, 'users');
        const user = await usersCollection.findOne({ telegramId });

        if (!user) {
            console.log(`Создаётся новый пользователь: ${telegramId}`);
            await usersCollection.insertOne({
                telegramId,
                username: ctx.from.username || null,
                firstName: ctx.from.first_name || "Не указано",
                lastName: ctx.from.last_name || "Не указано",
                timeZone: null,
            });
            setState(ctx, STATES.REGISTRATION);
            await ctx.reply("Добро пожаловать! Пожалуйста, отправьте своё местоположение.");
        } else {
            console.log(`Пользователь найден: ${telegramId}`);
            setState(ctx, STATES.IDLE);
            await ctx.reply("Вы уже зарегистрированы!", {
                reply_markup: createMainKeyboard(),
            });
        }
    } catch (error) {
        console.error("Ошибка в handleStart:", error);
        await ctx.reply("Произошла ошибка при выполнении команды. Пожалуйста, попробуйте позже.");
    }
}

/**
 * Обрабатывает неизвестные команды.
 * Отправляет сообщение с доступными командами.
 * @param {Object} ctx - Контекст выполнения команды.
 */
async function handleUnknownCommand(ctx) {
    await ctx.reply("Извините, я не понимаю эту команду. Вот доступные команды:", {
        reply_markup: createMainKeyboard(),
    });
}

/**
 * Обрабатывает команду /help.
 * Отправляет список доступных команд пользователю.
 * @param {Object} ctx - Контекст выполнения команды.
 */
async function handleHelp(ctx) {
    await ctx.reply("Доступные команды:\n/start - Начать\n/help - Помощь");
}

/**
 * Обрабатывает команду для отображения доступных заданий.
 * @param {Object} ctx - Контекст выполнения команды.
 */
async function handleTasks(ctx) {
    await ctx.reply("Список доступных заданий:\n1. Завершите тест.\n2. Проверьте свой профиль.", {
        reply_markup: createMainKeyboard(),
    });
}

/**
 * Middleware для проверки доступности действий в зависимости от состояния пользователя.
 * @param {Array} allowedStates - Список допустимых состояний для выполнения действия.
 * @returns {Function} Middleware для выполнения проверки.
 */
const stateMiddleware = (allowedStates) => async (ctx, next) => {
    if (!(await ensureState(ctx, allowedStates))) return;
    await next();
};

// Экспортируем обработчики и middleware
module.exports = {
    handleLocation,
    handleCallbackQuery,
    handleMessage,
    handleStart,
    handleUnknownCommand,
    handleHelp,
    handleTasks,
    stateMiddleware,
    getCollection,
};
