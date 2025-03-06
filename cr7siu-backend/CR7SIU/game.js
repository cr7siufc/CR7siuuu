// Add this to your HTML <head> or before </body>:
// <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>

const API_URL = 'http://localhost:3000'; // Change to your deployed URL later

// Player data (initially empty, loaded from server or migrated from localStorage)
let username = '';
let currentPoints = 0;
let playerLevel = 1;
let currentTokens = 0;
let attributes = {};
let tasksCompleted = { youtube: false, xAccount: false, facebook: false };
let referralUsers = [];
let lastAdClaim = 0;
let lastCheckInClaim = 0;
let lastSpinClaim = 0;
let lastTaskClaims = { youtube: 0, xAccount: 0, facebook: 0 };
let lastRewardsClaim = 0;

// Wheel data
const wheelRewards = [500, 1000, 1500, 2000, 2500, 300];
const wheelColors = ["#FF4500", "#32CD32", "#1E90FF", "#FFD700", "#FF00FF", "#00CED1"];
let isSpinning = false;

// Penalty Shootout game state
let penaltyGameActive = false;
let penaltyShotsTaken = 0;
let penaltyScore = 0;
let penaltyStreak = 0;
let penaltyMultiplier = 1;
let isSuddenDeath = false;
let gameOver = false;
let ballX, ballY, targetX, targetY;
let goalkeeperX;
let isShooting = false;
let shotFrame = 0;
let goalkeeperDiveDirection = 'center';
let playerState = 'standing';
let feedbackMessage = '';
let feedbackTimer = 0;
let selectedPower = 'medium';
let shotDirection = null;
let ballRotation = 0;
let crowdCheer = true;
let celebrationTimer = 0;

// Migration function
function migrateLocalStorageData() {
    const localUsername = localStorage.getItem("username");
    if (localUsername && !localStorage.getItem("migrated")) { // Only migrate if username exists and not migrated yet
        username = localUsername;
        currentPoints = parseInt(localStorage.getItem("points")) || 0;
        playerLevel = parseInt(localStorage.getItem("level")) || 1;
        currentTokens = parseInt(localStorage.getItem("tokens")) || 0;
        attributes = JSON.parse(localStorage.getItem("attributes")) || {};
        tasksCompleted = JSON.parse(localStorage.getItem("tasksCompleted")) || { youtube: false, xAccount: false, facebook: false };
        referralUsers = JSON.parse(localStorage.getItem("referralUsers")) || [];
        lastAdClaim = parseInt(localStorage.getItem("lastAdClaim")) || 0;
        lastCheckInClaim = parseInt(localStorage.getItem("lastCheckInClaim")) || 0;
        lastSpinClaim = parseInt(localStorage.getItem("lastSpinClaim")) || 0;
        lastTaskClaims = JSON.parse(localStorage.getItem("lastTaskClaims")) || { youtube: 0, xAccount: 0, facebook: 0 };
        lastRewardsClaim = parseInt(localStorage.getItem("lastRewardsClaim")) || 0;

        // Save to server
        const playerData = {
            username,
            points: currentPoints,
            level: playerLevel,
            tokens: currentTokens,
            attributes: JSON.stringify(attributes),
            tasksCompleted: JSON.stringify(tasksCompleted),
            referralUsers: JSON.stringify(referralUsers),
            lastAdClaim,
            lastCheckInClaim,
            lastSpinClaim,
            lastTaskClaims: JSON.stringify(lastTaskClaims),
            lastRewardsClaim
        };
        axios.post(`${API_URL}/save`, playerData)
            .then(response => {
                console.log("Migration successful:", response.data.message);
                // Mark as migrated and clear localStorage
                localStorage.setItem("migrated", "true");
                localStorage.clear();
                loadFromServer(username, loadSession);
            })
            .catch(error => console.error("Migration failed:", error));
    } else if (localUsername) {
        // Already migrated, clear localStorage and load from server
        localStorage.clear();
        loadFromServer(localUsername, loadSession);
    } else {
        // New user, show username setup
        const setupElement = document.getElementById("username-setup");
        if (setupElement) {
            setupElement.classList.remove("hidden");
            const inputElement = document.getElementById("username-input");
            if (inputElement) inputElement.focus();
        }
    }
}

// Save all player data to server
function saveToServer() {
    const playerData = {
        username,
        points: currentPoints,
        level: playerLevel,
        tokens: currentTokens,
        attributes: JSON.stringify(attributes),
        tasksCompleted: JSON.stringify(tasksCompleted),
        referralUsers: JSON.stringify(referralUsers),
        lastAdClaim,
        lastCheckInClaim,
        lastSpinClaim,
        lastTaskClaims: JSON.stringify(lastTaskClaims),
        lastRewardsClaim
    };
    axios.post(`${API_URL}/save`, playerData)
        .then(response => console.log(response.data.message))
        .catch(error => console.error('Error saving to server:', error));
}

// Load player data from server
function loadFromServer(username, callback) {
    axios.get(`${API_URL}/player/${username}`)
        .then(response => {
            if (response.data.error) {
                console.log('New player or no server data, starting fresh');
                currentPoints = 0;
                playerLevel = 1;
                currentTokens = 0;
                attributes = {};
                tasksCompleted = { youtube: false, xAccount: false, facebook: false };
                referralUsers = [];
                lastAdClaim = 0;
                lastCheckInClaim = 0;
                lastSpinClaim = 0;
                lastTaskClaims = { youtube: 0, xAccount: 0, facebook: 0 };
                lastRewardsClaim = 0;
                saveToServer(); // Save initial data
            } else {
                username = response.data.username;
                currentPoints = parseInt(response.data.points) || 0;
                playerLevel = parseInt(response.data.level) || 1;
                currentTokens = parseInt(response.data.tokens) || 0;
                attributes = response.data.attributes ? JSON.parse(response.data.attributes) : {};
                tasksCompleted = response.data.tasksCompleted ? JSON.parse(response.data.tasksCompleted) : { youtube: false, xAccount: false, facebook: false };
                referralUsers = response.data.referralUsers ? JSON.parse(response.data.referralUsers) : [];
                lastAdClaim = parseInt(response.data.lastAdClaim) || 0;
                lastCheckInClaim = parseInt(response.data.lastCheckInClaim) || 0;
                lastSpinClaim = parseInt(response.data.lastSpinClaim) || 0;
                lastTaskClaims = response.data.lastTaskClaims ? JSON.parse(response.data.lastTaskClaims) : { youtube: 0, xAccount: 0, facebook: 0 };
                lastRewardsClaim = parseInt(response.data.lastRewardsClaim) || 0;
            }
            console.log("Loaded from server:", { username, points: currentPoints, level: playerLevel, tokens: currentTokens });
            if (callback) callback();
        })
        .catch(error => console.error('Error loading from server:', error));
}

function setUsername() {
    try {
        const input = document.getElementById("username-input").value.trim();
        if (input) {
            username = input;
            loadFromServer(username, () => {
                saveToServer();
                loadSession();
            });
        } else {
            alert("Please enter a valid username.");
        }
    } catch (e) {
        console.error("Error in setUsername:", e);
    }
}

function loadSession() {
    try {
        const setupElement = document.getElementById("username-setup");
        if (setupElement) setupElement.classList.add("hidden");

        const usernameDisplay = document.getElementById("username-display");
        if (usernameDisplay) usernameDisplay.textContent = username;

        const scoreDisplay = document.getElementById("score-display");
        if (scoreDisplay) scoreDisplay.textContent = `${currentPoints} CR7SIU Points`;

        const tokensDisplay = document.getElementById("tokens-display");
        if (tokensDisplay) tokensDisplay.textContent = currentTokens;

        const playerLevelDisplay = document.getElementById("player-level");
        if (playerLevelDisplay) playerLevelDisplay.textContent = playerLevel;

        const pointsDisplay = document.getElementById("cr7siu-points");
        if (pointsDisplay) pointsDisplay.textContent = currentPoints;

        displayImprovements();
        resetTasks();
        displayTasks();
        displayReferrals();
        showPage('home');
    } catch (e) {
        console.error("Error in loadSession:", e);
    }
}

function showPage(page) {
    try {
        document.querySelectorAll("main").forEach(p => p.classList.add("hidden"));
        const targetPage = document.getElementById(page);
        if (targetPage) {
            targetPage.classList.remove("hidden");
            console.log(`Navigated to page: ${page}`);
        } else {
            console.error(`Page with id "${page}" not found.`);
        }
        if (page === "rewards") {
            drawWheel();
        }
        if (page !== "games") {
            const gameArea = document.getElementById("game-area");
            if (gameArea) gameArea.classList.add("hidden");
            endPenaltyShootout();
        }
    } catch (e) {
        console.error("Error in showPage:", e);
    }
}

// Penalty Shootout Game Logic (unchanged except for saving points)
function startPenaltyShootout() {
    try {
        penaltyGameActive = true;
        penaltyShotsTaken = 0;
        penaltyScore = 0;
        penaltyStreak = 0;
        penaltyMultiplier = 1;
        isSuddenDeath = false;
        gameOver = false;
        ballX = 200;
        ballY = 280;
        targetX = ballX;
        targetY = ballY;
        goalkeeperX = 200;
        isShooting = false;
        shotFrame = 0;
        goalkeeperDiveDirection = 'center';
        playerState = 'standing';
        feedbackMessage = '';
        feedbackTimer = 0;
        selectedPower = 'medium';
        shotDirection = null;
        ballRotation = 0;
        crowdCheer = true;
        celebrationTimer = 0;

        const gameArea = document.getElementById("game-area");
        if (gameArea) gameArea.classList.remove("hidden");

        const canvas = document.getElementById("penaltyCanvas");
        canvas.addEventListener("click", handleGoalTap);
        canvas.addEventListener("touchstart", handleGoalTap);

        updateGameScore();
        gameLoop();
    } catch (e) {
        console.error("Error in startPenaltyShootout:", e);
    }
}

function endPenaltyShootout() {
    try {
        if (penaltyGameActive) {
            penaltyGameActive = false;
            if (penaltyScore > 0) {
                const pointsEarned = penaltyScore;
                currentPoints += pointsEarned;
                updatePointsAndLevel();
                showRewardToast(`Game Over! You earned ${pointsEarned} CR7SIU Points!`);
            }
            const canvas = document.getElementById("penaltyCanvas");
            canvas.removeEventListener("click", handleGoalTap);
            canvas.removeEventListener("touchstart", handleGoalTap);
        }
    } catch (e) {
        console.error("Error in endPenaltyShootout:", e);
    }
}

function selectPower(power) {
    selectedPower = power;
    const buttons = document.querySelectorAll(".power-btn");
    buttons.forEach(btn => {
        if (btn.id === `power-${power}`) {
            btn.style.background = "#FFD700";
        } else {
            btn.style.background = "linear-gradient(45deg, #444, #666)";
        }
    });
}

function handleGoalTap(event) {
    if (!penaltyGameActive || gameOver || isShooting) return;
    event.preventDefault();
    const canvas = document.getElementById("penaltyCanvas");
    const rect = canvas.getBoundingClientRect();
    const clientX = event.type.includes("touch") ? event.touches[0].clientX : event.clientX;
    const clientY = event.type.includes("touch") ? event.touches[0].clientY : event.clientY;
    const tapX = (clientX - rect.left) * (canvas.width / rect.width);
    const tapY = (clientY - rect.top) * (canvas.height / rect.height);

    if (tapY > 70) return;

    if (tapX >= 120 && tapX < 173) {
        shotDirection = 'left';
        targetX = 146.5;
    } else if (tapX >= 173 && tapX < 226) {
        shotDirection = 'center';
        targetX = 199.5;
    } else if (tapX >= 226 && tapX <= 280) {
        shotDirection = 'right';
        targetX = 253;
    } else {
        return;
    }
    targetY = 25;

    isShooting = true;
    playerState = 'kicking';
    shotFrame = 0;

    const diveRandom = Math.random();
    if (shotDirection === 'left') {
        goalkeeperDiveDirection = diveRandom < 0.5 ? 'left' : (diveRandom < 0.75 ? 'center' : 'right');
    } else if (shotDirection === 'right') {
        goalkeeperDiveDirection = diveRandom < 0.5 ? 'right' : (diveRandom < 0.75 ? 'center' : 'left');
    } else {
        goalkeeperDiveDirection = diveRandom < 0.4 ? 'center' : (diveRandom < 0.7 ? 'left' : 'right');
    }
}

function checkGoal() {
    return shotDirection !== goalkeeperDiveDirection;
}

function updateMultiplier() {
    if (penaltyStreak >= 5) {
        penaltyMultiplier = 3;
    } else if (penaltyStreak >= 3) {
        penaltyMultiplier = 2;
    } else {
        penaltyMultiplier = 1;
    }
}

function updateGameScore() {
    const scoreDisplay = document.getElementById("game-score");
    if (scoreDisplay) {
        scoreDisplay.textContent = `Score: ${penaltyScore} | Streak: ${penaltyStreak} | Multiplier: ${penaltyMultiplier}x`;
    }
}

function gameLoop() {
    if (!penaltyGameActive) return;
    const canvas = document.getElementById("penaltyCanvas");
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#1C2526";
    ctx.fillRect(0, 0, canvas.width, 50);
    ctx.fillStyle = crowdCheer ? "#4A4A4A" : "#5A5A5A";
    crowdCheer = !crowdCheer;
    ctx.beginPath();
    ctx.moveTo(0, 50);
    ctx.lineTo(50, 0);
    ctx.lineTo(350, 0);
    ctx.lineTo(400, 50);
    ctx.closePath();
    ctx.fill();
    for (let x = 0; x < canvas.width; x += 10) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
        ctx.fillRect(x, 5, 5, 5);
    }

    const spotlight = ctx.createRadialGradient(200, 150, 50, 200, 150, 200);
    spotlight.addColorStop(0, "rgba(255, 255, 255, 0.3)");
    spotlight.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = spotlight;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const pitchGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    pitchGradient.addColorStop(0, "#1B5E20");
    pitchGradient.addColorStop(1, "#4CAF50");
    ctx.fillStyle = pitchGradient;
    ctx.fillRect(0, 50, canvas.width, canvas.height - 50);

    ctx.fillStyle = "rgba(0, 100, 0, 0.3)";
    for (let i = 0; i < 100; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * (canvas.height - 50) + 50;
        ctx.fillRect(x, y, 2, 2);
    }

    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    ctx.lineTo(200, 50);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(canvas.width, canvas.height);
    ctx.lineTo(200, 50);
    ctx.stroke();
    ctx.strokeRect(100, 50, 200, 100);

    ctx.beginPath();
    ctx.arc(200, 280, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.closePath();

    const goalGradient = ctx.createLinearGradient(120, 0, 280, 0);
    goalGradient.addColorStop(0, "#B0BEC5");
    goalGradient.addColorStop(1, "#ECEFF1");
    ctx.fillStyle = goalGradient;
    ctx.fillRect(120, 0, 160, 15);
    ctx.fillRect(120, 0, 15, 70);
    ctx.fillRect(265, 0, 15, 70);
    ctx.beginPath();
    ctx.moveTo(120, 0);
    ctx.lineTo(110, 10);
    ctx.lineTo(125, 10);
    ctx.lineTo(135, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(280, 0);
    ctx.lineTo(290, 10);
    ctx.lineTo(275, 10);
    ctx.lineTo(265, 0);
    ctx.fill();
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.fillRect(110, 10, 180, 5);
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.fillRect(135, 15, 130, 55);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    ctx.lineWidth = 1;
    for (let x = 135; x < 265; x += 10) {
        ctx.beginPath();
        ctx.moveTo(x, 15);
        ctx.lineTo(x, 70);
        ctx.stroke();
    }
    for (let y = 15; y < 70; y += 10) {
        ctx.beginPath();
        ctx.moveTo(135, y);
        ctx.lineTo(265, y);
        ctx.stroke();
    }

    ctx.fillStyle = "rgba(255, 215, 0, 0.3)";
    ctx.fillRect(120, 0, 53, 70);
    ctx.fillRect(173, 0, 53, 70);
    ctx.fillRect(226, 0, 54, 70);

    ctx.save();
    if (playerState === 'kicking') {
        ctx.translate(200, 275);
        ctx.rotate(-15 * Math.PI / 180);
        ctx.fillStyle = "#D32F2F";
        ctx.fillRect(-20, -30, 40, 40);
        ctx.fillStyle = "#fff";
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 2;
        ctx.font = "bold 28px Roboto";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("7", 0, -5);
        ctx.strokeText("7", 0, -5);
        ctx.fillStyle = "#000";
        ctx.fillRect(-15, 10, 10, 30);
        ctx.fillRect(5, 10, 10, 30);
        ctx.restore();
    } else {
        ctx.fillStyle = "#D32F2F";
        ctx.fillRect(180, 245, 40, 40);
        ctx.fillStyle = "#fff";
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 2;
        ctx.font = "bold 28px Roboto";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("7", 200, 265);
        ctx.strokeText("7", 200, 265);
        ctx.fillStyle = "#000";
        ctx.fillRect(185, 285, 10, 20);
        ctx.fillRect(205, 285, 10, 20);
    }

    if (isShooting) {
        if (goalkeeperDiveDirection === 'left') {
            ctx.save();
            ctx.translate(140, 35);
            ctx.rotate(-15 * Math.PI / 180);
            ctx.fillStyle = "#F44336";
            ctx.fillRect(-20, -20, 40, 40);
            ctx.fillStyle = "#fff";
            ctx.strokeStyle = "#000";
            ctx.lineWidth = 1;
            ctx.font = "bold 16px Roboto";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("GK", 0, 0);
            ctx.strokeText("GK", 0, 0);
            ctx.restore();
        } else if (goalkeeperDiveDirection === 'right') {
            ctx.save();
            ctx.translate(260, 35);
            ctx.rotate(15 * Math.PI / 180);
            ctx.fillStyle = "#4CAF50";
            ctx.fillRect(-20, -20, 40, 40);
            ctx.fillStyle = "#fff";
            ctx.strokeStyle = "#000";
            ctx.lineWidth = 1;
            ctx.font = "bold 16px Roboto";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("GK", 0, 0);
            ctx.strokeText("GK", 0, 0);
            ctx.restore();
        } else {
            ctx.fillStyle = "#2196F3";
            ctx.fillRect(180, 15, 40, 40);
            ctx.fillStyle = "#fff";
            ctx.strokeStyle = "#000";
            ctx.lineWidth = 1;
            ctx.font = "bold 16px Roboto";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("GK", 200, 35);
            ctx.strokeText("GK", 200, 35);
        }
    } else {
        ctx.fillStyle = "#2196F3";
        ctx.fillRect(180, 15, 40, 40);
        ctx.fillStyle = "#fff";
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 1;
        ctx.font = "bold 16px Roboto";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("GK", 200, 35);
        ctx.strokeText("GK", 200, 35);
    }

    if (!isShooting) {
        ctx.save();
        ctx.translate(ballX, ballY);
        ctx.rotate(ballRotation);
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.fill();
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(3, 3, 12, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
        ctx.fill();
        ctx.closePath();
        ctx.fillStyle = "#000";
        ctx.font = "16px Roboto";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("⚽", 0, 0);
        ctx.restore();
    } else {
        shotFrame++;
        const frames = selectedPower === 'low' ? 30 : (selectedPower === 'medium' ? 20 : 10);
        const progress = Math.min(shotFrame / frames, 1);
        ballX = ballX + (targetX - ballX) * progress;
        ballY = ballY + (targetY - ballY) * progress;
        ballRotation += 0.2;
        ctx.save();
        ctx.translate(ballX, ballY);
        ctx.rotate(ballRotation);
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.fill();
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(3, 3, 12, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
        ctx.fill();
        ctx.closePath();
        ctx.fillStyle = "#000";
        ctx.font = "16px Roboto";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("⚽", 0, 0);
        ctx.restore();

        ctx.beginPath();
        ctx.moveTo(200, 280);
        ctx.lineTo(ballX, ballY);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.closePath();

        if (progress === 1) {
            penaltyShotsTaken++;
            const goalScored = checkGoal();
            if (goalScored) {
                penaltyScore += 100 * penaltyMultiplier;
                penaltyStreak++;
                updateMultiplier();
                feedbackMessage = "Goal!";
                celebrationTimer = 60;
            } else {
                penaltyStreak = 0;
                penaltyMultiplier = 1;
                feedbackMessage = "Miss!";
            }
            feedbackTimer = 60;

            if (penaltyShotsTaken >= 5 && penaltyScore >= 400 && !isSuddenDeath) {
                isSuddenDeath = true;
                updateRewardStatus("Sudden Death Mode! Miss a shot and the game ends!");
            }

            if (isSuddenDeath && !goalScored) {
                gameOver = true;
                endPenaltyShootout();
            }

            updateGameScore();
            isShooting = false;
            playerState = 'standing';
            goalkeeperDiveDirection = 'center';
            shotDirection = null;
            ballX = 200;
            ballY = 280;
            targetX = ballX;
            targetY = ballY;
        }
    }

    if (feedbackTimer > 0) {
        ctx.font = "bold 24px Roboto";
        ctx.fillStyle = feedbackMessage === "Goal!" ? "#00FF00" : "#FF0000";
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 1;
        ctx.textAlign = "center";
        ctx.fillText(feedbackMessage, canvas.width / 2, canvas.height / 2);
        ctx.strokeText(feedbackMessage, canvas.width / 2, canvas.height / 2);
        feedbackTimer--;
    }

    if (celebrationTimer > 0) {
        ctx.fillStyle = celebrationTimer % 10 < 5 ? "#FFFF00" : "#FFFFFF";
        ctx.fillRect(110, 0, 10, 70);
        ctx.fillRect(280, 0, 10, 70);
        ctx.fillRect(120, 0, 160, 5);
        celebrationTimer--;
    }

    requestAnimationFrame(gameLoop);
}

function earnPoints() {
    try {
        currentPoints += 5;
        updatePointsAndLevel();
    } catch (e) {
        console.error("Error in earnPoints:", e);
    }
}

function updatePointsAndLevel() {
    try {
        const scoreDisplay = document.getElementById("score-display");
        if (scoreDisplay) scoreDisplay.textContent = `${currentPoints} CR7SIU Points`;
        const pointsDisplay = document.getElementById("cr7siu-points");
        if (pointsDisplay) pointsDisplay.textContent = currentPoints;
        const tokensDisplay = document.getElementById("tokens-display");
        if (tokensDisplay) tokensDisplay.textContent = currentTokens;
        updateLevel();
        saveToServer();
    } catch (e) {
        console.error("Error in updatePointsAndLevel:", e);
    }
}

function updateLevel() {
    try {
        playerLevel = Math.floor(currentPoints / 100000) + 1;
        const playerLevelDisplay = document.getElementById("player-level");
        if (playerLevelDisplay) playerLevelDisplay.textContent = playerLevel;
    } catch (e) {
        console.error("Error in updateLevel:", e);
    }
}

function buyPoints() {
    try {
        currentPoints += 1000;
        updatePointsAndLevel();
    } catch (e) {
        console.error("Error in buyPoints:", e);
    }
}

function convertToTokens() {
    try {
        const tokens = Math.floor(currentPoints / 5000);
        if (tokens > 0) {
            currentPoints -= tokens * 5000;
            currentTokens += tokens;
            const tokensDisplay = document.getElementById("tokens-display");
            if (tokensDisplay) tokensDisplay.textContent = currentTokens;
            updateRewardStatus(`You converted ${tokens} CR7SIU tokens!`);
            updatePointsAndLevel();
        } else {
            updateRewardStatus("Not enough points.");
        }
    } catch (e) {
        console.error("Error in convertToTokens:", e);
    }
}

function displayTasks() {
    try {
        const tasksContainer = document.getElementById("tasks-container");
        if (!tasksContainer) return;
        tasksContainer.innerHTML = Object.keys(tasksCompleted).map(task => `
            <div class="task">
                <h3>Complete ${task.charAt(0).toUpperCase() + task.slice(1)} Task</h3>
                <p>${task === 'youtube' ? 'Watch and like our latest video' : 
                    task === 'xAccount' ? 'Tweet with our hashtag' : 
                    'Share our post on your timeline'}</p>
                <button id="task-${task}" onclick="completeTask('${task}')" ${lastTaskClaims[task] && !isNewDay(lastTaskClaims[task]) ? 'disabled' : ''}>
                    ${lastTaskClaims[task] && !isNewDay(lastTaskClaims[task]) ? 'Claimed' : 'Complete'}
                </button>
            </div>
        `).join('');
        updateTaskButtons();
    } catch (e) {
        console.error("Error in displayTasks:", e);
    }
}

function completeTask(task) {
    try {
        if (lastTaskClaims[task] && !isNewDay(lastTaskClaims[task])) {
            updateRewardStatus("You can only claim this task once per day!");
            return;
        }

        tasksCompleted[task] = true;
        lastTaskClaims[task] = Date.now();
        updateTaskButtons();
        checkAllTasksCompleted();
        currentPoints += 5000;
        updatePointsAndLevel();
        showRewardToast(`Reward Claimed! 5000 CR7SIU Points have been credited to your account.`);
        const button = document.getElementById(`task-${task}`);
        if (button) {
            button.disabled = true;
            button.textContent = "Claimed";
        }
    } catch (e) {
        console.error("Error in completeTask:", e);
    }
}

function updateTaskButtons() {
    try {
        Object.keys(tasksCompleted).forEach(task => {
            const button = document.getElementById(`task-${task}`);
            if (button) {
                const canClaim = isNewDay(lastTaskClaims[task]);
                if (canClaim) tasksCompleted[task] = false;
                button.disabled = !canClaim;
                button.textContent = canClaim ? "Complete" : "Claimed";
            }
        });
        saveToServer();
    } catch (e) {
        console.error("Error in updateTaskButtons:", e);
    }
}

function checkAllTasksCompleted() {
    try {
        if (Object.values(tasksCompleted).every(Boolean)) {
            const claimButton = document.getElementById("claim-rewards-btn");
            if (claimButton) {
                const canClaim = isNewDay(lastRewardsClaim);
                claimButton.disabled = !canClaim;
                updateRewardStatus(canClaim ? "All tasks completed! You can now claim additional rewards." : "You can only claim rewards once per day!");
            }
        }
    } catch (e) {
        console.error("Error in checkAllTasksCompleted:", e);
    }
}

function claimRewards() {
    try {
        if (!isNewDay(lastRewardsClaim)) {
            updateRewardStatus("You can only claim rewards once per day!");
            return;
        }

        if (Object.values(tasksCompleted).every(Boolean)) {
            currentPoints += 5000;
            updatePointsAndLevel();
            showRewardToast("Reward Claimed! 5000 CR7SIU Points have been credited to your account.");
            resetTasks();
            lastRewardsClaim = Date.now();
            const claimButton = document.getElementById("claim-rewards-btn");
            if (claimButton) {
                claimButton.disabled = true;
                claimButton.textContent = "Claimed";
            }
        } else {
            updateRewardStatus("Complete all tasks before claiming rewards.");
        }
    } catch (e) {
        console.error("Error in claimRewards:", e);
    }
}

function showRewardToast(message) {
    try {
        const toast = document.getElementById("reward-toast");
        const messageElement = document.getElementById("reward-message");
        if (toast && messageElement) {
            messageElement.textContent = message;
            toast.classList.remove("hidden");
            setTimeout(() => toast.classList.add("hidden"), 3000);
        }
    } catch (e) {
        console.error("Error in showRewardToast:", e);
    }
}

function displayImprovements() {
    try {
        const improvements = ['Stamina', 'Strength', 'Dribbling', 'Shooting Power', 'Speed', 'Passing', 'Defending', 'Crossing', 'Finishing', 'Heading', 'Control', 'Creativity', 'Leadership', 'Tackling', 'Positioning', 'Composure', 'Vision', 'Shot Power', 'Ball Handling', 'Acceleration'];
        const container = document.getElementById("attributes-container");
        if (!container) return;
        let html = '';
        improvements.forEach((attr, index) => {
            const level = attributes[attr] || 1;
            const cost = 500 + 250 * (level - 1);
            html += `
                <div class="attribute-card">
                    <h3>${attr}</h3>
                    <p>Upgrade Cost: ${cost} points</p>
                    <p>Level: <span id="attribute-level-${index}">${level}</span></p>
                    <button onclick="upgradeSkill('${attr}', ${index}, ${cost})">Upgrade</button>
                </div>
            `;
        });
        container.innerHTML = html;
    } catch (e) {
        console.error("Error in displayImprovements:", e);
    }
}

function upgradeSkill(attribute, index, cost) {
    try {
        const level = attributes[attribute] || 1;
        if (currentPoints >= cost) {
            currentPoints -= cost;
            attributes[attribute] = level + 1;
            updatePointsAndLevel();
            const levelDisplay = document.getElementById(`attribute-level-${index}`);
            if (levelDisplay) levelDisplay.textContent = attributes[attribute];
            if (attributes[attribute] % 10 === 0) {
                currentPoints += 2500;
                updatePointsAndLevel();
                updateRewardStatus("Level milestone achieved! Cashback of 2500 points awarded.");
            }
        } else {
            updateRewardStatus("Not enough points!");
        }
    } catch (e) {
        console.error("Error in upgradeSkill:", e);
    }
}

function generateReferralLink() {
    try {
        if (username) {
            let link = `${window.location.origin}/?ref=${username}`;
            const referralField = document.getElementById('referral-link-field');
            if (referralField) referralField.value = link;
            updateRewardStatus("Referral link generated. Share this to earn points!");
        } else {
            updateRewardStatus("Please set a username first!");
        }
    } catch (e) {
        console.error("Error in generateReferralLink:", e);
    }
}

function checkForReferral() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const ref = urlParams.get('ref');
        if (ref && ref !== username && !referralUsers.includes(ref)) {
            referralUsers.push(ref);
            currentPoints += 5000;
            updatePointsAndLevel();
            updateRewardStatus("Congratulations! You've earned 5000 CR7SIU Points for a successful referral!");
        }
    } catch (e) {
        console.error("Error in checkForReferral:", e);
    }
}

function shareLink(platform) {
    try {
        const link = document.getElementById('referral-link-field').value;
        if (link) {
            if (navigator.share) {
                navigator.share({
                    title: 'Join CR7SIU!',
                    text: 'Check out this cool app for Ronaldo fans!',
                    url: link
                }).then(() => console.log('Successful share'))
                  .catch(error => console.log('Error sharing', error));
            } else {
                switch(platform) {
                    case 'facebook':
                        window.open("https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(link));
                        break;
                    case 'x':
                        window.open("https://twitter.com/intent/tweet?text=Check out CR7SIU!&url=" + encodeURIComponent(link));
                        break;
                    case 'whatsapp':
                        window.open("whatsapp://send?text=Check out CR7SIU! " + link);
                        break;
                    case 'telegram':
                        window.open("https://telegram.me/share/url?url=" + encodeURIComponent(link) + "&text=Check out CR7SIU!");
                        break;
                    case 'instagram':
                        updateRewardStatus("Instagram sharing not directly supported. Share link manually.");
                        break;
                }
            }
        } else {
            updateRewardStatus("Please generate a referral link first!");
        }
    } catch (e) {
        console.error("Error in shareLink:", e);
    }
}

function toggleShareOptions() {
    try {
        const shareOptions = document.getElementById('social-share');
        if (shareOptions) shareOptions.classList.toggle('hidden');
    } catch (e) {
        console.error("Error in toggleShareOptions:", e);
    }
}

function displayReferrals() {
    try {
        const referralList = document.getElementById("referrals-list");
        if (referralList) {
            referralList.innerHTML = referralUsers.map(user => `<div>${user}</div>`).join('');
            const referralCount = document.getElementById("referral-count");
            if (referralCount) referralCount.textContent = referralUsers.length;
        }
    } catch (e) {
        console.error("Error in displayReferrals:", e);
    }
}

function resetTasks() {
    try {
        tasksCompleted = { youtube: false, xAccount: false, facebook: false };
        const claimButton = document.getElementById("claim-rewards-btn");
        if (claimButton) claimButton.disabled = true;
        updateTaskButtons();
    } catch (e) {
        console.error("Error in resetTasks:", e);
    }
}

function isNewDay(lastClaimTime) {
    try {
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        return now - lastClaimTime >= oneDay;
    } catch (e) {
        console.error("Error in isNewDay:", e);
        return false;
    }
}

function updateButtonStates() {
    try {
        if (isNewDay(lastAdClaim)) enableSpecificButton('ad-claim-button');
        else disableSpecificButton('ad-claim-button');
        if (isNewDay(lastCheckInClaim)) enableSpecificButton('check-in-button');
        else disableSpecificButton('check-in-button');
        if (isNewDay(lastSpinClaim)) enableSpecificButton('spin-button');
        else disableSpecificButton('spin-button');

        Object.keys(tasksCompleted).forEach(task => {
            const button = document.getElementById(`task-${task}`);
            if (button) {
                const canClaim = isNewDay(lastTaskClaims[task]);
                if (canClaim) tasksCompleted[task] = false;
                button.disabled = !canClaim;
                button.textContent = canClaim ? "Complete" : "Claimed";
            }
        });

        const claimButton = document.getElementById("claim-rewards-btn");
        if (claimButton) {
            const canClaim = isNewDay(lastRewardsClaim);
            claimButton.disabled = !canClaim || !Object.values(tasksCompleted).every(Boolean);
            claimButton.textContent = canClaim ? "Claim Rewards" : "Claimed";
        }
        saveToServer();
    } catch (e) {
        console.error("Error in updateButtonStates:", e);
    }
}

function enableSpecificButton(buttonId) {
    try {
        const button = document.getElementById(buttonId);
        if (button) {
            button.disabled = false;
            button.textContent = button.id === 'spin-button' ? 'Spin to Win!' : 'Claim Reward';
        }
    } catch (e) {
        console.error("Error in enableSpecificButton:", e);
    }
}

function disableSpecificButton(buttonId) {
    try {
        const button = document.getElementById(buttonId);
        if (button) {
            button.disabled = true;
            button.textContent = 'Claimed';
        }
    } catch (e) {
        console.error("Error in disableSpecificButton:", e);
    }
}

function completeAdTask() {
    try {
        if (isNewDay(lastAdClaim)) {
            currentPoints += 100;
            updatePointsAndLevel();
            updateRewardStatus("Congratulations! You earned 100 CR7SIU Points from the ad reward.");
            showRewardToast("Reward Claimed! 100 CR7SIU Points have been credited to your account.");
            lastAdClaim = Date.now();
            disableSpecificButton('ad-claim-button');
        } else {
            updateRewardStatus("You can only claim this reward once per day!");
        }
    } catch (e) {
        console.error("Error in completeAdTask:", e);
    }
}

function completeCheckInTask() {
    try {
        if (isNewDay(lastCheckInClaim)) {
            currentPoints += 500;
            updatePointsAndLevel();
            updateRewardStatus("Congratulations! You earned 500 CR7SIU Points for your daily check-in.");
            showRewardToast("Reward Claimed! 500 CR7SIU Points have been credited to your account.");
            lastCheckInClaim = Date.now();
            disableSpecificButton('check-in-button');
        } else {
            updateRewardStatus("You can only claim this reward once per day!");
        }
    } catch (e) {
        console.error("Error in completeCheckInTask:", e);
    }
}

function drawWheel(angle = 0) {
    try {
        const canvas = document.getElementById("wheelCanvas");
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        const sections = 6;
        const arc = (2 * Math.PI) / sections;
        const radius = canvas.width / 2;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.translate(radius, radius);
        ctx.rotate(angle);

        for (let i = 0; i < sections; i++) {
            ctx.beginPath();
            ctx.arc(0, 0, radius, i * arc, (i + 1) * arc);
            ctx.lineTo(0, 0);
            ctx.fillStyle = wheelColors[i];
            ctx.fill();
            ctx.save();

            ctx.fillStyle = "#FFF";
            ctx.font = "bold 20px Roboto";
            ctx.textAlign = "center";
            ctx.rotate(i * arc + arc / 2);
            ctx.fillText(wheelRewards[i], radius * 0.6, 0);
            ctx.restore();
        }

        ctx.rotate(-angle);
        ctx.translate(-radius, -radius);
    } catch (e) {
        console.error("Error in drawWheel:", e);
    }
}

function spinWheel() {
    try {
        if (isSpinning || !isNewDay(lastSpinClaim)) {
            updateRewardStatus("You can only spin once per day!");
            return;
        }

        isSpinning = true;
        disableSpecificButton("spin-button");

        const spins = 5 + Math.random() * 5;
        const randomSection = Math.floor(Math.random() * 6);
        const targetAngle = (2 * Math.PI * spins) + (randomSection * (2 * Math.PI / 6));
        let currentAngle = 0;
        const duration = 3000;
        const startTime = performance.now();

        function animateWheel(time) {
            try {
                const elapsed = time - startTime;
                const progress = Math.min(elapsed / duration, 1);
                currentAngle = targetAngle * (1 - Math.pow(1 - progress, 2));
                drawWheel(currentAngle);

                if (progress < 1) {
                    requestAnimationFrame(animateWheel);
                } else {
                    isSpinning = false;
                    const reward = wheelRewards[randomSection];
                    currentPoints += reward;
                    updatePointsAndLevel();
                    showRewardToast(`Reward Claimed! ${reward} CR7SIU Points have been credited to your account.`);
                    lastSpinClaim = Date.now();
                }
            } catch (e) {
                console.error("Error in animateWheel:", e);
            }
        }

        requestAnimationFrame(animateWheel);
    } catch (e) {
        console.error("Error in spinWheel:", e);
    }
}

function updateRewardStatus(message) {
    try {
        const statusElement = document.getElementById("reward-status");
        if (statusElement) statusElement.innerText = message;
    } catch (e) {
        console.error("Error in updateRewardStatus:", e);
    }
}

document.addEventListener('touchstart', function(event) {
    try {
        if (event.target.tagName === 'BUTTON') event.target.click();
    } catch (e) {
        console.error("Error in touchstart listener:", e);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    try {
        migrateLocalStorageData(); // Start migration process
        updateRewardStatus("Welcome back! Complete your daily tasks to claim rewards.");
        updateButtonStates();
        if (document.getElementById("rewards") && !document.getElementById("rewards").classList.contains("hidden")) {
            drawWheel();
        }
    } catch (e) {
        console.error("Error in DOMContentLoaded:", e);
    }
});