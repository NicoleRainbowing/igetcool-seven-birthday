const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// 详细的错误处理
process.on('uncaughtException', (err) => {
    console.error('未捕获的异常:', err);
});

// 检查文件路径
console.log('当前工作目录:', process.cwd());
console.log('public目录:', path.join(__dirname, 'public'));

// 创建数据库连接
const db = new sqlite3.Database('gamedb.sqlite', (err) => {
    if (err) {
        console.error('数据库连接错误:', err);
    } else {
        console.log('数据库连接成功');
    }
});

// 允许跨域访问
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// 添加请求日志中间件
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// 静态文件中间件
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// 根路由
app.get('/', (req, res) => {
    console.log('收到根路由请求');
    const indexPath = path.join(__dirname, 'public', 'index.html');
    console.log('尝试发送文件:', indexPath);
    res.sendFile(indexPath, (err) => {
        if (err) {
            console.error('发送index.html失败:', err);
            res.status(500).send('无法加载游戏');
        }
    });
});

// 创建数据表
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        playerName TEXT NOT NULL,
        score INTEGER NOT NULL,
        time INTEGER NOT NULL,
        completed BOOLEAN NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) {
            console.error('创建表失败:', err);
        } else {
            console.log('数据表检查/创建成功');
        }
    });
});

// 添加获取IP的辅助函数
function getClientIP(req) {
    // 获取真实IP地址（考虑代理情况）
    const ip = req.headers['x-forwarded-for'] || 
               req.connection.remoteAddress || 
               req.socket.remoteAddress;
    
    // 从IP地址中提取最后两段
    const ipSegments = ip.split('.');
    return `${ipSegments[ipSegments.length - 2]}.${ipSegments[ipSegments.length - 1]}`;
}

// 修改提交分数的路由
app.post('/api/submit-score', async (req, res) => {
    try {
        const { playerName, score, time, completed } = req.body;
        
        // 获取客户端IP地址
        const ip = req.headers['x-forwarded-for'] || 
                  req.connection.remoteAddress || 
                  req.socket.remoteAddress || 
                  req.connection.socket.remoteAddress;
                  
        // 处理IPv4和IPv6地址
        let ipSuffix = '';
        if (ip) {
            const ipParts = ip.split(':').pop().split('.');
            if (ipParts.length >= 2) {
                ipSuffix = ipParts.slice(-2).join('.');
            } else {
                ipSuffix = ip.split(':').pop();
            }
        }

        // 添加IP后缀到玩家名称
        const playerNameWithIP = `${playerName}-${ipSuffix}`;

        db.run(
            'INSERT INTO scores (playerName, score, time, completed) VALUES (?, ?, ?, ?)',
            [playerNameWithIP, score, time, completed],
            function(err) {
                if (err) {
                    console.error('保存分数失败:', err);
                    res.status(500).json({ error: '保存分数失败' });
                    return;
                }
                res.json({ success: true, id: this.lastID });
            }
        );
    } catch (error) {
        console.error('提交分数时出错:', error);
        res.status(500).send('服务器错误');
    }
});

// 修改获取排行榜的路由，处理显示格式
app.get('/api/leaderboard', (req, res) => {
    const { type } = req.query;
    let query;
    
    if (type === 'time') {
        query = `
            SELECT playerName, score, time
            FROM scores
            WHERE completed = 1
            ORDER BY time ASC
            LIMIT 10
        `;
    } else {
        query = `
            SELECT playerName, score, time
            FROM scores
            ORDER BY score DESC
            LIMIT 10
        `;
    }
    
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('获取排行榜失败:', err);
            res.status(500).json({ error: '获取排行榜失败' });
            return;
        }
        
        // 处理玩家名称显示
        const processedRows = rows.map(row => ({
            ...row,
            displayName: row.playerName // 保持原样，包括IP后缀
        }));
        
        res.json(processedRows);
    });
});

// 添加获取最高分的API
app.get('/api/best-score', (req, res) => {
    db.get('SELECT MAX(score) as bestScore FROM scores', [], (err, row) => {
        if (err) {
            console.error('获取最高分失败:', err);
            res.status(500).json({ error: '获取最高分失败' });
            return;
        }
        res.json({ bestScore: row.bestScore || 0 });
    });
});

// 修改监听配置
app.listen(PORT, '0.0.0.0', () => {
    console.log(`游戏服务器运行在 http://localhost:${PORT}`);
});

// 添加服务器关闭处理
process.on('SIGTERM', () => {
    app.close(() => {
        console.log('服务器正常关闭');
        db.close();
    });
}); 