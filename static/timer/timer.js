function initializeTimer() {
    if (window.lucide) {
        lucide.createIcons();
    }

    const pomodoroBtn = document.getElementById('mode-pomodoro');
    const shortBreakBtn = document.getElementById('mode-short-break');
    const longBreakBtn = document.getElementById('mode-long-break');
    const startPauseBtn = document.getElementById('start-pause-btn');
    const resetBtn = document.getElementById('reset-btn');
    const skipBtn = document.getElementById('skip-btn');
    const minutesEl = document.getElementById('minutes');
    const secondsEl = document.getElementById('seconds');
    const playIcon = document.getElementById('play-icon');
    const pauseIcon = document.getElementById('pause-icon');

    const modes = { pomodoro: 45, shortBreak: 5, longBreak: 15 };
    let currentMode = 'pomodoro';
    let totalSeconds = modes[currentMode] * 60;
    let timerInterval;
    let isPaused = true;
    let pomodoroCount = 0;

    pomodoroBtn.addEventListener('click', () => switchMode('pomodoro'));
    shortBreakBtn.addEventListener('click', () => switchMode('shortBreak'));
    longBreakBtn.addEventListener('click', () => switchMode('longBreak'));
    startPauseBtn.addEventListener('click', toggleTimer);
    resetBtn.addEventListener('click', resetTimer);
    skipBtn.addEventListener('click', skipSession);

    function switchMode(newMode) {
        currentMode = newMode;
        resetTimer();
        updateModeButtons();
    }

    function toggleTimer() {
        isPaused = !isPaused;
        if (isPaused) {
            pauseTimer();
        } else {
            startTimer();
        }
    }

    function startTimer() {
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'block';
        timerInterval = setInterval(updateTimer, 1000);
    }

    function pauseTimer() {
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
        clearInterval(timerInterval);
    }

    function resetTimer() {
        clearInterval(timerInterval);
        isPaused = true;
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';

        totalSeconds = modes[currentMode] * 60;
        updateDisplay();
    }

    function skipSession() {
        if (currentMode === 'pomodoro') {
            pomodoroCount++;
            switchMode(pomodoroCount % 4 === 0 ? 'longBreak' : 'shortBreak');
        } else {
            switchMode('pomodoro');
        }
        isPaused = false;
        startTimer();
    }

    function updateTimer() {
        if (totalSeconds <= 0) {
            skipSession();
            return;
        }
        totalSeconds--;
        updateDisplay();
    }

    function updateDisplay() {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        minutesEl.textContent = String(minutes).padStart(2, '0');
        secondsEl.textContent = String(seconds).padStart(2, '0');
    }

    function updateModeButtons() {
        document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`mode-${currentMode}`).classList.add('active');
    }

    updateDisplay();
}

initializeTimer();