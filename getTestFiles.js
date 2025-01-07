// Модуль для получения списка тестов
const fs = require('fs');
const path = require('path');

/**
 * Получает список доступных тестов из папки 'tests'.
 * @returns {Array<string>} Массив названий тестов (без расширения .json).
 */
function getTestFiles() {
    const testDir = path.join(__dirname, 'tests');
    return fs.readdirSync(testDir)
        .filter(file => file.endsWith('.json'))
        .map(file => path.basename(file, '.json'));
}

module.exports = { getTestFiles };
