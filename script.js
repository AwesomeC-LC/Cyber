document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const problemEl = document.getElementById('problem');
    const scoreEl = document.getElementById('score');
    const messageEl = document.getElementById('message-area');
    const moleHoles = document.querySelectorAll('.mole-hole');
    const moleContents = document.querySelectorAll('.mole-hole .mole-content');
    const startButton = document.getElementById('startButton');
    const timeRemainingEl = document.getElementById('time-remaining');
    const comboCountEl = document.getElementById('combo-count'); 
    const correctCountEl = document.getElementById('correct-count'); 
    const gameDurationInput = document.getElementById('gameDuration');
    const difficultyLevelSelect = document.getElementById('difficultyLevel');
    const musicToggleButton = document.getElementById('musicToggleBtn');
    const musicToggleIcon = musicToggleButton.querySelector('i'); // For changing volume-up/mute icon

    // Game State Variables
    let currentScore = 0;
    let correctAnswer;
    let currentProblemString = "";
    let gameActive = false;
    let problemSolved = true;
    let timeRemaining = 60; 
    let gameTimerIntervalId;
    let moleRefreshIntervalId;
    let comboCount = 0;
    let correctAnswersCount = 0;
    let maxSessionCombo = 0;
    let currentDifficulty = 'normal'; 
    const bgMusic = new Audio('/WhackaMole/music/mc.mp3'); // Create Audio object
    bgMusic.loop = true; // Enable looping

    let userMusicPreference = true; // User's choice via toggle, default ON
    let isMusicActuallyPlaying = false; // Tracks if music is currently playing

    // Game Configuration
    const NUM_HOLES = 9;
    const NUM_DISPLAY_NUMBERS = 4;
    const MOLE_REFRESH_RATE = 1500;
    const FIREWORK_PARTICLE_COUNT = 35; // MODIFIED: Increased particle count
    const FIREWORK_MAX_DURATION = 1100; // MODIFIED: Slightly increased max duration for effect

    // --- Initialization and Game Control ---
    function initGame() {
        currentScore = 0;
        comboCount = 0;
        correctAnswersCount = 0;
        maxSessionCombo = 0;
        timeRemaining = parseInt(gameDurationInput.value) || 60; 
        currentDifficulty = difficultyLevelSelect.value; 

        updateScoreDisplay();
        updateComboDisplay(); 
        updateCorrectAnswersDisplay(); 
        updateTimeDisplay();

        messageEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 准备开始...'; 
        messageEl.className = 'message';
        startButton.innerHTML = '<i class="fas fa-hourglass-start"></i> 游戏中...';
        startButton.disabled = true;
        gameDurationInput.disabled = true;
        difficultyLevelSelect.disabled = true;

        gameActive = true;
        problemSolved = true;
        clearAllMoles();

        setTimeout(() => {
            if (gameActive) {
                generateNewProblemAndDisplay();
                startGameTimer();
                startMoleRefreshLoop();

                // Start music if user has it enabled
                if (userMusicPreference) {
                    bgMusic.play().then(() => {
                        isMusicActuallyPlaying = true;
                    }).catch(error => {
                        console.error("背景音乐播放失败:", error);
                        isMusicActuallyPlaying = false;
                        // Optionally, you could set userMusicPreference to false and update icon
                        // if play fails consistently, to prevent further attempts.
                    });
                }
            }
        }, 1000);
    }

    function updateMusicButtonIcon() {
        if (userMusicPreference) {
            musicToggleIcon.classList.remove('fa-volume-mute');
            musicToggleIcon.classList.add('fa-volume-up');
            musicToggleButton.title = "关闭音乐";
        } else {
            musicToggleIcon.classList.remove('fa-volume-up');
            musicToggleIcon.classList.add('fa-volume-mute');
            musicToggleButton.title = "开启音乐";
        }
    }

    function endGame() {
        gameActive = false;
        startButton.innerHTML = '<i class="fas fa-redo"></i> 重新开始';
        startButton.disabled = false;
        gameDurationInput.disabled = false;
        difficultyLevelSelect.disabled = false;
        // Stop music
        if (isMusicActuallyPlaying) {
            bgMusic.pause();
            bgMusic.currentTime = 0; // Reset audio to the beginning for next play
            isMusicActuallyPlaying = false;
        }
        clearInterval(gameTimerIntervalId);
        clearInterval(moleRefreshIntervalId);
        clearAllMoles();

        problemEl.innerHTML = "-";
        messageEl.innerHTML = `<i class="fas fa-trophy"></i> 游戏结束！你答对了 <strong>${correctAnswersCount}</strong> 题，最高连击 <strong>${maxSessionCombo}</strong> 次！`;
        messageEl.className = 'message game-over';
    }

    function startGameTimer() {
        clearInterval(gameTimerIntervalId);
        gameTimerIntervalId = setInterval(() => {
            timeRemaining--;
            updateTimeDisplay();
            if (timeRemaining <= 0) {
                endGame();
            }
        }, 1000);
    }

    function startMoleRefreshLoop() {
        clearInterval(moleRefreshIntervalId);
        moleRefreshIntervalId = setInterval(() => {
            if (gameActive && !problemSolved) {
                displayNumbersOnMoles();
            }
        }, MOLE_REFRESH_RATE);
    }

    // --- UI Update Functions ---
    function updateScoreDisplay() { scoreEl.textContent = currentScore; }
    function updateTimeDisplay() { timeRemainingEl.textContent = timeRemaining; }
    function updateComboDisplay() { 
        if(comboCountEl) comboCountEl.textContent = comboCount; 
    }
    function updateCorrectAnswersDisplay() { 
        if(correctCountEl) correctCountEl.textContent = correctAnswersCount; 
    }

    function clearAllMoles() {
        moleContents.forEach(mole => {
            mole.innerHTML = ''; // Clear text content and any child particles
            mole.classList.remove('active', 'hit-correct', 'hit-incorrect');
            mole.dataset.value = '';
            mole.style.backgroundColor = ''; 
            mole.style.color = ''; // Reset text color
        });
    }

    // --- Problem Generation (with Difficulty) ---
    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function generateProblem() {
        const operators = ['+', '-', '×', '÷'];
        const operator = operators[getRandomInt(0, 3)];
        let num1, num2, result;
        let attempts = 0; 

        do {
            attempts++;
            if (attempts > 50) { 
                console.warn("Max attempts reached in problem generation, simplifying.");
                num1 = getRandomInt(1,5);
                num2 = getRandomInt(1,5);
                if (operator === '÷') { num1 = num1 * num2; } 
                result = eval(`${num1} ${operator.replace('÷','/')} ${num2}`); 
                break;
            }

            switch (operator) {
                case '+':
                    if (currentDifficulty === 'simple') {
                        num1 = getRandomInt(1, 80); 
                        num2 = getRandomInt(1, 99 - num1); 
                        if (num2 < 1) num2 = 1; 
                    } else { 
                        num1 = getRandomInt(10, 99);
                        num2 = getRandomInt(10, 99);
                    }
                    result = num1 + num2;
                    break;
                case '-':
                    num1 = getRandomInt(10, currentDifficulty === 'simple' ? 99 : 150);
                    num2 = getRandomInt(1, num1 -1); 
                    if (num2 >= num1) num2 = num1 - 1; 
                    if (num2 < 1) num2 = 1;
                    result = num1 - num2;
                    break;
                case '×':
                    if (currentDifficulty === 'simple') {
                        if (Math.random() < 0.6) { 
                            num1 = getRandomInt(2, 9);
                            num2 = getRandomInt(2, Math.min(12, Math.floor(99 / num1)));
                            if (num2 < 2) num2 = 2; 
                        } else { 
                            num1 = getRandomInt(2, 9);
                            num2 = getRandomInt(2, 9);
                        }
                    } else { 
                        num1 = getRandomInt(2, 15); 
                        num2 = getRandomInt(2, 15);
                        if (num1 > 9 && num2 > 9 && Math.random() > 0.3) { 
                             num1 = getRandomInt(2,9);
                        }
                    }
                    result = num1 * num2;
                    break;
                case '÷':
                    let divisor, quotient;
                    if (currentDifficulty === 'simple') {
                        divisor = getRandomInt(2, 9);
                        quotient = getRandomInt(2, Math.min(9, Math.floor(99 / divisor)));
                        if (quotient < 2) quotient = 2;
                    } else {
                        divisor = getRandomInt(2, 12);
                        quotient = getRandomInt(2, 12);
                    }
                    num1 = divisor * quotient;
                    num2 = divisor;
                    result = quotient;
                    break;
            }
        } while (currentDifficulty === 'simple' && (result > 99 || result < 0));

        correctAnswer = result;
        currentProblemString = `${num1} ${operator} ${num2} = ?`;
        return currentProblemString;
    }

    function generateDistractors(answer) {
        const distractors = new Set();
        let attempts = 0;
        while (distractors.size < NUM_DISPLAY_NUMBERS - 1 && attempts < 50) {
            attempts++;
            let distractor;
            const offsetRange = currentDifficulty === 'simple' ? 10 : 15;
            let offset = getRandomInt(1, offsetRange);
            if (Math.random() < 0.5) offset *= -1;
            distractor = answer + offset;

            if (distractor !== answer && distractor >= 0) {
                if (currentDifficulty === 'simple' && distractor > 99) {
                    distractor = getRandomInt(0,99);
                    if (distractor === answer) continue; 
                }
                distractors.add(distractor);
            }
        }
        while (distractors.size < NUM_DISPLAY_NUMBERS - 1) {
            let fallbackDistractor = getRandomInt(Math.max(0, answer - 20), answer + 20);
            if (currentDifficulty === 'simple') {
                fallbackDistractor = getRandomInt(0,99);
            }
            if (fallbackDistractor !== answer && fallbackDistractor >=0) {
                distractors.add(fallbackDistractor);
            }
            if (distractors.has(fallbackDistractor) && distractors.size < NUM_DISPLAY_NUMBERS -1 && Math.random() > 0.9) break;
        }
        return Array.from(distractors);
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function displayNumbersOnMoles() {
        if (!gameActive || problemSolved) return;

        clearAllMoles(); 

        const distractors = generateDistractors(correctAnswer);
        const numbersToDisplay = shuffleArray([correctAnswer, ...distractors]);

        const availableHoleIndices = Array.from({ length: NUM_HOLES }, (_, i) => i);
        const chosenHoleIndices = [];

        for (let i = 0; i < Math.min(NUM_DISPLAY_NUMBERS, NUM_HOLES); i++) {
            if (availableHoleIndices.length === 0) break;
            const randomIndex = getRandomInt(0, availableHoleIndices.length - 1);
            chosenHoleIndices.push(availableHoleIndices.splice(randomIndex, 1)[0]);
        }

        chosenHoleIndices.forEach((holeIndex, i) => {
            if (i < numbersToDisplay.length) {
                const moleContent = moleContents[holeIndex];
                moleContent.textContent = numbersToDisplay[i]; // Set number (will be visible)
                moleContent.dataset.value = numbersToDisplay[i];
                moleContent.classList.add('active');
            }
        });
    }

    function generateNewProblemAndDisplay() {
        if (!gameActive) return;

        problemSolved = false;
        const problemText = generateProblem();
        problemEl.innerHTML = `${problemText}`; 
        displayNumbersOnMoles();
        messageEl.innerHTML = '<i class="fas fa-search"></i> 请找出正确答案！';
        messageEl.className = 'message';
    }

    // --- Firework Effect ---
    function createFireworks(containerElement) {
        // MODIFIED: Brighter and more distinct colors
        const colors = ['#FFEB3B', '#FFC107', '#FF9800', '#FF5722', '#F44336', '#E91E63', '#03A9F4', '#4CAF50', '#CDDC39']; 
        
        containerElement.innerHTML = ''; // Clear previous content (like the number text node)

        for (let i = 0; i < FIREWORK_PARTICLE_COUNT; i++) {
            const particle = document.createElement('span');
            particle.classList.add('firework-particle');

            const angle = Math.random() * Math.PI * 2;
            // MODIFIED: Increased spread radius
            const radius = Math.random() * 70 + 50; // Spread radius (50px to 120px from center)
            
            const targetX = Math.cos(angle) * radius;
            const targetY = Math.sin(angle) * radius;

            const duration = Math.random() * 0.7 + 0.4; // Duration 0.4s to 1.1s
            const delay = Math.random() * 0.2; // Delay up to 0.2s

            const particleColor = colors[Math.floor(Math.random() * colors.length)];
            particle.style.backgroundColor = particleColor; // Used by box-shadow currentColor
            particle.style.setProperty('--tx', `${targetX}px`);
            particle.style.setProperty('--ty', `${targetY}px`);
            
            particle.style.animation = `firework-particle-animation ${duration}s ${delay}s forwards`;
            
            containerElement.appendChild(particle);

            setTimeout(() => {
                if (particle.parentNode) {
                    particle.parentNode.removeChild(particle);
                }
            }, (duration + delay) * 1000 + 100); // Remove particle after animation + buffer
        }
    }

    function handleMoleClick(event) {
        if (!gameActive || problemSolved) return;

        const clickedMoleContent = event.target.closest('.mole-content');
        if (!clickedMoleContent || !clickedMoleContent.classList.contains('active')) {
            return;
        }

        const clickedValue = parseInt(clickedMoleContent.dataset.value);

        if (clickedValue === correctAnswer) {
            problemSolved = true;
            currentScore += (currentDifficulty === 'simple' ? 5 : 10); 
            comboCount++;
            if (comboCount > maxSessionCombo) maxSessionCombo = comboCount;
            correctAnswersCount++;

            updateScoreDisplay();
            updateComboDisplay();
            updateCorrectAnswersDisplay();

            messageEl.innerHTML = '<i class="fas fa-thumbs-up"></i> 正确！太棒了！';
            messageEl.className = 'message correct';
            
            const originalBg = clickedMoleContent.style.backgroundColor;
            clickedMoleContent.style.backgroundColor = 'transparent'; // Make mole background transparent for fireworks
            
            createFireworks(clickedMoleContent); // Create fireworks (this will clear the number text)

            clearInterval(moleRefreshIntervalId); 
            
            moleContents.forEach(m => {
                if (m !== clickedMoleContent) {
                    m.classList.remove('active'); 
                    m.innerHTML = ''; // Clear other moles' numbers too
                }
            });
            // clickedMoleContent remains 'active' visually, but its content is now fireworks

            setTimeout(() => {
                if (gameActive) {
                    // Restore background before clearing fully.
                    // clearAllMoles will reset to default or defined CSS background.
                    // clickedMoleContent.style.backgroundColor = originalBg || ''; 
                    clearAllMoles(); 
                    generateNewProblemAndDisplay();
                    startMoleRefreshLoop();
                }
            }, FIREWORK_MAX_DURATION + 150); // MODIFIED: Adjusted timeout

        } else {
            currentScore = Math.max(0, currentScore - (currentDifficulty === 'simple' ? 1 : 2));
            comboCount = 0;
            updateScoreDisplay();
            updateComboDisplay();

            messageEl.innerHTML = `<i class="fas fa-times-circle"></i> 错误！正确答案是 <strong>${correctAnswer}</strong>。再试试！`;
            messageEl.className = 'message incorrect';
            clickedMoleContent.classList.add('hit-incorrect'); 

            setTimeout(() => {
                if (gameActive) {
                    clickedMoleContent.classList.remove('hit-incorrect');
                    messageEl.innerHTML = '<i class="fas fa-search"></i> 请继续找出正确答案！'; 
                    messageEl.className = 'message';
                }
            }, 1200); 
        }
    }

    // --- Event Listeners ---
    startButton.addEventListener('click', initGame);

    musicToggleButton.addEventListener('click', () => {
        userMusicPreference = !userMusicPreference; // Toggle user's preference
        updateMusicButtonIcon();

        if (userMusicPreference) {
            // User wants music ON
            if (gameActive && !isMusicActuallyPlaying) { // If game is running and music isn't already playing
                bgMusic.play().then(() => {
                    isMusicActuallyPlaying = true;
                }).catch(error => {
                    console.error("尝试播放音乐失败:", error);
                    isMusicActuallyPlaying = false;
                });
            }
            // If game is not active, preference is stored and music will play on next game start.
        } else {
            // User wants music OFF
            if (isMusicActuallyPlaying) {
                bgMusic.pause();
                isMusicActuallyPlaying = false;
            }
        }
    });

    moleHoles.forEach(hole => {
        const content = hole.querySelector('.mole-content');
        if (content) {
            content.addEventListener('click', handleMoleClick);
            content.addEventListener('touchmove', function(e) { e.preventDefault(); }, { passive: false });
        }
    });


    // Initial setup
    messageEl.innerHTML = '<i class="fas fa-info-circle"></i> 设置时长与难度，点击“开始游戏”按钮吧！';
    timeRemainingEl.textContent = gameDurationInput.value; 
    gameDurationInput.addEventListener('change', () => {
        if (!gameActive) {
            timeRemainingEl.textContent = gameDurationInput.value;
        }
    });
    difficultyLevelSelect.addEventListener('change', () => {
        if (!gameActive) {
            currentDifficulty = difficultyLevelSelect.value;
        }
    });
    // ... (existing code) ...
    updateMusicButtonIcon(); // Set the initial state of the music button icon

});
