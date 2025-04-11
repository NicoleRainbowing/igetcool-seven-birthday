class Game {
    constructor(container) {
        if (!container) {
            throw new Error('Game container is required');
        }
        
        this.container = container;
        this.gameContainer = document.getElementById('game-container');
        this.startScreen = document.getElementById('startScreen');
        
        if (!this.gameContainer || !this.startScreen) {
            throw new Error('Required game elements not found');
        }
        
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('highScore')) || 0;
        this.startTime = 0;
        this.gameInterval = null;
        this.tiles = [];
        this.bonusWords = ['少', '年', '得', '到', '7', '周', '年', '生', '日', '快', '乐'];
        this.bonusProgress = [];
        this.leaderboard = JSON.parse(localStorage.getItem('leaderboard')) || [];
        
        try {
            this.init();
        } catch (error) {
            console.error('Error initializing game:', error);
            throw error;
        }
    }

    init() {
        try {
            this.updateScore();
            this.updateHighScore();
            this.updateTimer();
            // 确保游戏区域是空的
            if (this.gameContainer) {
                this.gameContainer.innerHTML = '';
            }
            // 显示开始屏幕
            if (this.startScreen) {
                this.startScreen.style.display = 'block';
            }
        } catch (error) {
            console.error('Error in init:', error);
            throw error;
        }
    }

    start() {
        if (!this.gameContainer) return;
        
        this.reset();
        if (this.startScreen) {
            this.startScreen.style.display = 'none';
        }
        this.startTime = Date.now();
        // 加快方块生成速度
        this.gameInterval = setInterval(() => {
            this.createNewRow();
            this.updateTiles();
            this.updateTimer();
        }, 800);
    }

    reset() {
        this.score = 0;
        this.tiles = [];
        this.bonusProgress = [];
        if (this.gameContainer) {
            this.gameContainer.innerHTML = '';
        }
        if (this.gameInterval) {
            clearInterval(this.gameInterval);
        }
        this.updateScore();
    }

    createNewRow() {
        const row = document.createElement('div');
        row.className = 'row';
        
        const hasBonus = Math.random() < 0.3;
        const bonusPosition = hasBonus ? Math.floor(Math.random() * 4) : -1;
        
        // 计算每个方块之间的间距，确保平均分布
        const tileWidth = 60;
        const containerWidth = this.container.offsetWidth;
        const totalGap = containerWidth - (4 * tileWidth);
        const gap = totalGap / 5; // 5个间隔（4个方块之间有5个间隔）
        
        for (let i = 0; i < 4; i++) {
            const tile = document.createElement('div');
            tile.className = 'tile';
            
            if (i === bonusPosition) {
                tile.classList.add('bonus-tile');
                const nextBonusWord = this.bonusWords[this.bonusProgress.length];
                tile.textContent = nextBonusWord;
                tile.dataset.bonus = 'true';
                tile.dataset.word = nextBonusWord;
                const bonusScores = [20, 40, 60, 80, 100];
                tile.dataset.score = bonusScores[Math.floor(Math.random() * bonusScores.length)];
            } else {
                tile.classList.add('gold-tile');
                tile.textContent = Math.random() < 0.5 ? '$' : '￥';
                tile.dataset.score = 10;
            }
            
            // 计算每个方块的位置，确保平均分布
            const left = gap + (i * (tileWidth + gap));
            tile.style.left = left + 'px';
            tile.style.top = '-60px';
            tile.addEventListener('click', () => this.handleTileClick(tile));
            row.appendChild(tile);
            this.tiles.push(tile);
        }
        
        this.container.appendChild(row);
    }

    updateTiles() {
        for (let i = this.tiles.length - 1; i >= 0; i--) {
            const tile = this.tiles[i];
            const top = parseFloat(tile.style.top);
            if (top > this.container.offsetHeight) {
                this.gameOver(false);
                return;
            }
            // 增加下落速度
            tile.style.top = (top + 4) + 'px';
        }
    }

    handleTileClick(tile) {
        const index = this.tiles.indexOf(tile);
        if (index !== -1) {
            this.tiles.splice(index, 1);
            tile.remove();
            
            if (tile.dataset.bonus === 'true') {
                const word = tile.dataset.word;
                if (word === this.bonusWords[this.bonusProgress.length]) {
                    this.bonusProgress.push(word);
                    this.score += 20;
                    if (this.bonusProgress.length === this.bonusWords.length) {
                        this.score += 100;
                        this.bonusProgress = [];
                    }
                } else {
                    this.gameOver(false);
                    return;
                }
            } else {
                this.score += 10;
            }
            
            this.updateScore();
            if (this.score > this.highScore) {
                this.highScore = this.score;
                this.updateHighScore();
                localStorage.setItem('highScore', this.highScore);
            }
        }
    }

    updateScore() {
        document.getElementById('score').textContent = this.score;
    }

    updateHighScore() {
        document.getElementById('highScore').textContent = this.highScore;
    }

    updateTimer() {
        if (this.startTime) {
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            document.getElementById('time').textContent = 
                minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
        }
    }

    gameOver(isCompleted) {
        clearInterval(this.gameInterval);
        this.submitScore(isCompleted);
    }

    async submitScore(isCompleted) {
        const gameTime = Math.floor((Date.now() - this.startTime) / 1000);
        let playerName = prompt('请输入您的名字：');
        
        if (!playerName) {
            const names = ['七周年', '少年得到', '生日快乐'];
            playerName = names[Math.floor(Math.random() * names.length)];
        }

        this.leaderboard.push({
            playerName,
            score: this.score,
            time: gameTime,
            completed: isCompleted,
            date: new Date().toISOString()
        });

        this.leaderboard.sort((a, b) => b.score - a.score);
        this.leaderboard = this.leaderboard.slice(0, 10);
        localStorage.setItem('leaderboard', JSON.stringify(this.leaderboard));
        this.showLeaderboard();
    }

    showLeaderboard() {
        document.getElementById('leaderboardModal').style.display = 'flex';
        this.showScoreLeaderboard();
    }

    hideLeaderboard() {
        document.getElementById('leaderboardModal').style.display = 'none';
    }

    showScoreLeaderboard() {
        this.updateLeaderboardList(this.leaderboard.sort((a, b) => b.score - a.score));
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.textContent === '分数排行');
        });
    }

    showTimeLeaderboard() {
        this.updateLeaderboardList(this.leaderboard.sort((a, b) => a.time - b.time));
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.textContent === '时间排行');
        });
    }

    updateLeaderboardList(sortedLeaderboard) {
        const list = document.getElementById('leaderboardList');
        list.innerHTML = '';
        sortedLeaderboard.forEach((entry, index) => {
            const item = document.createElement('div');
            item.className = 'leaderboard-entry';
            item.innerHTML = `
                <span class="rank">${index + 1}</span>
                <span class="name">${entry.playerName}</span>
                <span class="value">${entry.score}分 ${entry.time}秒</span>
            `;
            list.appendChild(item);
        });
    }
}

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