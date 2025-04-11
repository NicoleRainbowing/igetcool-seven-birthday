class Game {
    constructor() {
        this.container = document.getElementById('game-container');
        this.scoreElement = document.getElementById('score');
        this.bestScoreElement = document.getElementById('bestScore');
        this.messageElement = document.getElementById('message');
        this.score = 0;
        this.bestScore = 0; // 初始化为0
        this.tiles = [];
        this.gameRunning = false;
        this.bonusWords = ['少', '年', '得', '到', '7', '周', '年', '生', '日', '快', '乐'];
        this.bonusProgress = [];
        this.tileSpeed = 1.5;
        this.loadBestScore(); // 从服务器加载最高分
        this.init();
        this.startTime = 0;
        this.timerInterval = null;
        this.timerElement = document.getElementById('timer');
        this.initLeaderboard();
        this.defaultNames = {
            '少年得到': 0,
            '7周年': 0,
            '生日快乐': 0
        };
        this.loadDefaultNamesCount();
        this.rowSpacing = 150; // 行间距
        this.lastRowCreatedAt = 0; // 记录上一行创建的时间
        this.goldSymbols = ['$', '￥', '💰'];  // 减少为三种字符
        this.currentScore = null;  // 添加当前分数记录
        this.currentPlayerName = null;  // 添加当前玩家名称记录
    }

    init() {
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
        this.tileSpeed = 1.5;
        this.lastRowCreatedAt = Date.now();
        this.createNewRow();
        this.gameLoop();
        this.startTime = Date.now();
        this.startTimer();
        this.updateProgressDisplay();
    }

    createNewRow() {
        const hasBonus = Math.random() < 0.5 && this.bonusProgress.length < this.bonusWords.length;
        
        const positions = [0, 1, 2];
        const goldPosition = positions[Math.floor(Math.random() * positions.length)];
        let bonusPosition = -1;
        if (hasBonus) {
            const availablePositions = positions.filter(p => p !== goldPosition);
            bonusPosition = availablePositions[Math.floor(Math.random() * availablePositions.length)];
        }

        for (let i = 0; i < 3; i++) {
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.style.left = (i * 100) + 'px';
            tile.style.top = '-120px';

            if (i === goldPosition) {
                tile.className = 'tile gold-tile';
                // 调整随机分布
                const randomValue = Math.random();
                let symbol;
                if (randomValue < 0.4) {         // 40% 概率显示 $
                    symbol = '$';
                } else if (randomValue < 0.8) {  // 40% 概率显示 ￥
                    symbol = '￥';
                } else {                         // 20% 概率显示 💰
                    symbol = '💰';
                }
                tile.textContent = symbol;
                
                // 调整 emoji 大小
                if (symbol === '💰') {
                    tile.style.fontSize = '32px';
                }
            } else if (i === bonusPosition) {
                tile.className = 'tile bonus-tile';
                const nextBonusWord = this.bonusWords[this.bonusProgress.length];
                tile.textContent = nextBonusWord;
                tile.dataset.bonus = 'true';
                tile.dataset.word = nextBonusWord;
            }

            tile.addEventListener('click', () => this.handleTileClick(tile));
            this.container.appendChild(tile);
            this.tiles.push(tile);
        }
        
        this.lastRowCreatedAt = Date.now();
    }

    handleTileClick(tile) {
        if (!tile.classList.contains('gold-tile') && !tile.classList.contains('bonus-tile')) {
            this.gameOver();
            return;
        }

        if (tile.classList.contains('bonus-tile')) {
            const word = tile.dataset.word;
            if (this.bonusWords[this.bonusProgress.length] === word) {
                this.bonusProgress.push(word);
                this.score += Math.floor(Math.random() * 5 + 1) * 20;
                this.updateProgressDisplay();
                
                if (this.bonusProgress.length === this.bonusWords.length) {
                    this.gameWin();
                }
            } else {
                this.bonusProgress = [];
                this.messageElement.textContent = '顺序错误，重新开始收集';
                setTimeout(() => {
                    this.updateProgressDisplay();
                }, 1500);
            }
        } else {
            this.score += 10;
        }

        this.scoreElement.textContent = this.score;
        tile.style.visibility = 'hidden';
        this.tileSpeed = 1.5 + Math.floor(this.score / 150) * 0.3;
    }

    updateBestScore() {
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            this.bestScoreElement.textContent = this.bestScore;
        }
    }

    gameLoop() {
        if (!this.gameRunning) return;

        // 计算从上一行创建到现在经过的时间
        const timeSinceLastRow = Date.now() - this.lastRowCreatedAt;

        this.tiles.forEach(tile => {
            const currentTop = parseFloat(tile.style.top);
            const newTop = currentTop + this.tileSpeed;
            tile.style.top = newTop + 'px';

            if (currentTop > 400) {
                if (tile.classList.contains('gold-tile') && tile.style.visibility !== 'hidden') {
                    this.gameOver();
                    return;
                }
                this.container.removeChild(tile);
                this.tiles = this.tiles.filter(t => t !== tile);
            }
        });

        // 只有当距离上一行创建已经过去足够时间时才创建新行
        // 根据速度动态调整创建新行的时间间隔
        const minTimeInterval = this.rowSpacing / this.tileSpeed * 16; // 16ms 是一帧的时间
        if (this.tiles.length === 0 || timeSinceLastRow > minTimeInterval) {
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
        let playerName = prompt('请输入您的名字：');
        
        // 如果用户取消输入或输入为空，使用默认名称
        if (!playerName || playerName.trim() === '') {
            const defaultNames = ['少年得到', '7周年', '生日快乐'];
            playerName = defaultNames[Math.floor(Math.random() * defaultNames.length)];
        }

        // 记录当前分数和玩家名称
        this.currentScore = this.score;
        this.currentPlayerName = playerName;

        try {
            const response = await fetch('/api/submit-score', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    playerName,
                    score: this.score,
                    time: gameTime,
                    completed: isCompleted
                })
            });
            
            if (response.ok) {
                this.showLeaderboard();
                setTimeout(() => {
                    this.resetGame();
                }, 2000);
            }
        } catch (error) {
            console.error('提交分数失败:', error);
            this.resetGame();
        }
    }

    async loadLeaderboard(type = 'score') {
        try {
            const response = await fetch(`/api/leaderboard?type=${type}`);
            const data = await response.json();
            
            const leaderboardElement = document.getElementById(`${type}Leaderboard`);
            leaderboardElement.innerHTML = data.map((entry, index) => {
                const isCurrentScore = this.currentPlayerName === entry.playerName && 
                                     this.currentScore === entry.score;
                
                return `
                    <div class="leaderboard-entry ${isCurrentScore ? 'is-current' : ''}" 
                         id="${isCurrentScore ? 'current-score' : ''}"
                         data-rank="${index + 1}"
                    >
                        <span class="rank">${index + 1}</span>
                        <span class="name">${entry.playerName}</span>
                        <span class="value">${type === 'score' ? 
                            entry.score + '分' : 
                            Math.floor(entry.time / 60) + ':' + (entry.time % 60).toString().padStart(2, '0')
                        }</span>
                    </div>
                `;
            }).join('');

            // 延迟执行滚动，确保DOM已完全渲染
            setTimeout(() => {
                const currentScoreElement = document.getElementById('current-score');
                if (currentScoreElement) {
                    // 获取父容器
                    const container = document.querySelector('.leaderboard-list');
                    // 获取当前成绩条目的位置
                    const elementPosition = currentScoreElement.offsetTop;
                    // 获取容器的高度
                    const containerHeight = container.clientHeight;
                    // 计算滚动位置，使当前成绩显示在容器中间
                    const scrollPosition = elementPosition - (containerHeight / 2) + (currentScoreElement.clientHeight / 2);
                    
                    container.scrollTo({
                        top: Math.max(0, scrollPosition),
                        behavior: 'smooth'
                    });
                }
            }, 100);

            await this.checkConsecutiveUsers(data);
        } catch (error) {
            console.error('加载排行榜失败:', error);
        }
    }

    showLeaderboard() {
        document.getElementById('leaderboardModal').style.display = 'flex';
        // 默认显示分数排行榜并激活对应标签
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.tab === 'score') {
                btn.classList.add('active');
            }
        });
        document.getElementById('scoreLeaderboard').style.display = 'block';
        document.getElementById('timeLeaderboard').style.display = 'none';
        this.loadLeaderboard('score');
    }

    hideLeaderboard() {
        document.getElementById('leaderboardModal').style.display = 'none';
    }

    gameOver() {
        this.stopTimer();
        this.gameRunning = false;
        this.updateBestScore();
        this.messageElement.textContent = '游戏结束！最终得分：' + this.score;
        this.submitScore(false);
    }

    gameWin() {
        this.stopTimer();
        this.gameRunning = false;
        this.updateBestScore();
        this.submitScore(true);
        this.messageElement.textContent = '恭喜通关！生日快乐！最终得分：' + this.score;
    }

    // 添加新方法用于重置游戏界面
    resetGame() {
        this.gameRunning = false;
        this.score = 0;
        this.bonusProgress = [];
        this.tiles = [];
        this.stopTimer();
        
        // 重新加载最高分
        this.loadBestScore();
        
        this.container.innerHTML = `
            <div class="start-screen">
                <h2>游戏说明</h2>
                <p>1. 错过或点错金色方块即游戏结束</p>
                <p>2. 金色方块10分，特殊文字方块20-100分</p>
                <p>3. 顺序收集"少年得到7周年生日快乐"可进入通关计时榜</p>
                <p>4. 同IP匿名在排行榜上刷出收集文字有特殊奖励</p>
                <div class="start-btn" id="startBtn">开始游戏</div>
                <div class="leaderboard-btn" id="showLeaderboard">查看排行榜</div>
            </div>
        `;
        
        this.init();
        this.messageElement.textContent = '';
        this.scoreElement.textContent = '0';
        this.timerElement.textContent = '0:00';
        this.currentScore = null;  // 重置当前分数
        this.currentPlayerName = null;  // 重置当前玩家名称
    }

    updateProgressDisplay() {
        const progress = this.bonusWords.map((word, index) => {
            if (index < this.bonusProgress.length) {
                return `<span style="color: #FF4F00">${word}</span>`;
            }
            return `<span style="color: #999">${word}</span>`;
        }).join('');
        
        this.messageElement.innerHTML = `收集进度：${progress}`;
    }

    // 添加加载最高分的方法
    async loadBestScore() {
        try {
            const response = await fetch('/api/best-score');
            const data = await response.json();
            this.bestScore = data.bestScore;
            this.bestScoreElement.textContent = this.bestScore;
        } catch (error) {
            console.error('加载最高分失败:', error);
        }
    }

    // 添加新方法，用于加载默认名字的使用次数
    async loadDefaultNamesCount() {
        try {
            const response = await fetch('/api/leaderboard?type=score');
            const data = await response.json();
            
            // 重置计数
            this.defaultNames = {
                '少年得到': 0,
                '7周年': 0,
                '生日快乐': 0
            };
            
            // 统计每个默认名字在排行榜中出现的次数
            data.forEach(entry => {
                if (this.defaultNames.hasOwnProperty(entry.playerName)) {
                    this.defaultNames[entry.playerName]++;
                }
            });
        } catch (error) {
            console.error('加载名字统计失败:', error);
        }
    }

    // 获取使用次数最少的默认名字
    getRandomDefaultName() {
        const names = Object.entries(this.defaultNames);
        // 找出最小使用次数
        const minCount = Math.min(...names.map(([_, count]) => count));
        // 筛选出使用次数最少的名字
        const leastUsedNames = names.filter(([_, count]) => count === minCount)
            .map(([name]) => name);
        // 从使用次数最少的名字中随机选择一个
        return leastUsedNames[Math.floor(Math.random() * leastUsedNames.length)];
    }

    // 修改检查连续用户的函数
    async checkConsecutiveUsers(leaderboard) {
        console.log('Checking consecutive users:', leaderboard);
        for (let i = 0; i < leaderboard.length - 2; i++) {
            const user1 = leaderboard[i].playerName;
            const user2 = leaderboard[i + 1].playerName;
            const user3 = leaderboard[i + 2].playerName;

            // 提取IP后缀
            const ip1 = user1.split('-')[1];
            const ip2 = user2.split('-')[1];
            const ip3 = user3.split('-')[1];

            console.log('Checking users:', user1, user2, user3);
            console.log('IP suffixes:', ip1, ip2, ip3);

            // 检查是否为指定三个名字且IP相同
            if (user1.startsWith('少年得到') && 
                user2.startsWith('7周年') && 
                user3.startsWith('生日快乐') && 
                ip1 === ip2 && ip2 === ip3) {
                console.log('Triggering fireworks!');
                await this.playFireworks();
                break;
            }
        }
    }

    // 修改礼花效果函数
    async playFireworks() {
        try {
            const duration = 5000; // 持续5秒
            const animationEnd = Date.now() + duration;
            const defaults = { 
                startVelocity: 30,
                spread: 360,
                ticks: 60,
                zIndex: 9999,
                shapes: ['square'],
                colors: ['#FF4F00', '#FFA500', '#FFD700'] // 爱马仕橙色系
            };

            function randomInRange(min, max) {
                return Math.random() * (max - min) + min;
            }

            const interval = setInterval(function() {
                const timeLeft = animationEnd - Date.now();

                if (timeLeft <= 0) {
                    return clearInterval(interval);
                }

                const particleCount = 50 * (timeLeft / duration);

                // 从左右两侧发射
                confetti({
                    ...defaults,
                    particleCount,
                    origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
                });
                confetti({
                    ...defaults,
                    particleCount,
                    origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
                });
            }, 250);

            // 等待动画结束
            await new Promise(resolve => setTimeout(resolve, duration));
        } catch (error) {
            console.error('Error playing confetti:', error);
        }
    }
}

window.onload = () => new Game(); 