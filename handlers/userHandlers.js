const { STATES, setState } = require('../stateManager');
const { createMainKeyboard, createLocationButton, createProfileKeyboard } = require('../keyboard');
const { renderHealth } = require('./generalHandlers');

/**
 * Обрабатывает команду /start для регистрации или авторизации пользователя.
 * @param {Object} ctx - Контекст выполнения команды.
 */
async function handleStart(ctx) {
    const telegramId = ctx.from.id;
    const usersCollection = ctx.db.collection('users');
    const user = await usersCollection.findOne({ telegramId });

    if (!user) {
        console.log("Новый пользователь");

        const newUser = {
            telegramId,
            username: ctx.from.username || null,
            firstName: ctx.from.first_name || "Не указано",
            lastName: ctx.from.last_name || "Не указано",
            health: 4,
            timeZone: null,
            achievements: [],
            tasksCompleted: 0,
            experience: 0,
        };

        await usersCollection.insertOne(newUser);
        console.log(`Пользователь ${newUser.telegramId} успешно создан.`);

        await ctx.reply("Добро пожаловать в игру Феникс!");
        setState(ctx, 'REGISTRATION'); // Указываем явное состояние
        await requestLocation(ctx);
        return;
    }

    if (!user.timeZone) {
        console.log("Пользователь не указал местоположение");
        setState(ctx, 'REGISTRATION'); // Указываем явное состояние
        await requestLocation(ctx);
        return;
    }

    console.log("Пользователь зарегистрирован");
    setState(ctx, 'IDLE'); // Указываем явное состояние
    await sendUserProfile(ctx);
}

/**
 * Отправляет профиль пользователя.
 * @param {Object} ctx - Контекст выполнения команды.
 */
async function sendUserProfile(ctx) {
    const telegramId = ctx.from.id;
    const usersCollection = ctx.db.collection('users');
    const user = await usersCollection.findOne({ telegramId });

    if (!user) {
        console.error(`Пользователь с telegramId ${telegramId} не найден в базе данных.`);
        await ctx.reply("Ваш профиль не найден. Пожалуйста, используйте /start для регистрации.", {
            reply_markup: createMainKeyboard(),
        });
        return;
    }

    const profileMessage = `Ваш профиль:\n- Имя пользователя: ${user.firstName || "Не указано"} ${user.lastName || "Не указано"}\n- Часовой пояс: ${user.timeZone || "Не указан"}\n- Здоровье: ${renderHealth(user.health || 0)}\n- Уровень: ${Math.floor((user.experience || 0) / 1000)}\n- Опыт: ${user.experience || 0}\n- Достижения: ${user.achievements?.length || 0}\n- Выполнено заданий: ${user.tasksCompleted || 0}`;

    await ctx.reply(profileMessage, {
        reply_markup: createProfileKeyboard(),
    });
}

/**
 * Обрабатывает отправку местоположения пользователем.
 * @param {Object} ctx - Контекст выполнения команды.
 */
async function handleLocation(ctx) {
    const telegramId = ctx.from.id;
    const usersCollection = ctx.db.collection('users');

    if (!ctx.message.location) {
        console.error(`Пользователь с telegramId ${telegramId} не найден в базе данных.`);
            await ctx.reply("Ваш профиль не найден. Пожалуйста, используйте /start для регистрации.", {
                reply_markup: { remove_keyboard: true },
            });
        return;
    }

    const location = ctx.message.location;
    const timeZone = `UTC${Math.round(location.longitude / 15)}`;

    const result = await usersCollection.updateOne(
        { telegramId },
        { $set: { timeZone } }
    );

    if (result.modifiedCount > 0 || result.upsertedCount > 0) {
        console.log(`Часовой пояс успешно обновлён для пользователя ${telegramId}`);
    }

    setState(ctx, 'IDLE'); // Указываем явное состояние
    await ctx.reply(`Ваш часовой пояс установлен как: ${timeZone}`, {
        reply_markup: createMainKeyboard(),
    });
}

/**
 * Запрашивает местоположение у пользователя.
 * @param {Object} ctx - Контекст выполнения команды.
 */
async function requestLocation(ctx) {
    await ctx.reply("Пожалуйста, отправьте своё местоположение, чтобы продолжить.", {
        reply_markup: createLocationButton(),
    });
}

module.exports = {
    handleStart,
    handleLocation,
    requestLocation,
    sendUserProfile
};
