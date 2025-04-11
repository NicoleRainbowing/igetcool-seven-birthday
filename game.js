class Game {
    constructor() {
        this.container = document.getElementById('game-container');
        this.scoreElement = document.getElementById('score');
        this.bestScoreElement = document.getElementById('bestScore');
        this.messageElement = document.getElementById('message');
        this.score = 0;
        this.bestScore = localStorage.getItem('bestScore') || 0;
        this.tiles = [];
        this.gameRunning = false;
        this.bonusWords = ['少','年','得','到','7', '周', '年', '生', '日', '快', '乐'];
        this.bonusProgress = [];
        this.tileSpeed = 2;
        this.sounds = {};
        this.initSounds();
        this.init();
        this.startTime = 0;
        this.timerInterval = null;
        this.timerElement = document.getElementById('timer');
        this.leaderboard = JSON.parse(localStorage.getItem('leaderboard')) || [];
    }

    initSounds() {
        // 创建音效
        this.sounds.click = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU');
        this.sounds.bonus = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU');
        this.sounds.gameOver = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU');
        this.sounds.win = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU');
    }

    init() {
        this.bestScoreElement.textContent = this.bestScore;
        document.getElementById('startBtn').addEventListener('click', () => this.startGame());
    }

    initLeaderboard() {
        // 初始化排行榜相关事件
        document.getElementById('showLeaderboard').addEventListener('click', () => this.showLeaderboard());
        document.getElementById('closeLeaderboard').addEventListener('click', () => this.hideLeaderboard());
        
        // 标签切换事件
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                const tab = e.target.dataset.tab;
                document.getElementById('scoreLeaderboard').style.display = tab === 'score' ? 'block' : 'none';
                document.getElementById('timeLeaderboard').style.display = tab === 'time' ? 'block' : 'none';
                this.loadLeaderboard(tab);
            });
        });
    }

    startGame() {
        this.container.innerHTML = '';
        this.score = 0;
        this.scoreElement.textContent = this.score;
        this.gameRunning = true;
        this.bonusProgress = [];
        this.messageElement.textContent = '';
        this.tileSpeed = 2;
        this.createNewRow();
        this.gameLoop();
        this.startTime = Date.now();
        this.startTimer();
    }

    createNewRow() {
        const goldPosition = Math.floor(Math.random() * 4);
        for (let i = 0; i < 4; i++) {
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.style.left = (i * 75) + 'px';
            tile.style.top = '-100px';

            if (i === goldPosition) {
                const isBonus = Math.random() < 0.3 && this.bonusProgress.length < this.bonusWords.length;
                if (isBonus) {
                    tile.className = 'tile bonus-tile';
                    const nextBonusWord = this.bonusWords[this.bonusProgress.length];
                    tile.textContent = nextBonusWord;
                    tile.dataset.bonus = 'true';
                    tile.dataset.word = nextBonusWord;
                } else {
                    tile.className = 'tile gold-tile';
                    tile.textContent = Math.random() < 0.5 ? '$' : '￥';
                }
            }

            tile.addEventListener('click', () => this.handleTileClick(tile));
            this.container.appendChild(tile);
            this.tiles.push(tile);
        }
    }

    handleTileClick(tile) {
        if (!tile.classList.contains('gold-tile') && !tile.classList.contains('bonus-tile')) {
            this.gameOver();
            return;
        }

        if (tile.classList.contains('bonus-tile')) {
            const word = tile.dataset.word;
            if (this.bonusWords[this.bonusProgress.length] === word) {
                this.sounds.bonus.play();
                this.bonusProgress.push(word);
                this.score += Math.floor(Math.random() * 5 + 1) * 20;
            } else {
                this.gameOver();
                return;
            }
        } else {
            this.sounds.click.play();
            this.score += 10;
        }

        this.scoreElement.textContent = this.score;
        tile.style.visibility = 'hidden';

        if (this.bonusProgress.length === this.bonusWords.length) {
            this.gameWin();
        }

        // 每得100分增加一点速度
        this.tileSpeed = 2 + Math.floor(this.score / 100) * 0.5;
    }

    updateBestScore() {
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            this.bestScoreElement.textContent = this.bestScore;
            localStorage.setItem('bestScore', this.bestScore);
        }
    }

    gameLoop() {
        if (!this.gameRunning) return;

        this.tiles.forEach(tile => {
            const currentTop = parseFloat(tile.style.top);
            tile.style.top = (currentTop + this.tileSpeed) + 'px';

            if (currentTop > 400) {
                if (tile.classList.contains('gold-tile') || tile.classList.contains('bonus-tile')) {
                    this.gameOver();
                    return;
                }
                this.container.removeChild(tile);
                this.tiles = this.tiles.filter(t => t !== tile);
            }
        });

        if (this.tiles.length === 0 || parseFloat(this.tiles[this.tiles.length - 1].style.top) > 0) {
            this.createNewRow();
        }

        requestAnimationFrame(() => this.gameLoop());
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            this.timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    async submitScore(isCompleted) {
        const gameTime = Math.floor((Date.now() - this.startTime) / 1000);
        const playerName = prompt('请输入您的名字：');
        if (!playerName) return;

        // 添加到本地排行榜
        this.leaderboard.push({
            playerName,
            score: this.score,
            time: gameTime,
            completed: isCompleted,
            date: new Date().toISOString()
        });

        // 按分数排序
        this.leaderboard.sort((a, b) => b.score - a.score);

        // 只保留前10名
        this.leaderboard = this.leaderboard.slice(0, 10);

        // 保存到localStorage
        localStorage.setItem('leaderboard', JSON.stringify(this.leaderboard));

        // 显示排行榜
        this.showLeaderboard();
    }

    async loadLeaderboard(type = 'score') {
        const leaderboardElement = document.getElementById(`${type}Leaderboard`);
        const sortedLeaderboard = [...this.leaderboard].sort((a, b) => {
            if (type === 'score') {
                return b.score - a.score;
            } else {
                return a.time - b.time;
            }
        });

        leaderboardElement.innerHTML = sortedLeaderboard.map((entry, index) => `
            <div class="leaderboard-entry">
                <span class="rank">${index + 1}</span>
                <span class="name">${entry.playerName}</span>
                <span class="value">${type === 'score' ? 
                    entry.score + '分' : 
                    Math.floor(entry.time / 60) + ':' + (entry.time % 60).toString().padStart(2, '0')
                }</span>
            </div>
        `).join('');
    }

    showLeaderboard() {
        document.getElementById('leaderboardModal').style.display = 'flex';
        this.loadLeaderboard('score');
    }

    hideLeaderboard() {
        document.getElementById('leaderboardModal').style.display = 'none';
    }

    gameOver() {
        this.stopTimer();
        this.sounds.gameOver.play();
        this.gameRunning = false;
        this.updateBestScore();
        this.messageElement.textContent = '游戏结束！最终得分：' + this.score;
        
        // 提交分数
        this.submitScore(false);

        setTimeout(() => {
            this.container.innerHTML = `
                <div class="start-screen">
                    <h2>游戏结束</h2>
                    <p>本次得分：${this.score}</p>
                    <p>最高记录：${this.bestScore}</p>
                    <div class="start-btn" id="startBtn">重新开始</div>
                    <div class="leaderboard-btn" id="showLeaderboard">查看排行榜</div>
                </div>
            `;
            this.init();
        }, 2000);
    }

    gameWin() {
        this.stopTimer();
        this.sounds.win.play();
        this.gameRunning = false;
        this.updateBestScore();
        
        // 提交通关分数
        this.submitScore(true);

        this.messageElement.textContent = '恭喜通关！生日快乐！最终得分：' + this.score;
        setTimeout(() => {
            this.container.innerHTML = `
                <div class="start-screen">
                    <h2>恭喜通关！</h2>
                    <p>生日快乐！</p>
                    <p>本次得分：${this.score}</p>
                    <p>通关时间：${this.timerElement.textContent}</p>
                    <div class="start-btn" id="startBtn">再玩一次</div>
                    <div class="leaderboard-btn" id="showLeaderboard">查看排行榜</div>
                </div>
            `;
            this.init();
        }, 2000);
    }
}

window.onload = () => new Game();

// 修改获取随机用户名的函数
function getRandomUsername(ip) {
    const names = ['少年得到', '7周年', '生日快乐'];
    const randomName = names[Math.floor(Math.random() * names.length)];
    // 获取IP地址的后两段
    const ipSegments = ip.split('.');
    const ipSuffix = ipSegments.slice(-2).join('.');
    return `${randomName}${ipSuffix}`;
}

// 添加检查连续匿名用户的函数
function checkConsecutiveUsers(leaderboard) {
    for (let i = 0; i < leaderboard.length - 2; i++) {
        const user1 = leaderboard[i].username;
        const user2 = leaderboard[i + 1].username;
        const user3 = leaderboard[i + 2].username;

        // 提取IP后缀
        const ip1 = user1.replace(/^(少年得到|7周年|生日快乐)/, '');
        const ip2 = user2.replace(/^(少年得到|7周年|生日快乐)/, '');
        const ip3 = user3.replace(/^(少年得到|7周年|生日快乐)/, '');

        // 检查是否为指定三个名字且IP相同
        if (user1.startsWith('少年得到') && 
            user2.startsWith('7周年') && 
            user3.startsWith('生日快乐') && 
            ip1 === ip2 && ip2 === ip3) {
            playFireworks();
            break;
        }
    }
}

// 添加礼花效果函数
function playFireworks() {
    const fireworks = new Fireworks({
        target: document.body,
        hue: 120,
        startDelay: 1,
        minDelay: 20,
        maxDelay: 30,
        speed: 4,
        acceleration: 1.05,
        friction: 0.98,
        gravity: 1,
        particles: 75,
        trace: 3,
        explosion: 6,
        boundaries: {
            top: 50,
            bottom: document.body.clientHeight,
            left: 50,
            right: document.body.clientWidth
        },
        sound: {
            enable: true,
            files: [
                'explosion0.mp3',
                'explosion1.mp3',
                'explosion2.mp3'
            ],
            volume: {
                min: 4,
                max: 8
            }
        }
    });
    fireworks.start();
    setTimeout(() => fireworks.stop(), 5000); // 5秒后停止
}

// 在更新排行榜时调用检查函数
function updateLeaderboard(newScore) {
    // ... existing code ...
    
    // 在更新完排行榜后检查连续用户
    checkConsecutiveUsers(leaderboard);
    
    // ... existing code ...
} 