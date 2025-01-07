const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');

dotenv.config();

const client = new MongoClient(process.env.MONGO_URI);

async function connectToDatabase() {
    try {
        await client.connect();
        console.log('Успешное подключение к MongoDB');
        return client.db('telegram_bot');
    } catch (error) {
        console.error('Ошибка подключения к MongoDB:', error);
        process.exit(1);
    }
}

async function closeDatabaseConnection() {
    try {
        await client.close();
        console.log('Соединение с MongoDB закрыто.');
    } catch (error) {
        console.error('Ошибка при закрытии соединения с MongoDB:', error);
    }
}

module.exports = { connectToDatabase, closeDatabaseConnection };
