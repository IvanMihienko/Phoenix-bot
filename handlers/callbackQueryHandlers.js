// Обработчики callback_query

const { STATES, setState, isState } = require('../stateManager');
const { createMainKeyboard } = require('../keyboard');

// Объект маршрутов для callback_query
const callbackHandlers = {
    end_test: async (ctx) => {
        // Завершаем тест и сбрасываем состояние
        delete ctx.session.currentTest;
        resetState(ctx);

        await ctx.reply("Тест был завершён. Возвращаем вас в главное меню.", {
            reply_markup: createMainKeyboard()
        });
    },
};

/**
 * Универсальный обработчик callback_query.
 * @param {Object} ctx - Контекст выполнения команды.
 */
async function handleCallbackQuery(ctx) {
    try {
        const callbackData = ctx.callbackQuery.data;

        if (callbackHandlers[callbackData]) {
            console.log(`Обработка callback_query: ${callbackData} от пользователя ${ctx.from.id}`);
            await callbackHandlers[callbackData](ctx);
        } else {
            console.log(`Неизвестный callback_query: ${callbackData} от пользователя ${ctx.from.id}`);
            await ctx.answerCallbackQuery({ text: "Неизвестное действие.", show_alert: true });
        }
    } catch (error) {
        console.error("Ошибка при обработке callback_query:", error);
        await ctx.answerCallbackQuery({ text: "Произошла ошибка при обработке действия.", show_alert: true });
    }
}

module.exports = {
    handleCallbackQuery,
};
