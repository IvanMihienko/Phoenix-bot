const { createMainKeyboard } = require('./keyboard');

const STATES = new Map([
    ['IDLE', { name: 'IDLE', allowedMessageTypes: ['text', 'location'] }],
    ['TESTING', { name: 'TESTING', allowedMessageTypes: ['text', 'callback_query'] }],
    ['REGISTRATION', { name: 'REGISTRATION', allowedMessageTypes: ['text', 'location', 'photo'] }],
]);

/**
 * Устанавливает состояние для текущего пользователя.
 * @param {Object} ctx - Контекст выполнения команды.
 * @param {string|Object} newState - Новое состояние.
 */
function setState(ctx, newState) {
    const stateName = typeof newState === 'string' ? newState : newState?.name;
    if (!stateName || !STATES.has(stateName)) {
        console.error(`setState: Некорректное состояние "${stateName}". Доступные состояния: ${Array.from(STATES.keys())}`);
        return;
    }

    console.log(`setState: Устанавливаем состояние "${stateName}" для пользователя ${ctx.from?.id}`);
    if (!ctx.session) {
        ctx.session = {}; // Инициализация сессии, если её нет
    }
    ctx.session.state = stateName; // Устанавливаем новое состояние как строку
}

/**
 * Проверяет, разрешён ли тип сообщения в текущем состоянии.
 * @param {Object} ctx - Контекст выполнения команды.
 * @returns {boolean} Возвращает true, если тип сообщения разрешён.
 */
function isAllowedMessageType(ctx) {
    const currentState = ctx.session?.state || 'IDLE';
    const messageType = ctx.message?.text
        ? 'text'
        : ctx.message?.location
        ? 'location'
        : ctx.message?.photo
        ? 'photo'
        : ctx.callbackQuery
        ? 'callback_query'
        : 'unknown';

    console.log(`isAllowedMessageType: Проверяем тип сообщения "${messageType}" в состоянии "${currentState}"`);

    const stateConfig = STATES.get(currentState);
    if (!stateConfig) {
        console.error(`isAllowedMessageType: Конфигурация состояния "${currentState}" не найдена.`);
        return false;
    }

    return stateConfig.allowedMessageTypes.includes(messageType); // Проверяем, разрешён ли тип сообщения
}

/**
 * Middleware для фильтрации сообщений на основе состояния пользователя.
 */
function stateFilterMiddleware() {
    return async (ctx, next) => {
        const currentState = ctx.session?.state || 'IDLE';
        const messageType = ctx.message?.text
        ? 'text'
        : ctx.message?.location
        ? 'location'
        : ctx.message?.photo
        ? 'photo'
        : ctx.callbackQuery
        ? 'callback_query'
        : 'unknown';

        console.log(`stateFilterMiddleware: Проверка сообщения типа "${messageType}" в состоянии "${currentState}"`);

        const stateConfig = STATES.get(currentState);

        if (!stateConfig) {
            console.error(`stateFilterMiddleware: Неизвестное состояние "${currentState}". Сбрасываем на IDLE.`);
            setState(ctx, 'IDLE');
            await ctx.reply('Ваше состояние недействительно. Возвращаем в главное меню.', {
                reply_markup: createMainKeyboard(),
            });
            return;
        }

        if (!stateConfig.allowedMessageTypes.includes(messageType)) {
            console.log(`stateFilterMiddleware: Тип сообщения "${messageType}" запрещён в состоянии "${currentState}".`);
            return;
        }

        // Передаем управление следующему middleware или обработчику
        await next();
    };
}

module.exports = {
    STATES,
    setState,
    isAllowedMessageType,
    stateFilterMiddleware,
};
