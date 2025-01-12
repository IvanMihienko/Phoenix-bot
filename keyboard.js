const { Keyboard } = require('grammy');
const fs = require('fs');
const path = require('path');

/**
 * Загружает список счётчиков из JSON файла.
 * @returns {Array<Object>} Массив объектов счётчиков.
 */
function loadCounters() {
    const filePath = path.join(__dirname, 'CountersList.json');
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data).counters;
}

/**
 * Создает главную клавиатуру.
 * @returns {Keyboard} Главная клавиатура.
 */
function createMainKeyboard() {
    return new Keyboard()
        .text("📋 Профиль").text("🗂 Задания").row()
        .text("📊 Пройти опрос").text("🧮 Счётчик Побед").row()
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
 * @returns {Keyboard} Клавиатура с кнопкой отправки местоположения.
 */
function createLocationButton() {
    return new Keyboard()
        .requestLocation("📍 Поделиться местоположением").row()
        .resized();
}

/**
 * Создает клавиатуру для раздела "Счётчик побед".
 * @returns {Keyboard} Клавиатура для раздела "Счётчик побед".
 */
function createCountersKeyboard() {
    const counters = loadCounters();
    const keyboard = new Keyboard();

    counters.forEach(counter => {
        keyboard.text(counter.name).row();
    });

    keyboard.text("🏠 Назад в меню").row();

    return keyboard.resized();
}

module.exports = {
    createMainKeyboard,
    createProfileKeyboard,
    createSettingsKeyboard,
    createTestCompletionKeyboard,
    createListTestKeyboard,
    createLocationButton,
    createCountersKeyboard,
    loadCounters
};
