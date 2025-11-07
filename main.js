const { program } = require('commander');
const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs').promises;
const path = require('node:path');
const superagent = require('superagent');

program
    .requiredOption('-h, --host <address>', 'адреса сервера')
    .requiredOption('-p, --port <number>', 'порт сервера')
    .requiredOption('-c, --cache <path>', 'шлях до директорії з кешем');

program.parse(process.argv);
const options = program.opts();

if (!fs.existsSync(options.cache)) {
    fs.mkdirSync(options.cache, { recursive: true });
    console.log(`Створено директорію кешу: ${options.cache}`);
}
    
const server = http.createServer(async (req, res) => {
    const urlParts = req.url.split('/');
    const code = urlParts[1]; // /200 -> "200"

    if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Помилка: не вказано HTTP код у запиті (наприклад /200)');
        return;
    }

    const filePath = path.join(options.cache, `${code}.jpg`);

    try {
        switch (req.method) {
            case 'GET':
                try {
                    // Пробуємо прочитати з кешу
                    const data = await fsp.readFile(filePath);
                    res.writeHead(200, { 'Content-Type': 'image/jpeg' });
                    res.end(data);
                } catch {
                    console.log(`Кеш відсутній для ${code}, завантажую з http.cat...`);
                    try {
                        // Завантаження з http.cat як буфера
                        const response = await superagent
                            .get(`https://http.cat/${code}`)
                            .buffer(true) // читає весь потік
                            .parse((res, callback) => {
                                const data = [];
                                res.on('data', chunk => data.push(chunk));
                                res.on('end', () => callback(null, Buffer.concat(data)));
                            });

                        const imageData = response.body;

                        // Збереження у кеш
                        await fsp.writeFile(filePath, imageData);

                        // Відправлення клієнту
                        res.writeHead(200, { 'Content-Type': 'image/jpeg' });
                        res.end(imageData);
                    } catch (error) {
                        console.error(`Не вдалося отримати https://http.cat/${code}:`, error.message);
                        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                        res.end(`404 Not Found: немає картинки для коду ${code}`);
                    }
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

server.listen(options.port, options.host, () => {
    console.log(`Сервер запущено на http://${options.host}:${options.port}`);
});
