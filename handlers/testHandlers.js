const { STATES, setState } = require('../stateManager');
const { createMainKeyboard, createListTestKeyboard, createTestCompletionKeyboard } = require('../keyboard');
const { getTestFiles } = require('../getTestFiles');
const { InlineKeyboard } = require('grammy');

/**
 * Загружает тест и инициализирует его для пользователя.
 * @param {Object} ctx - Контекст выполнения команды.
 * @param {string} testName - Название теста.
 */
async function loadAndStartTest(ctx, testName) {
    try {
        console.log(`loadAndStartTest: Начало загрузки теста ${testName} для пользователя ${ctx.from?.id}`);
        const testFilePath = `../tests/${testName}.json`;
        const questions = require(testFilePath);

        if (!Array.isArray(questions) || questions.length === 0) {
            console.error(`loadAndStartTest: Тест ${testName} пуст или имеет некорректный формат.`);
            await ctx.reply("Тест пуст или имеет некорректный формат.");
            return;
        }

        setState(ctx, 'TESTING'); // Устанавливаем состояние TESTING

        ctx.session.currentTest = {
            questions,
            currentIndex: 0,
            testName,
            results: Array(questions.length).fill(0),
            messageId: null,
            channelScores: questions.reduce((acc, question) => {
                if (!acc[question.channel]) {
                    acc[question.channel] = 0;
                }
                return acc;
            }, {})
        };

        await startTest(ctx, questions);
    } catch (error) {
        console.error(`Ошибка загрузки теста: ${error.message}`);
        await ctx.reply("Произошла ошибка при загрузке теста. Пожалуйста, попробуйте позже.");
    }
}

/**
 * Инициализирует тест и отправляет первый вопрос.
 * @param {Object} ctx - Контекст выполнения команды.
 * @param {Array} questions - Массив вопросов для теста.
 */
async function startTest(ctx, questions) {
    console.log(`startTest: Инициализация теста для пользователя ${ctx.from?.id}`);
    if (!ctx.session) {
        ctx.session = {}; // Инициализация сессии, если её нет
    }

    if (!ctx.session.currentTest) {
        ctx.session.currentTest = {
            questions,
            currentIndex: 0,
        };
    }

    const { testName } = ctx.session.currentTest;

    // Отправляем клавиатуру для завершения теста
    await ctx.reply(`Начат тест ${testName}`, {
        reply_markup: createTestCompletionKeyboard(),
    });  
  
    await sendQuestion(ctx);
    
}

/**
 * Отправляет текущий вопрос пользователю.
 * Если сообщение уже существует, оно редактируется.
 * @param {Object} ctx - Контекст выполнения команды.
 */
async function sendQuestion(ctx) {
    const testSession = ctx.session.currentTest;
    const { questions, currentIndex } = testSession;
    const currentQuestion = questions[currentIndex];

    const questionText = `Вопрос ${currentIndex + 1} / ${questions.length}\n\n<b>${currentQuestion.question}</b>\n\n${currentQuestion.options.map((opt, index) => `${String.fromCharCode(65 + index)}. ${opt.text}`).join('\n')}`;
    const keyboard = createDynamicInlineKeyboard(currentQuestion.options);

    if (testSession.messageId) {
        await ctx.api.editMessageText(ctx.chat.id, testSession.messageId, questionText, {
            reply_markup: keyboard,
            parse_mode: 'HTML',
        });
    } else {
        const message = await ctx.reply(questionText, {
            reply_markup: keyboard,
            parse_mode: 'HTML',
        });
        testSession.messageId = message.message_id;
    }
}

/**
 * Обрабатывает ответ пользователя на вопрос.
 * @param {Object} ctx - Контекст выполнения команды.
 */
async function handleAnswer(ctx) {
    const testSession = ctx.session.currentTest;
    const { questions, currentIndex, results } = testSession;
    const currentQuestion = questions[currentIndex];

    const userAnswer = ctx.callbackQuery?.data;
    const answer = currentQuestion.options.find(opt => opt.id === userAnswer);
    const answerValue = currentQuestion.options.indexOf(answer); // Значения: 0, 1, 2, 3

    console.log(`Пользователь ${ctx.from?.id} выбрал: ${answer?.text} (Баллы: ${answerValue}), канал: ${currentQuestion.channel}`);

    results[currentIndex] = answerValue;

    if (currentIndex < questions.length - 1) {
        testSession.currentIndex += 1;
        await sendQuestion(ctx);
    } else {
        await calculateAndSendResults(ctx);
        await handleTestCompletion(ctx);
    }

    await ctx.answerCallbackQuery();
}

/**
 * Рассчитывает и отправляет результаты теста.
 * @param {Object} ctx - Контекст выполнения команды.
 */
async function calculateAndSendResults(ctx) {
    const testSession = ctx.session.currentTest;
    const { results, questions } = testSession;

    // Группируем результаты по каналам
    const channelScores = {};

    questions.forEach((question, index) => {
        const channel = question.channel;
        if (!channelScores[channel]) {
            channelScores[channel] = 0;
        }
        channelScores[channel] += results[index];
    });

    const maxPointsPerChannel = 7 * 3; // Максимум баллов на канал (предполагаем 7 вопросов на канал)

    const channelResults = Object.entries(channelScores).map(([channel, score]) => ({
        name: channel,
        activation: Math.round((score / maxPointsPerChannel) * 100)
    }));

    const resultMessage = channelResults
        .map(({ name, activation }) => `${name}: ${activation}%`)
        .join('\n');

    await ctx.reply(`Результаты теста:\n${resultMessage}`);
}

/**
 * Обрабатывает завершение теста.
 * @param {Object} ctx - Контекст выполнения команды.
 */
async function handleTestCompletion(ctx) {
    delete ctx.session.currentTest; // Удаляем текущую сессию теста
    setState(ctx, 'IDLE'); // Сбрасываем состояние

    await ctx.reply("Тест завершён. Возвращаем вас в главное меню.", {
        reply_markup: createMainKeyboard(),
    });
}

/**
 * Создаёт динамическую клавиатуру для вариантов ответа.
 * @param {Array} options - Варианты ответа.
 * @returns {InlineKeyboard} Динамическая inline клавиатура.
 */
function createDynamicInlineKeyboard(options) {
    const keyboard = new InlineKeyboard();
    options.forEach((opt, index) => {
        keyboard.text(String.fromCharCode(65 + index), opt.id);
    });
    return keyboard;
}

/**
 * Отображает список доступных тестов.
 * @param {Object} ctx - Контекст выполнения команды.
 */
async function handlePoll(ctx) {
    console.log(`handlePoll: Отображение списка тестов для пользователя ${ctx.from?.id}`);
    const testFiles = getTestFiles();

    if (!testFiles.length) {
        console.error("handlePoll: Нет доступных тестов.");
        await ctx.reply("Нет доступных тестов. Пожалуйста, свяжитесь с администратором.");
        return;
    }

    await ctx.reply("Выберите тест из списка:", {
        reply_markup: createListTestKeyboard(testFiles),
    });
}

module.exports = {
    loadAndStartTest,
    sendQuestion,
    handleAnswer,
    calculateAndSendResults,
    handleTestCompletion,
    handlePoll
};
