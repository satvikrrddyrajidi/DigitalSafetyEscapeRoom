"use strict";

const API_BASE_URL = "https://digital-safety-escape-room-api.onrender.com/api";
const ESCAPE_TARGET = 90;

const missionInfo = {
    "phishing": {
        title: "Phishing Detection",
        icon: "🎣",
        description: "Identify suspicious messages, fake websites, and attempts to steal your information.",
        color: "#9b72ff"
    },
    "password": {
        title: "Password Security",
        icon: "🔐",
        description: "Defend accounts using strong passwords and secure authentication practices.",
        color: "#48e0d0"
    },
    "qr": {
        title: "Malicious QR Codes",
        icon: "▦",
        description: "Recognize dangerous QR codes, suspicious links, and unsafe scanning requests.",
        color: "#ffbd69"
    },
    "scam": {
        title: "Online Scam Awareness",
        icon: "🛡️",
        description: "Avoid online fraud, impersonation, fake offers, and social engineering traps.",
        color: "#51e6a0"
    }
};

const $ = (id) => document.getElementById(id);

const ui = {
    missions: $("missionsSection"),
    challengeArea: $("challengeArea"),
    results: $("resultsSection"),
    challengeGrid: $("challengeGrid"),
    loadError: $("loadError"),
    start: $("startGameBtn"),
    home: $("homeLink"),
    back: $("backToMissionsBtn"),
    next: $("nextQuestionBtn"),
    playAgain: $("playAgainBtn"),
    resultsBack: $("resultsBackBtn"),
    options: $("optionsContainer"),
    feedback: $("feedbackBox"),
    hint: $("selectionHint"),
    toast: $("toast")
};

let allChallenges = [];
let missionGroups = [];
let currentMission = null;
let currentQuestionIndex = 0;
let selectedOption = null;
let answerSubmitted = false;
let sessionFinished = false;
let toastTimer = null;

let answeredQuestions = new Map();
let correctQuestions = new Set();
let earnedPoints = 0;
let maximumPoints = 0;

function normalizeCategory(category) {
    return String(category || "").toLowerCase().trim();
}

function identifyMission(category) {
    const value = normalizeCategory(category);

    if (value.includes("phish")) return "phishing";
    if (value.includes("password") || value.includes("passcode")) return "password";
    if (value.includes("qr") || value.includes("code scan")) return "qr";
    if (value.includes("scam") || value.includes("fraud")) return "scam";

    return value.replace(/[^a-z0-9]+/g, "");
}

function getMissionInfo(category) {
    const key = identifyMission(category);

    if (missionInfo[key]) return missionInfo[key];

    return {
        title: category || "Cybersecurity Challenge",
        icon: "🔒",
        description: "Complete these cybersecurity challenges to progress toward the exit.",
        color: "#9b72ff"
    };
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function showToast(message) {
    ui.toast.textContent = message;
    ui.toast.classList.remove("hidden");

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        ui.toast.classList.add("hidden");
    }, 3200);
}

function showSection(section) {
    ui.missions.classList.toggle("hidden", section !== "missions");
    ui.challengeArea.classList.toggle("hidden", section !== "challenge");
    ui.results.classList.toggle("hidden", section !== "results");

    window.scrollTo({ top: 0, behavior: "smooth" });
}

async function loadChallenges() {
    ui.loadError.classList.add("hidden");
    ui.challengeGrid.innerHTML =
        '<div class="loading-card">Connecting to the cybersecurity game server...</div>';

    try {
        const response = await fetch(`${API_BASE}/challenges`);

        if (!response.ok) {
            throw new Error(`Server returned status ${response.status}`);
        }

        const data = await response.json();

        allChallenges = Array.isArray(data)
            ? data
            : (data.challenges || data.data || []);

        if (!allChallenges.length) {
            throw new Error("The server returned no challenges.");
        }

        allChallenges.sort((a, b) => Number(a.id) - Number(b.id));

        missionGroups = buildMissionGroups(allChallenges);
        maximumPoints = allChallenges.reduce(
            (sum, challenge) => sum + getPoints(challenge),
            0
        );

        $("missionCount").textContent = missionGroups.length;
        $("challengeCount").textContent = allChallenges.length;
        $("maximumScore").textContent = maximumPoints;

        $("maxScore").textContent = maximumPoints;
        $("liveMaxScore").textContent = `/ ${maximumPoints} POINTS`;

        renderMissionCards();
        updateOverallProgress();
    } catch (error) {
        console.error("Unable to load challenges:", error);

        ui.challengeGrid.innerHTML =
            '<div class="loading-card">Unable to connect to the game server.</div>';

        ui.loadError.textContent =
            "Make sure Flask is running at http://127.0.0.1:5000 and the /api/challenges endpoint is working. Refresh this page after starting the backend.";

        ui.loadError.classList.remove("hidden");
    }
}

function buildMissionGroups(challenges) {
    const groups = new Map();

    challenges.forEach((challenge) => {
        const category = challenge.category || "General Cybersecurity";
        const key = identifyMission(category);

        if (!groups.has(key)) {
            groups.set(key, {
                key,
                category,
                info: getMissionInfo(category),
                challenges: []
            });
        }

        groups.get(key).challenges.push(challenge);
    });

    return [...groups.values()];
}

function getPoints(challenge) {
    const value = Number(challenge.points);
    return Number.isFinite(value) && value > 0 ? value : 10;
}

function getCompletedCount() {
    return answeredQuestions.size;
}

function getAccuracy() {
    if (!allChallenges.length) return 0;
    return Math.round((correctQuestions.size / allChallenges.length) * 100);
}

function getScorePercentage() {
    if (maximumPoints <= 0) return 0;
    return Math.round((earnedPoints / maximumPoints) * 100);
}

function updateOverallProgress() {
    const answered = getCompletedCount();
    const percentage = allChallenges.length
        ? Math.round((answered / allChallenges.length) * 100)
        : 0;

    $("overallPercentage").textContent = `${percentage}%`;
    $("progressBar").style.width = `${percentage}%`;
    $("progressStatus").textContent =
        `${answered} of ${allChallenges.length} challenges completed`;

    $("liveScore").textContent = earnedPoints;

    $("escapeProgress").style.width =
        `${Math.min(100, getScorePercentage())}%`;

    $("escapeProgressText").textContent =
        `${getScorePercentage()}% score achieved`;

    renderMissionCards();
}

function renderMissionCards() {
    ui.challengeGrid.innerHTML = "";

    missionGroups.forEach((mission) => {
        const completed = mission.challenges.every(
            challenge => answeredQuestions.has(Number(challenge.id))
        );

        const completedCount = mission.challenges.filter(
            challenge => answeredQuestions.has(Number(challenge.id))
        ).length;

        const missionPoints = mission.challenges.reduce(
            (sum, challenge) => sum + getPoints(challenge),
            0
        );

        const missionEarned = mission.challenges.reduce(
            (sum, challenge) => sum + (
                correctQuestions.has(Number(challenge.id))
                    ? getPoints(challenge)
                    : 0
            ),
            0
        );

        const card = document.createElement("article");
        card.className = `mission-card${completed ? " completed" : ""}`;
        card.style.setProperty("--mission-color", mission.info.color);

        card.innerHTML = `
            <div class="mission-card-top">
                <span class="mission-icon">${mission.info.icon}</span>
                <span class="mission-tag">
                    ${completed ? "✓ MISSION COMPLETE" : "MISSION LOCK STATUS: OPEN"}
                </span>
            </div>
            <h3>${escapeHtml(mission.info.title)}</h3>
            <p>${escapeHtml(mission.info.description)}</p>
            <div class="mission-meta">
                <span>▤ ${mission.challenges.length} challenges</span>
                <span>★ ${missionEarned}/${missionPoints} points</span>
                <span>✓ ${completedCount}/${mission.challenges.length}</span>
            </div>
            <button class="primary-btn mission-action" type="button">
                ${completed ? "REPLAY MISSION ↻" : "ENTER MISSION →"}
            </button>
        `;

        card.querySelector("button").addEventListener("click", () => {
            startMission(mission);
        });

        ui.challengeGrid.appendChild(card);
    });
}

function startMission(mission) {
    if (sessionFinished) resetGame();

    currentMission = mission;
    currentQuestionIndex = findNextUnansweredIndex(mission);

    if (currentQuestionIndex === -1) {
        currentQuestionIndex = 0;
    }

    showSection("challenge");
    renderQuestion();
}

function findNextUnansweredIndex(mission) {
    return mission.challenges.findIndex(
        challenge => !answeredQuestions.has(Number(challenge.id))
    );
}

function renderQuestion() {
    if (!currentMission) return;

    const challenges = currentMission.challenges;

    if (currentQuestionIndex >= challenges.length) {
        currentQuestionIndex = 0;
    }

    const challenge = challenges[currentQuestionIndex];
    const id = Number(challenge.id);

    selectedOption = null;
    answerSubmitted = answeredQuestions.has(id);

    $("currentCategory").textContent =
        `MISSION ${missionGroups.findIndex(m => m.key === currentMission.key) + 1}`;

    $("currentMissionTitle").textContent = currentMission.info.title;
    $("currentMissionDescription").textContent = currentMission.info.description;

    $("questionCounter").textContent =
        `QUESTION ${currentQuestionIndex + 1} / ${challenges.length}`;

    $("missionProgressText").textContent =
        `${currentQuestionIndex + 1} of ${challenges.length} questions`;

    $("missionProgressBar").style.width =
        `${((currentQuestionIndex + 1) / challenges.length) * 100}%`;

    $("questionScenario").textContent =
        challenge.scenario || "Review the situation and choose the safest response.";

    $("questionTitle").textContent = "YOUR DECISION";
    $("questionText").textContent = challenge.question || "Choose the best answer.";

    ui.options.innerHTML = "";
    ui.feedback.className = "feedback-box hidden";
    ui.feedback.textContent = "";

    ui.hint.textContent = "Select one answer, then submit your decision.";

    const options = parseOptions(challenge.options);

    options.forEach((option, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "option-btn";

        button.innerHTML = `
            <span class="option-letter">${String.fromCharCode(65 + index)}</span>
            <span>${escapeHtml(option)}</span>
        `;

        button.addEventListener("click", () => {
            if (answerSubmitted) return;

            selectedOption = index;

            ui.options.querySelectorAll(".option-btn").forEach((item) => {
                item.classList.remove("selected");
            });

            button.classList.add("selected");
            ui.next.disabled = false;
            ui.hint.textContent =
                `Selected option ${String.fromCharCode(65 + index)}. Ready to submit.`;
        });

        ui.options.appendChild(button);
    });

    if (answerSubmitted) {
        showPreviouslyAnswered(challenge, options);
    }

    ui.next.disabled = !answerSubmitted && selectedOption === null;
    ui.next.textContent = answerSubmitted
        ? (currentQuestionIndex === challenges.length - 1
            ? "FINISH MISSION →"
            : "NEXT QUESTION →")
        : "SUBMIT ANSWER →";

    updateOverallProgress();
}

function parseOptions(value) {
    if (Array.isArray(value)) return value;

    if (typeof value === "string") {
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) return parsed;
        } catch (_) {
            // A plain string is handled below.
        }

        return value.split(/\r?\n/).map(item => item.trim()).filter(Boolean);
    }

    return [];
}

function showPreviouslyAnswered(challenge, options) {
    const id = Number(challenge.id);
    const wasCorrect = correctQuestions.has(id);

    ui.options.querySelectorAll(".option-btn").forEach(button => {
        button.disabled = true;
    });

    ui.feedback.className = `feedback-box ${wasCorrect ? "correct" : "incorrect"}`;
    ui.feedback.textContent = wasCorrect
        ? "✓ Correct answer. Your points have been recorded."
        : "✗ This question was answered incorrectly. You can retry the mission after completing the game.";

    ui.hint.textContent = "This question has already been answered in this attempt.";
}

async function submitAnswer() {
    if (!currentMission || sessionFinished) return;

    const challenge = currentMission.challenges[currentQuestionIndex];
    const id = Number(challenge.id);

    if (answerSubmitted) {
        moveToNextQuestion();
        return;
    }

    if (selectedOption === null) {
        showToast("Choose an answer first.");
        return;
    }

    ui.next.disabled = true;
    ui.next.textContent = "CHECKING ANSWER...";

    try {
        const response = await fetch(`${API_BASE}/submit-answer`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                challenge_id: id,
                selected_option: selectedOption
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || result.message || "Answer submission failed.");
        }

        const correct = Boolean(
            result.is_correct ?? result.correct ?? result.success
        );

        answerSubmitted = true;
        answeredQuestions.set(id, selectedOption);

        if (correct) {
            correctQuestions.add(id);
            earnedPoints += Number(
                result.points_earned ?? result.points ?? getPoints(challenge)
            );

            ui.feedback.className = "feedback-box correct";
            ui.feedback.textContent =
                `✓ CORRECT! +${Number(result.points_earned ?? result.points ?? getPoints(challenge))} points. ` +
                (result.explanation || "Great work, player. Keep going!");
            showToast("Correct answer! Points earned.");
        } else {
            correctQuestions.delete(id);

            ui.feedback.className = "feedback-box incorrect";
            ui.feedback.textContent =
                "✗ Not quite right. " +
                (result.explanation || "Review the situation carefully for your next attempt.");
            showToast("Incorrect answer. Keep learning.");
        }

        ui.options.querySelectorAll(".option-btn").forEach((button, index) => {
            button.disabled = true;

            if (index === selectedOption) {
                button.classList.add(correct ? "correct-option" : "wrong-option");
            }
        });

        ui.hint.textContent = correct
            ? "Decision accepted. You have moved one step closer to the exit."
            : "Decision recorded. Finish the missions to see your final result.";

        ui.next.textContent =
            currentQuestionIndex === currentMission.challenges.length - 1
                ? "FINISH MISSION →"
                : "NEXT QUESTION →";

        updateOverallProgress();
        ui.next.disabled = false;
    } catch (error) {
        console.error("Answer submission error:", error);

        ui.feedback.className = "feedback-box incorrect";
        ui.feedback.textContent =
            `Unable to submit this answer: ${error.message}. Check that your Flask server is running, then try again.`;

        ui.next.disabled = false;
        ui.next.textContent = "TRY SUBMITTING AGAIN →";
        answerSubmitted = false;
    }
}

function moveToNextQuestion() {
    const challenges = currentMission.challenges;

    if (currentQuestionIndex < challenges.length - 1) {
        currentQuestionIndex += 1;
        renderQuestion();
        return;
    }

    const nextMission = missionGroups.find(mission =>
        mission.challenges.some(
            challenge => !answeredQuestions.has(Number(challenge.id))
        )
    );

    if (nextMission) {
        showToast(`${currentMission.info.title} completed. Next mission unlocked!`);
        startMission(nextMission);
        return;
    }

    finishGame();
}

function finishGame() {
    sessionFinished = true;

    const scorePercentage = getScorePercentage();
    const accuracy = getAccuracy();
    const escaped = scorePercentage >= ESCAPE_TARGET;

    showSection("results");

    const scene = $("resultScene");
    scene.classList.remove("victory", "failure");
    scene.classList.add(escaped ? "victory" : "failure");

    $("resultEyebrow").textContent =
        escaped ? "ESCAPE PROTOCOL // SUCCESS" : "ESCAPE PROTOCOL // FAILED";

    $("resultTitle").textContent =
        escaped ? "YOU ESCAPED!" : "STILL TRAPPED!";

    $("resultMessage").textContent = escaped
        ? "The security door unlocks. Your character escapes the room because you proved your cybersecurity skills."
        : `Your score is ${scorePercentage}%. You need at least ${ESCAPE_TARGET}% to escape. The door remains locked. Review what you learned and try again.`;

    $("finalScore").textContent = earnedPoints;
    $("maxScore").textContent = maximumPoints;
    $("resultAccuracy").textContent = `${accuracy}%`;
    $("resultCorrect").textContent = `${correctQuestions.size}/${allChallenges.length}`;
    $("resultMissions").textContent =
        `${missionGroups.filter(mission =>
            mission.challenges.every(challenge =>
                answeredQuestions.has(Number(challenge.id))
            )
        ).length}/${missionGroups.length}`;

    $("resultLevel").textContent = getRank(scorePercentage, escaped);
    $("resultRecommendation").textContent = escaped
        ? "Excellent work. You demonstrated strong digital safety awareness. Keep applying these habits online."
        : "Review the explanations, learn from incorrect answers, and replay the escape room to improve your score.";

    $("resultMeterFill").style.width = `${Math.min(scorePercentage, 100)}%`;

    createVictoryParticles(escaped);
}

function getRank(percentage, escaped) {
    if (!escaped) return "CYBER ROOKIE";
    if (percentage >= 100) return "CYBER LEGEND";
    if (percentage >= 95) return "CYBER MASTER";
    return "CYBER EXPERT";
}

function createVictoryParticles(escaped) {
    const container = $("resultParticles");
    container.innerHTML = "";

    if (!escaped) return;

    for (let i = 0; i < 42; i++) {
        const particle = document.createElement("span");
        particle.className = "particle";

        particle.style.setProperty("--dx", `${Math.random() * 600 - 300}px`);
        particle.style.setProperty("--dy", `${Math.random() * 440 - 220}px`);
        particle.style.animationDelay = `${Math.random() * 0.8}s`;

        if (i % 3 === 0) particle.style.background = "#48e0d0";
        if (i % 3 === 1) particle.style.background = "#9b72ff";

        container.appendChild(particle);
    }
}

function resetGame() {
    answeredQuestions = new Map();
    correctQuestions = new Set();
    earnedPoints = 0;
    sessionFinished = false;
    currentMission = null;
    currentQuestionIndex = 0;
    selectedOption = null;
    answerSubmitted = false;

    updateOverallProgress();
    showSection("missions");
    showToast("New game started. Good luck!");
}

function beginGame() {
    if (!allChallenges.length) {
        showToast("Challenges are still loading. Try again in a moment.");
        return;
    }

    if (sessionFinished) resetGame();

    const firstUnanswered = missionGroups.find(mission =>
        mission.challenges.some(
            challenge => !answeredQuestions.has(Number(challenge.id))
        )
    );

    startMission(firstUnanswered || missionGroups[0]);
}

ui.start.addEventListener("click", beginGame);
ui.next.addEventListener("click", submitAnswer);

ui.back.addEventListener("click", () => {
    showSection("missions");
    renderMissionCards();
});

ui.resultsBack.addEventListener("click", () => {
    showSection("missions");
    renderMissionCards();
});

ui.playAgain.addEventListener("click", resetGame);

ui.home.addEventListener("click", (event) => {
    event.preventDefault();
    showSection("missions");
});

loadChallenges();