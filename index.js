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

const crypto = require('node:crypto');

const csrfTokens = new Set();

function createCsrfToken() {
    const token = crypto.randomBytes(32).toString('hex');
    csrfTokens.add(token);
    return token;
}

function verifyCsrfToken(token) {
    if (!token || !csrfTokens.has(token)) {
        return false;
    }

    csrfTokens.delete(token);
    return true;
}

const users = {
    admin: {
        password: 'admin-password',
        role: 'admin'
    },
    teacher: {
        password: 'teacher-password',
        role: 'teacher'
    }
};

function getCurrentUser(req) {
    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith('Basic ')) {
        return null;
    }

    const base64Credentials = authorization.replace('Basic ', '');
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf8');
    const [username, password] = credentials.split(':');

    const user = users[username];

    if (!user || user.password !== password) {
        return null;
    }

    return {
        username,
        role: user.role
    };
}

function requireLogin(req, res) {
    const currentUser = getCurrentUser(req);

    if (!currentUser) {
        res.writeHead(401, {
            'Content-Type': 'text/html; charset=utf-8',
            'WWW-Authenticate': 'Basic realm="Today Insight Log"'
        });
        res.write('<h1>401 Unauthorized</h1><p>ログインが必要です。</p>');
        res.end();
        return null;
    }

    return currentUser;
}

function requireAdmin(req, res) {
    const currentUser = requireLogin(req, res);

    if (!currentUser) {
        return null;
    }

    if (currentUser.role !== 'admin') {
        res.writeHead(403, {
            'Content-Type': 'text/html; charset=utf-8'
        });
        res.write('<h1>403 Forbidden</h1><p>この操作を行う権限がありません。</p>');
        res.end();
        return null;
    }

    return currentUser;
}

const server = http.createServer((req, res) => {
    const now = new Date();
    console.info(`[${now}] ${req.method} ${req.url}`);

    res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8'
    });

    if (req.method === 'GET' && req.url === '/') {
        const currentUser = requireLogin(req, res);
        if (!currentUser) {
            return;
        }

        res.write(
            pug.renderFile('./views/index.pug', {
                title: '今日の気付きログ'
            })
        );
        res.end();
        return;
    }

    if (req.method === 'GET' && req.url === '/insights/new') {
        const currentUser = requireAdmin(req, res);
        if (!currentUser) {
            return;
        }

        res.write(
            pug.renderFile('./views/new-insight.pug', {
                title: '新しい気付きを投稿',
                categories: ['学習', '仕事', '読書', '制作', '生活', 'その他'],
                csrfToken: createCsrfToken()
            })
        );
        res.end();
        return;
    }

    if (req.method === 'POST' && req.url === '/insights') {
        const currentUser = requireAdmin(req, res);
        if (!currentUser) {
            return;
        }

        let rawData = '';

        req
            .on('data', chunk => {
                rawData += chunk;
            })
            .on('end', () => {
                const params = new URLSearchParams(rawData);

                if (!verifyCsrfToken(params.get('csrfToken'))) {
                    res.writeHead(403, {
                        'Content-Type': 'text/html; charset=utf-8'
                    });
                    res.write('<h1>403 Forbidden</h1><p>CSRFトークンが不正です。</p>');
                    res.end();
                    return;
                }

                const title = params.get('title');
                const category = params.get('category');
                const body = params.get('body');

                insights.push({
                    id: insights.length + 1,
                    title,
                    category,
                    body,
                    createdAt: new Date()
                });

                res.writeHead(303, {
                    Location: '/insights'
                });
                res.end();
            });

        return;
    }

    if (req.method === 'GET' && req.url === '/insights') {
        const currentUser = requireLogin(req, res);
        if (!currentUser) {
            return;
        }

        res.write(
            pug.renderFile('./views/insights.pug', {
                title: '気付き一覧',
                insights,
                currentUser
            })
        );
        res.end();
        return;
    }

    const editMatch = req.url.match(/^\/insights\/(\d+)\/edit$/);

    if (req.method === 'GET' && editMatch) {
        const currentUser = requireAdmin(req, res);
        if (!currentUser) {
            return;
        }

        const id = Number(editMatch[1]);
        const insight = insights.find(item => item.id === id);

        if (!insight) {
            res.writeHead(404, {
                'Content-Type': 'text/html; charset=utf-8'
            });
            res.write('<h1>404 Not Found</h1>');
            res.end();
            return;
        }

        res.write(
            pug.renderFile('./views/edit-insight.pug', {
                title: '気付きを編集',
                insight,
                categories: ['学習', '仕事', '読書', '制作', '生活', 'その他'],
                csrfToken: createCsrfToken()
            })
        );res.write(
            pug.renderFile('./views/insight-detail.pug', {
                title: insight.title,
                insight,
                csrfToken: createCsrfToken()
            })
        );
        res.end();
        return;
    }

    const updateMatch = req.url.match(/^\/insights\/(\d+)\/update$/);

    if (req.method === 'POST' && updateMatch) {
        const currentUser = requireAdmin(req, res);
        if (!currentUser) {
            return;
        }

        const id = Number(updateMatch[1]);
        const insight = insights.find(item => item.id === id);

        if (!insight) {
            res.writeHead(404, {
                'Content-Type': 'text/html; charset=utf-8'
            });
            res.write('<h1>404 Not Found</h1>');
            res.end();
            return;
        }

        let rawData = '';

        req
            .on('data', chunk => {
                rawData += chunk;
            })
            .on('end', () => {
                const params = new URLSearchParams(rawData);

                if (!verifyCsrfToken(params.get('csrfToken'))) {
                    res.writeHead(403, {
                        'Content-Type': 'text/html; charset=utf-8'
                    });
                    res.write('<h1>403 Forbidden</h1><p>CSRFトークンが不正です。</p>');
                    res.end();
                    return;
                }

                insight.title = params.get('title');
                insight.category = params.get('category');
                insight.body = params.get('body');
                insight.updatedAt = new Date();

                res.writeHead(303, {
                    Location: `/insights/${insight.id}`
                });
                res.end();
            });

        return;
    }

    const deleteMatch = req.url.match(/^\/insights\/(\d+)\/delete$/);

    if (req.method === 'POST' && deleteMatch) {
        const currentUser = requireAdmin(req, res);
        if (!currentUser) {
            return;
        }

        const id = Number(deleteMatch[1]);
        const index = insights.findIndex(item => item.id === id);

        if (index === -1) {
            res.writeHead(404, {
                'Content-Type': 'text/html; charset=utf-8'
            });
            res.write('<h1>404 Not Found</h1>');
            res.end();
            return;
        }

        let rawData = '';

        req
            .on('data', chunk => {
                rawData += chunk;
            })
            .on('end', () => {
                const params = new URLSearchParams(rawData);

                if (!verifyCsrfToken(params.get('csrfToken'))) {
                    res.writeHead(403, {
                        'Content-Type': 'text/html; charset=utf-8'
                    });
                    res.write('<h1>403 Forbidden</h1><p>CSRFトークンが不正です。</p>');
                    res.end();
                    return;
                }

                insights.splice(index, 1);

                res.writeHead(303, {
                    Location: '/insights'
                });
                res.end();
            });

        return;
    }

    const detailMatch = req.url.match(/^\/insights\/(\d+)$/);

    if (req.method === 'GET' && detailMatch) {
        const currentUser = requireLogin(req, res);
        if (!currentUser) {
            return;
        }

        const id = Number(detailMatch[1]);
        const insight = insights.find(item => item.id === id);

        if (!insight) {
            res.writeHead(404, {
                'Content-Type': 'text/html; charset=utf-8'
            });
            res.write('<h1>404 Not Found</h1>');
            res.end();
            return;
        }

        res.write(
            pug.renderFile('./views/insight-detail.pug', {
                title: insight.title,
                insight,
                csrfToken: createCsrfToken(),
                currentUser
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