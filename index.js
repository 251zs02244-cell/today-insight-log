'use strict';

const http = require('node:http');
const pug = require('pug');

const insights = [
    {
        id: 1,
        title: 'HTTPメソッドの役割',
        category: '学習',
        body: 'GETは取得、POSTは投稿という役割で考えると理解しやすかった。',
        createdAt: new Date()
    },
    {
        id: 2,
        title: '小さく作る大切さ',
        category: '制作',
        body: '最初から全部作らず、まずトップページだけ表示する方が安全だと分かった。',
        createdAt: new Date()
    }
];

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

    if (req.method === 'GET' && req.url === '/insights') {
        res.write(
            pug.renderFile('./views/insights.pug', {
                title: '気付き一覧',
                insights
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