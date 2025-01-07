const { Keyboard } = require('grammy');

/**
 * Создает главную клавиатуру.
 * @returns {Keyboard} Главная клавиатура.
 */
function createMainKeyboard() {
    return new Keyboard()
        .text("📋 Профиль").text("🗂 Задания").row()
        .text("📊 Пройти опрос").row()
        .resized();
}

/**
 * Создает клавиатуру профиля.
 * @returns {Keyboard} Клавиатура профиля.
 */
function createProfileKeyboard() {
    return new Keyboard()
        .text("🏠 Назад в меню").text("⚙️ Настройка").row()
        .text("🏆 Достижения").text("📊 Рейтинг").row()
        .resized();
}

/**
 * Создает клавиатуру настройки.
 * @returns {Keyboard} Клавиатура настройки.
 */
function createSettingsKeyboard() {
    return new Keyboard()
        .text("⬅️ Назад в профиль").row()
        .requestLocation("📍 Поделиться местоположением").row()
        .resized();
}

/**
 * Создает клавиатуру завершения теста.
 * @returns {Keyboard} Клавиатура завершения теста.
 */
function createTestCompletionKeyboard() {
    return new Keyboard()
        .text("✅ Завершить тест").row()
        .resized();
}

/**
 * Создает клавиатуру со списком тестов.
 * @param {Array<string>} testFiles - Список названий тестов.
 * @returns {Keyboard} Клавиатура со списком тестов.
 */
function createListTestKeyboard(testFiles) {
    const keyboard = new Keyboard();
    testFiles.forEach(testName => {
        keyboard.text(testName).row();
    });
    return keyboard.resized();
}

/**
 * Создает клавиатуру с кнопкой отправки местоположения.
 * @param {Array<string>} testFiles - Список названий тестов.
 * @returns {Keyboard} Клавиатура со списком тестов.
 */
function createLocationButton() {
    return new Keyboard()
    .requestLocation("📍 Поделиться местоположением").row()
    .resized();
}

module.exports = {
    createMainKeyboard,
    createProfileKeyboard,
    createSettingsKeyboard,
    createTestCompletionKeyboard,
    createListTestKeyboard,
    createLocationButton,
};
