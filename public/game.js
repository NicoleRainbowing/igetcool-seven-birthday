class Game {
    constructor() {
        this.container = document.getElementById('game-container');
        if (!this.container) throw new Error('Game container is required');
        
        this.scoreElement = document.getElementById('score');
        this.bestScoreElement = document.getElementById('bestScore');
        this.timeElement = document.getElementById('time');
        
        // 游戏状态
        this.score = 0;
        this.bestScore = localStorage.getItem('bestScore') || 0;
        this.gameRunning = false;
        this.startTime = 0;
        this.tiles = [];
        this.tileSpeed = 1.5;
        this.lastRowCreatedAt = 0;
        
        // 收集序列
        this.requiredSequence = ['少', '年', '得', '到', '7', '周', '年', '生', '日', '快', '乐'];
        this.collectedSequence = [];
        
        // 随机名称池
        this.anonymousNames = ['少年得到', '7周年', '生日快乐'];
        
        // 分数配置
        this.goldSymbols = ['$', '￥'];
        this.bonusScores = [20, 40, 60, 80, 100];
        
        this.initializeGame();
    }

    initializeGame() {
        this.bestScoreElement.textContent = this.bestScore;
        this.addEventListeners();
    }

    addEventListeners() {
        document.getElementById('startBtn')?.addEventListener('click', () => this.startGame());
        document.getElementById('showLeaderboard')?.addEventListener('click', () => this.showLeaderboard());
        document.querySelector('.close-btn')?.addEventListener('click', () => this.hideLeaderboard());
        
        // 排行榜标签切换
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.target.dataset.tab;
                this.switchLeaderboardTab(type);
            });
        });
    }

    startGame() {
        this.gameRunning = true;
        this.score = 0;
        this.collectedSequence = [];
        this.tiles = [];
        this.startTime = Date.now();
        this.container.innerHTML = '';
        this.scoreElement.textContent = '0';
        this.updateTimer();
        this.gameLoop();
        this.createRow();
    }

    createRow() {
        const row = [];
        const goldTileIndex = Math.floor(Math.random() * 4);
        
        for (let i = 0; i < 4; i++) {
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.style.left = (i * 25) + '%';
            tile.style.top = '-100px';
            
            if (i === goldTileIndex) {
                // 创建金色块
                tile.classList.add('gold-tile');
                tile.textContent = this.goldSymbols[Math.floor(Math.random() * this.goldSymbols.length)];
                tile.dataset.score = '10';
            } else if (Math.random() < 0.3 && this.requiredSequence.length > 0) {
                // 创建特殊文字块
                tile.classList.add('bonus-tile');
                const bonusIndex = Math.floor(Math.random() * this.requiredSequence.length);
                tile.textContent = this.requiredSequence[bonusIndex];
                tile.dataset.word = this.requiredSequence[bonusIndex];
                tile.dataset.score = this.bonusScores[Math.floor(Math.random() * this.bonusScores.length)];
            }
            
            tile.addEventListener('click', () => this.handleTileClick(tile));
            this.container.appendChild(tile);
            row.push(tile);
        }
        
        this.tiles.push(...row);
        this.lastRowCreatedAt = Date.now();
    }

    handleTileClick(tile) {
        if (!this.gameRunning) return;

        if (tile.classList.contains('gold-tile')) {
            this.score += parseInt(tile.dataset.score);
            tile.style.visibility = 'hidden';
        } else if (tile.classList.contains('bonus-tile')) {
            const word = tile.dataset.word;
            this.score += parseInt(tile.dataset.score);
            tile.style.visibility = 'hidden';
            
            // 收集文字
            this.collectedSequence.push(word);
            this.checkSequence();
        }
        
        this.scoreElement.textContent = this.score;
        this.tileSpeed = 1.5 + Math.floor(this.score / 150) * 0.3;
    }

    checkSequence() {
        let sequence = this.collectedSequence.join('');
        if (sequence === this.requiredSequence.join('')) {
            this.playFireworks();
            this.collectedSequence = [];
        }
    }

    gameLoop() {
        if (!this.gameRunning) return;

        const currentTime = Date.now();
        if (currentTime - this.lastRowCreatedAt > 2000) {
            this.createRow();
        }

        this.tiles.forEach(tile => {
            const currentTop = parseFloat(tile.style.top);
            const newTop = currentTop + this.tileSpeed;
            tile.style.top = newTop + 'px';

            if (newTop > 400) {
                if (tile.classList.contains('gold-tile') && tile.style.visibility !== 'hidden') {
                    this.gameOver();
                    return;
                }
                this.container.removeChild(tile);
                this.tiles = this.tiles.filter(t => t !== tile);
            }
        });

        this.updateTimer();
        requestAnimationFrame(() => this.gameLoop());
    }

    updateTimer() {
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        this.timeElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    async gameOver() {
        this.gameRunning = false;
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            localStorage.setItem('bestScore', this.score);
            this.bestScoreElement.textContent = this.score;
        }
        
        await this.submitScore();
        this.showLeaderboard();
        setTimeout(() => this.resetGame(), 2000);
    }

    async submitScore() {
        const gameTime = Math.floor((Date.now() - this.startTime) / 1000);
        let playerName = prompt('请输入您的名字：');
        
        if (!playerName || playerName.trim() === '') {
            playerName = this.anonymousNames[Math.floor(Math.random() * this.anonymousNames.length)];
        }

        try {
            const response = await fetch('/api/submit-score', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    playerName,
                    score: this.score,
                    time: gameTime
                })
            });
            
            if (!response.ok) throw new Error('提交分数失败');
            
        } catch (error) {
            console.error('提交分数失败:', error);
        }
    }

    async loadLeaderboard(type = 'score') {
        try {
            const response = await fetch(`/api/leaderboard?type=${type}`);
            const data = await response.json();
            
            const leaderboardElement = document.getElementById(`${type}Leaderboard`);
            leaderboardElement.innerHTML = data.map((entry, index) => `
                <div class="leaderboard-entry">
                    <span class="rank">${index + 1}</span>
                    <span class="name">${entry.playerName}</span>
                    <span class="value">${type === 'score' ? 
                        entry.score + '分' : 
                        Math.floor(entry.time / 60) + ':' + (entry.time % 60).toString().padStart(2, '0')
                    }</span>
                </div>
            `).join('');

            // 检查连续用户名是否组成完整祝福语
            await this.checkConsecutiveUsers(data);
        } catch (error) {
            console.error('加载排行榜失败:', error);
        }
    }

    async checkConsecutiveUsers(data) {
        const names = data.map(entry => entry.playerName);
        for (let i = 0; i < names.length - 2; i++) {
            const threeNames = names.slice(i, i + 3).join('');
            if (threeNames === '少年得到7周年生日快乐') {
                this.playFireworks();
                break;
            }
        }
    }

    playFireworks() {
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.top = '0';
        container.style.left = '0';
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.zIndex = '1000';
        document.body.appendChild(container);

        const fireworks = new Fireworks(container, {
            hue: { min: 15, max: 25 }, // 橙色范围
            delay: { min: 15, max: 30 },
            rocketsPoint: 50,
            speed: 1,
            acceleration: 1.05,
            friction: 0.95,
            gravity: 1.5,
            particles: 90,
            trace: 3,
            explosion: 6,
            autoresize: true,
            brightness: { min: 50, max: 80 },
            decay: { min: 0.015, max: 0.03 },
            mouse: { click: false, move: false, max: 1 }
        });

        fireworks.start();
        setTimeout(() => {
            fireworks.stop();
            document.body.removeChild(container);
        }, 5000);
    }

    showLeaderboard() {
        document.getElementById('leaderboardModal').style.display = 'flex';
        this.loadLeaderboard('score');
    }

    hideLeaderboard() {
        document.getElementById('leaderboardModal').style.display = 'none';
    }

    switchLeaderboardTab(type) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === type);
        });
        document.getElementById('scoreLeaderboard').style.display = type === 'score' ? 'block' : 'none';
        document.getElementById('timeLeaderboard').style.display = type === 'time' ? 'block' : 'none';
        this.loadLeaderboard(type);
    }

    resetGame() {
        this.container.innerHTML = `
            <div class="start-screen">
                <h2>游戏说明</h2>
                <p>1. 点击金色方块($、￥)获得10分</p>
                <p>2. 特殊文字方块20-100分</p>
                <p>3. 按顺序点击"少年得到7周年生日快乐"触发礼花</p>
                <p>4. 错过金色方块游戏结束</p>
                <div class="start-btn" id="startBtn">开始游戏</div>
                <div class="leaderboard-btn" id="showLeaderboard">查看排行榜</div>
            </div>
        `;
        this.addEventListeners();
    }
} 