'use strict';

const http = require('node:http');
const pug = require('pug');

const server = http.createServer((req, res) => {
    const now = new Date();
    console.info(`[${now}] ${req.method} ${req.url}`);

    res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8'
    });

    if (req.method === 'GET' && req.url === '/') {
        res.write(
            pug.renderFile('./views/index.pug', {
                title: '今日の気付きログ'
            })
        );
        res.end();
        return;
    }

    res.writeHead(404, {
        'Content-Type': 'text/html; charset=utf-8'
    });
    res.write('<h1>404 Not Found</h1>');
    res.end();
});

const port = process.env.PORT || 8000;

server.listen(port, () => {
    console.info(`[${new Date()}] Listening on ${port}`);
});