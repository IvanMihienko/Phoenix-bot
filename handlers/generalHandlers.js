const { createMainKeyboard, createProfileKeyboard, createSettingsKeyboard, createLocationButton, createTestCompletionKeyboard, createListTestKeyboard } = require('../keyboard');

/**
 * Отправляет сообщение или редактирует существующее, если это callback_query.
 * @param {Object} ctx - Контекст выполнения команды.
 * @param {string} text - Текст сообщения.
 * @param {Object} options - Опции для отправки или редактирования сообщения.
 */
async function editOrReply(ctx, text, options) {
    if (ctx.callbackQuery) {
        try {
            await ctx.editMessageText(text, options);
        } catch (error) {
            await ctx.reply(text, options);
        }
    } else {
        await ctx.reply(text, options);
    }
}

/**
 * Форматирует здоровье пользователя для отображения.
 * @param {number} health - Количество здоровья (от 0 до 4).
 * @returns {string} Графическое отображение здоровья.
 */
function renderHealth(health) {
    const fullHeart = '❤️';
    const emptyHeart = '🖤';
    return fullHeart.repeat(health) + emptyHeart.repeat(4 - health);
}

/**
 * Форматирует сообщение для ошибок.
 * @param {string} errorMessage - Текст ошибки.
 * @returns {string} Форматированное сообщение.
 */
function formatErrorMessage(errorMessage) {
    return `❌ Ошибка: ${errorMessage}`;
}

/**
 * Универсальная обработка ошибок в асинхронных функциях.
 * @param {Function} fn - Асинхронная функция.
 * @returns {Function} Обертка с обработкой ошибок.
 */
function withErrorHandling(fn) {
    return async (ctx, ...args) => {
        try {
            await fn(ctx, ...args);
        } catch (error) {
            console.error('Ошибка в обработчике:', error);
            await ctx.reply(formatErrorMessage('Произошла непредвиденная ошибка. Пожалуйста, попробуйте позже.'));
        }
    };
}

/**
 * Обрабатывает задачу "Список заданий".
 * @param {Object} ctx - Контекст выполнения команды.
 */
async function handleTasks(ctx) {
    await editOrReply(ctx, 'Список доступных заданий:', {
        reply_markup: createMainKeyboard(),
    });
}

/**
 * Обрабатывает задачу "Настройки".
 * @param {Object} ctx - Контекст выполнения команды.
 */
async function handleSettings(ctx) {
    await editOrReply(ctx, 'Настройки:', {
        reply_markup: createSettingsKeyboard(),
    });
}

/**
 * Обрабатывает переход "Назад в меню".
 * @param {Object} ctx - Контекст выполнения команды.
 */
async function handleBackToMenu(ctx) {
    await editOrReply(ctx, 'Возвращаемся в главное меню:', {
        reply_markup: createMainKeyboard(),
    });
}

/**
 * Обрабатывает достижение.
 * @param {Object} ctx - Контекст выполнения команды.
 */
async function handleAchievements(ctx) {
    await editOrReply(ctx, 'Ваши достижения:', {
        reply_markup: createProfileKeyboard(),
    });
}

/**
 * Обрабатывает рейтинг.
 * @param {Object} ctx - Контекст выполнения команды.
 */
async function handleRating(ctx) {
    await editOrReply(ctx, 'Текущий рейтинг:', {
        reply_markup: createProfileKeyboard(),
    });
}

module.exports = {
    editOrReply,
    renderHealth,
    formatErrorMessage,
    withErrorHandling,
    handleTasks,
    handleSettings,
    handleBackToMenu,
    handleAchievements,
    handleRating,
};
