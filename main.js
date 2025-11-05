// Імпортуємо необхідні модулі
const { program } = require('commander');
const http = require('node:http');
const fs = require('node:fs');

// Налаштовуємо параметри командного рядка
program
    .requiredOption('-h, --host <address>', 'адреса сервера')
    .requiredOption('-p, --port <number>', 'порт сервера')
    .requiredOption('-c, --cache <path>', 'шлях до директорії з кешем');

program.parse(process.argv);
const options = program.opts();

// Перевіряємо, чи існує директорія кешу, і створюємо її при необхідності
if (!fs.existsSync(options.cache)) {
    fs.mkdirSync(options.cache, { recursive: true });
    console.log(`Створено директорію кешу: ${options.cache}`);
}

// Створюємо простий веб-сервер
const server = http.createServer((req, res) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Кешуючий проксі-сервер запущено успішно!');
});

// Запускаємо сервер із параметрів командного рядка
server.listen(options.port, options.host, () => {
    console.log(`Сервер запущено на http://${options.host}:${options.port}`);
});
