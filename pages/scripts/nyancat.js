        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        const loadingText = document.getElementById('loading');
        const retryButton = document.getElementById('retryButton');
        
        // Set game dimensions
        canvas.width = 400;
        canvas.height = 600;

        // Game variables
        let score = 0;
        let gameOver = false;
        let gameStarted = false;
        let highScore = 0;
        
        // Nyan Cat
        const cat = {
            x: canvas.width / 4,
            y: canvas.height / 2,
            velocity: 0,
            width: 60,
            height: 40
        };

        // Pipes array
        let pipes = [];
        
        // Load images
        const catImg = new Image();
        catImg.src = 'ncat_assets/nyancat.png';
        const pipeImg = new Image();
        pipeImg.src = 'ncat_assets/pipe.png';
        const bgImg = new Image();
        bgImg.src = 'ncat_assets/background.png';

        // Game constants
        const GRAVITY = 0.5;
        const JUMP = -8;
        const PIPE_SPEED = 3;
        const PIPE_GAP = 200;

        // Reset game function
        function resetGame() {
            score = 0;
            gameOver = false;
            gameStarted = true;
            pipes = [];
            cat.y = canvas.height / 2;
            cat.velocity = 0;
            retryButton.style.display = 'none';
            gameLoop();
            console.log("Game reset");
        }

        // Handle retry button click
        retryButton.addEventListener('click', function(e) {
            e.preventDefault();
            resetGame();
        });

        // Handle input
        function handleInput(e) {
            e.preventDefault();
            if (!gameStarted) {
                gameStarted = true;
                gameLoop();
                console.log("Game started");
                return;
            }
            if (!gameOver) {
                cat.velocity = JUMP;
            }
        }

        // Input event listeners
        document.addEventListener('click', function(e) {
            if (e.target !== retryButton) {
                handleInput(e);
            }
        });
        
        document.addEventListener('touchstart', function(e) {
            if (e.target !== retryButton) {
                handleInput(e);
            }
        });
        
        document.addEventListener('keydown', function(e) {
            if (e.code === 'Space') {
                handleInput(e);
            }
        });

        // Spawn pipes
        function spawnPipe() {
            const gapY = Math.random() * (canvas.height - PIPE_GAP - 100) + 50;
            pipes.push({
                x: canvas.width,
                gapY: gapY,
                width: 80,
                scored: false
            });
        }

        // Draw start screen
        function drawStartScreen() {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'white';
            ctx.font = '30px Arial';
            const text = 'Tap to Start';
            ctx.fillText(text, canvas.width/2 - ctx.measureText(text).width/2, canvas.height/2);
            
            if (highScore > 0) {
                ctx.font = '20px Arial';
                const highScoreText = `High Score: ${highScore}`;
                ctx.fillText(highScoreText, canvas.width/2 - ctx.measureText(highScoreText).width/2, canvas.height/2 + 40);
            }
        }

        function sendScoreToTelegram(score) {
            if (window.TelegramGameProxy) {
                try {
                    window.TelegramGameProxy.setGameScore(score);
                } catch (e) {
                    console.error("Gagal kirim skor ke Telegram:", e);
                }
            } else {
                console.warn("TelegramGameProxy nggak tersedia");
            }
        }


        // Game loop
        function gameLoop() {
            // Clear canvas
            ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

            if (!gameStarted) {
                drawStartScreen();
                requestAnimationFrame(gameLoop);
                return;
            }

            // Update cat
            cat.velocity += GRAVITY;
            cat.y += cat.velocity;

            // Draw cat
            ctx.drawImage(catImg, cat.x, cat.y, cat.width, cat.height);

            // Update and draw pipes
            for (let i = pipes.length - 1; i >= 0; i--) {
                const pipe = pipes[i];
                pipe.x -= PIPE_SPEED;

                // Draw pipes
                ctx.drawImage(pipeImg, pipe.x, 0, pipe.width, pipe.gapY);
                ctx.drawImage(pipeImg, pipe.x, pipe.gapY + PIPE_GAP, pipe.width, canvas.height);

                // Check collision
                if (cat.x + cat.width > pipe.x && 
                    cat.x < pipe.x + pipe.width && 
                    (cat.y < pipe.gapY || cat.y + cat.height > pipe.gapY + PIPE_GAP)) {
                    gameOver = true;
                }

                // Score points
                if (!pipe.scored && cat.x > pipe.x + pipe.width) {
                    score++;
                    pipe.scored = true;
                }

                // Remove off-screen pipes
                if (pipe.x + pipe.width < 0) {
                    pipes.splice(i, 1);
                }
            }

            // Spawn new pipes
            if (pipes.length === 0 || pipes[pipes.length - 1].x < canvas.width - 300) {
                spawnPipe();
            }

            // Check boundaries
            if (cat.y + cat.height > canvas.height || cat.y < 0) {
                gameOver = true;
            }

            // Draw score
            ctx.fillStyle = 'white';
            ctx.font = '24px Arial';
            ctx.fillText(`Score: ${score}`, 10, 30);

            if (gameOver) {
                // Update high score
                if (score > highScore) {
                    highScore = score;
                }

                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Game Over text with rainbow effect
                ctx.font = '48px Arial';
                const gameOverText = 'Game Over!';
                const gradient = ctx.createLinearGradient(
                    canvas.width/2 - 100,
                    canvas.height/2 - 24,
                    canvas.width/2 + 100,
                    canvas.height/2 - 24
                );
                gradient.addColorStop(0, '#ff0000');
                gradient.addColorStop(0.2, '#ff7f00');
                gradient.addColorStop(0.4, '#ffff00');
                gradient.addColorStop(0.6, '#00ff00');
                gradient.addColorStop(0.8, '#0000ff');
                gradient.addColorStop(1, '#8f00ff');
                
                ctx.fillStyle = gradient;
                ctx.fillText(gameOverText, canvas.width/2 - ctx.measureText(gameOverText).width/2, canvas.height/2 - 20);
                
                // Score text
                ctx.fillStyle = 'white';
                ctx.font = '24px Arial';
                const finalScoreText = `Final Score: ${score}`;
                const highScoreText = `High Score: ${highScore}`;
                ctx.fillText(finalScoreText, canvas.width/2 - ctx.measureText(finalScoreText).width/2, canvas.height/2 + 20);
                ctx.fillText(highScoreText, canvas.width/2 - ctx.measureText(highScoreText).width/2, canvas.height/2 + 50);
                
                // Show retry button
                retryButton.style.display = 'block';
                
                // Send score to Telegram
                window.TelegramGameProxy.setGameScore(score);

                // sendScoreToTelegram(score);
                return;
              

            }
            

            requestAnimationFrame(gameLoop);
        }

        // Start game when images are loaded
        Promise.all([
            new Promise(resolve => catImg.onload = resolve),
            new Promise(resolve => pipeImg.onload = resolve),
            new Promise(resolve => bgImg.onload = resolve)
        ]).then(() => {
            console.log("All assets loaded");
            loadingText.style.display = 'none';
            canvas.style.display = 'block';
            drawStartScreen();
        }).catch(error => {
            console.error("Error loading assets:", error);
            loadingText.textContent = "Error loading game assets. Please refresh.";
        });

        // Debug info
        console.log("Game initialized");
        if (window.TelegramGameProxy) {
            console.log("TelegramGameProxy available");
        } else {
            console.log("TelegramGameProxy not available");
        }
