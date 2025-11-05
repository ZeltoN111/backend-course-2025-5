// Імпортуємо необхідні модулі
const { program } = require('commander');
const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs').promises;
const path = require('node:path');

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

// Створюємо сервер
const server = http.createServer(async (req, res) => {
    const urlParts = req.url.split('/');
    const code = urlParts[1]; // Наприклад, /200 → code = "200"

    // Якщо не передано код у URL
    if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Помилка: не вказано HTTP код у запиті (наприклад /200)');
        return;
    }

    // Повний шлях до файлу у кеші
    const filePath = path.join(options.cache, `${code}.jpg`);

    try {
        switch (req.method) {
            case 'GET':
                try {
                    const data = await fsp.readFile(filePath);
                    res.writeHead(200, { 'Content-Type': 'image/jpeg' });
                    res.end(data);
                } catch {
                    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                    res.end('404 Not Found: картинки немає у кеші');
                }
                break;

            case 'PUT':
                const chunks = [];
                req.on('data', chunk => chunks.push(chunk));
                req.on('end', async () => {
                    const body = Buffer.concat(chunks);
                    await fsp.writeFile(filePath, body);
                    res.writeHead(201, { 'Content-Type': 'text/plain; charset=utf-8' });
                    res.end('Картинку збережено у кеші (201 Created)');
                });
                break;

            case 'DELETE':
                try {
                    await fsp.unlink(filePath);
                    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
                    res.end('Картинку видалено з кешу (200 OK)');
                } catch {
                    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                    res.end('404 Not Found: немає такої картинки для видалення');
                }
                break;

            default:
                res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('405 Method Not Allowed');
                break;
        }
    } catch (err) {
        console.error('Помилка сервера:', err);
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('500 Internal Server Error');
    }
});

// Запускаємо сервер
server.listen(options.port, options.host, () => {
    console.log(`Сервер працює на http://${options.host}:${options.port}`);
});
