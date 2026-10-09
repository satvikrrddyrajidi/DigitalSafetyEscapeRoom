
"use strict";

// ============================================================
// DIGITAL SAFETY ESCAPE ROOM
// FRONTEND GAME CONTROLLER
// ============================================================

const API_BASE_URL =
    "https://digital-safety-escape-room-api.onrender.com/api";

const ESCAPE_TARGET = 90;

const missionInfo = {
    phishing: {
        title: "Phishing Detection",
        icon: "🎣",
        description:
            "Identify suspicious messages, fake websites, and attempts to steal your information.",
        color: "#9b72ff"
    },
    password: {
        title: "Password Security",
        icon: "🔐",
        description:
            "Defend accounts using strong passwords and secure authentication practices.",
        color: "#48e0d0"
    },
    qr: {
        title: "Malicious QR Codes",
        icon: "▦",
        description:
            "Recognize dangerous QR codes, suspicious links, and unsafe scanning requests.",
        color: "#ffbd69"
    },
    scam: {
        title: "Online Scam Awareness",
        icon: "🛡️",
        description:
            "Avoid online fraud, impersonation, fake offers, and social engineering traps.",
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
let submittingAnswer = false;
let toastTimer = null;

let answeredQuestions = new Map();
let correctQuestions = new Set();
let earnedPoints = 0;
let maximumPoints = 0;

// ============================================================
// HELPERS
// ============================================================

function normalizeCategory(category) {
    return String(category || "").toLowerCase().trim();
}

function identifyMission(category) {
    const value = normalizeCategory(category);

    if (value.includes("phish")) return "phishing";

    if (
        value.includes("password") ||
        value.includes("passcode")
    ) {
        return "password";
    }

    if (
        value.includes("qr") ||
        value.includes("code scan")
    ) {
        return "qr";
    }

    if (
        value.includes("scam") ||
        value.includes("fraud")
    ) {
        return "scam";
    }

    return value.replace(/[^a-z0-9]+/g, "");
}

function getMissionInfo(category) {
    const key = identifyMission(category);

    if (missionInfo[key]) {
        return missionInfo[key];
    }

    return {
        title: category || "Cybersecurity Challenge",
        icon: "🔒",
        description:
            "Complete these cybersecurity challenges to progress toward the exit.",
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
    if (!ui.toast) {
        console.log(message);
        return;
    }

    ui.toast.textContent = message;
    ui.toast.classList.remove("hidden");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        ui.toast.classList.add("hidden");
    }, 3200);
}

function showSection(section) {
    if (ui.missions) {
        ui.missions.classList.toggle(
            "hidden",
            section !== "missions"
        );
    }

    if (ui.challengeArea) {
        ui.challengeArea.classList.toggle(
            "hidden",
            section !== "challenge"
        );
    }

    if (ui.results) {
        ui.results.classList.toggle(
            "hidden",
            section !== "results"
        );
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

async function readResponse(response) {
    const text = await response.text();

    let data;

    try {
        data = text ? JSON.parse(text) : {};
    } catch {
        throw new Error(
            "The server returned an invalid response. Please try again."
        );
    }

    if (!response.ok) {
        throw new Error(
            data.message ||
            data.error ||
            `Server returned status ${response.status}`
        );
    }

    return data;
}

function getPoints(challenge) {
    const value = Number(challenge.points);

    return Number.isFinite(value) && value > 0
        ? value
        : 10;
}

function parseOptions(value) {
    if (Array.isArray(value)) {
        return value;
    }

    if (typeof value === "string") {
        try {
            const parsed = JSON.parse(value);

            if (Array.isArray(parsed)) {
                return parsed;
            }
        } catch {
            // Handle plain-text options below.
        }

        return value
            .split(/\r?\n/)
            .map(item => item.trim())
            .filter(Boolean);
    }

    return [];
}

function getCompletedCount() {
    return answeredQuestions.size;
}

function getAccuracy() {
    if (!allChallenges.length) return 0;

    return Math.round(
        (correctQuestions.size / allChallenges.length) * 100
    );
}

function getScorePercentage() {
    if (maximumPoints <= 0) return 0;

    return Math.round(
        (earnedPoints / maximumPoints) * 100
    );
}

// ============================================================
// LOAD CHALLENGES
// ============================================================

async function loadChallenges() {
    if (ui.loadError) {
        ui.loadError.classList.add("hidden");
    }

    if (ui.challengeGrid) {
        ui.challengeGrid.innerHTML =
            '<div class="loading-card">Connecting to the cybersecurity game server...</div>';
    }

    try {
        // FIX: Use API_BASE_URL consistently.
        const response = await fetch(
            `${API_BASE_URL}/challenges`
        );

        const data = await readResponse(response);

        allChallenges = Array.isArray(data)
            ? data
            : (
                data.challenges ||
                data.data ||
                []
            );

        if (!Array.isArray(allChallenges) ||
            allChallenges.length === 0) {
            throw new Error(
                "The server returned no challenges."
            );
        }

        allChallenges.sort(
            (a, b) => Number(a.id) - Number(b.id)
        );

        missionGroups = buildMissionGroups(allChallenges);

        maximumPoints = allChallenges.reduce(
            (sum, challenge) =>
                sum + getPoints(challenge),
            0
        );

        setText("missionCount", missionGroups.length);
        setText("challengeCount", allChallenges.length);
        setText("maximumScore", maximumPoints);
        setText("maxScore", maximumPoints);
        setText("liveMaxScore", `/ ${maximumPoints} POINTS`);

        renderMissionCards();
        updateOverallProgress();

        console.log(
            `Loaded ${allChallenges.length} cybersecurity challenges.`
        );
    } catch (error) {
        console.error("Unable to load challenges:", error);

        if (ui.challengeGrid) {
            ui.challengeGrid.innerHTML =
                '<div class="loading-card">Unable to connect to the game server.</div>';
        }

        if (ui.loadError) {
            ui.loadError.textContent =
                `${error.message} Check the deployed API and refresh the page.`;

            ui.loadError.classList.remove("hidden");
        }
    }
}

function setText(id, value) {
    const element = $(id);

    if (element) {
        element.textContent = value;
    }
}

// ============================================================
// MISSION GROUPS
// ============================================================

function buildMissionGroups(challenges) {
    const groups = new Map();

    challenges.forEach((challenge) => {
        const category =
            challenge.category || "General Cybersecurity";

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

function renderMissionCards() {
    if (!ui.challengeGrid) return;

    ui.challengeGrid.innerHTML = "";

    missionGroups.forEach((mission) => {
        const completed = mission.challenges.every(
            challenge =>
                answeredQuestions.has(Number(challenge.id))
        );

        const completedCount = mission.challenges.filter(
            challenge =>
                answeredQuestions.has(Number(challenge.id))
        ).length;

        const missionPoints = mission.challenges.reduce(
            (sum, challenge) =>
                sum + getPoints(challenge),
            0
        );

        const missionEarned = mission.challenges.reduce(
            (sum, challenge) =>
                sum + (
                    correctQuestions.has(Number(challenge.id))
                        ? getPoints(challenge)
                        : 0
                ),
            0
        );

        const card = document.createElement("article");

        card.className =
            `mission-card${completed ? " completed" : ""}`;

        card.style.setProperty(
            "--mission-color",
            mission.info.color
        );

        card.innerHTML = `
            <div class="mission-card-top">
                <span class="mission-icon">
                    ${mission.info.icon}
                </span>

                <span class="mission-tag">
                    ${completed
                        ? "✓ MISSION COMPLETE"
                        : "MISSION STATUS: OPEN"}
                </span>
            </div>

            <h3>${escapeHtml(mission.info.title)}</h3>

            <p>${escapeHtml(mission.info.description)}</p>

            <div class="mission-meta">
                <span>▤ ${mission.challenges.length} challenges</span>
                <span>★ ${missionEarned}/${missionPoints} points</span>
                <span>✓ ${completedCount}/${mission.challenges.length}</span>
            </div>

            <button
                class="primary-btn mission-action"
                type="button"
            >
                ${completed
                    ? "REPLAY MISSION ↻"
                    : "ENTER MISSION →"}
            </button>
        `;

        card.querySelector("button").addEventListener(
            "click",
            () => startMission(mission)
        );

        ui.challengeGrid.appendChild(card);
    });
}

// ============================================================
// PROGRESS DASHBOARD
// ============================================================

function updateOverallProgress() {
    const answered = getCompletedCount();

    const percentage = allChallenges.length
        ? Math.round(
            (answered / allChallenges.length) * 100
        )
        : 0;

    setText("overallPercentage", `${percentage}%`);

    const progressBar = $("progressBar");

    if (progressBar) {
        progressBar.style.width = `${percentage}%`;
    }

    setText(
        "progressStatus",
        `${answered} of ${allChallenges.length} challenges completed`
    );

    setText("liveScore", earnedPoints);

    const escapeProgress = $("escapeProgress");

    if (escapeProgress) {
        escapeProgress.style.width =
            `${Math.min(100, getScorePercentage())}%`;
    }

    setText(
        "escapeProgressText",
        `${getScorePercentage()}% score achieved`
    );

    renderMissionCards();
}

// ============================================================
// START AND RENDER MISSIONS
// ============================================================

function startMission(mission) {
    if (!mission) return;

    if (sessionFinished) {
        resetGame();
    }

    currentMission = mission;

    currentQuestionIndex =
        findNextUnansweredIndex(mission);

    if (currentQuestionIndex === -1) {
        currentQuestionIndex = 0;
    }

    showSection("challenge");
    renderQuestion();
}

function findNextUnansweredIndex(mission) {
    return mission.challenges.findIndex(
        challenge =>
            !answeredQuestions.has(Number(challenge.id))
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
    submittingAnswer = false;
    answerSubmitted = answeredQuestions.has(id);

    const missionIndex =
        missionGroups.findIndex(
            mission => mission.key === currentMission.key
        ) + 1;

    setText("currentCategory", `MISSION ${missionIndex}`);
    setText("currentMissionTitle", currentMission.info.title);
    setText(
        "currentMissionDescription",
        currentMission.info.description
    );

    setText(
        "questionCounter",
        `QUESTION ${currentQuestionIndex + 1} / ${challenges.length}`
    );

    setText(
        "missionProgressText",
        `${currentQuestionIndex + 1} of ${challenges.length} questions`
    );

    const missionProgressBar = $("missionProgressBar");

    if (missionProgressBar) {
        missionProgressBar.style.width =
            `${((currentQuestionIndex + 1) / challenges.length) * 100}%`;
    }

    setText(
        "questionScenario",
        challenge.scenario ||
        "Review the situation and choose the safest response."
    );

    setText("questionTitle", "YOUR DECISION");

    setText(
        "questionText",
        challenge.question || "Choose the best answer."
    );

    if (ui.options) {
        ui.options.innerHTML = "";
    }

    if (ui.feedback) {
        ui.feedback.className = "feedback-box hidden";
        ui.feedback.textContent = "";
    }

    if (ui.hint) {
        ui.hint.textContent =
            "Select one answer, then submit your decision.";
    }

    const options = parseOptions(challenge.options);

    options.forEach((option, index) => {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "option-btn";

        button.innerHTML = `
            <span class="option-letter">
                ${String.fromCharCode(65 + index)}
            </span>
            <span>${escapeHtml(option)}</span>
        `;

        button.addEventListener("click", () => {
            if (answerSubmitted || submittingAnswer) return;

            selectedOption = index;

            ui.options.querySelectorAll(
                ".option-btn"
            ).forEach(item => {
                item.classList.remove("selected");
            });

            button.classList.add("selected");

            if (ui.next) {
                ui.next.disabled = false;
            }

            if (ui.hint) {
                ui.hint.textContent =
                    `Selected option ${String.fromCharCode(65 + index)}. Ready to submit.`;
            }
        });

        if (ui.options) {
            ui.options.appendChild(button);
        }
    });

    if (answerSubmitted) {
        showPreviouslyAnswered(challenge);
    }

    if (ui.next) {
        ui.next.disabled =
            !answerSubmitted && selectedOption === null;

        ui.next.textContent = answerSubmitted
            ? (
                currentQuestionIndex === challenges.length - 1
                    ? "FINISH MISSION →"
                    : "NEXT QUESTION →"
            )
            : "SUBMIT ANSWER →";
    }

    updateOverallProgress();
}

function showPreviouslyAnswered(challenge) {
    const id = Number(challenge.id);
    const wasCorrect = correctQuestions.has(id);

    if (ui.options) {
        ui.options.querySelectorAll(
            ".option-btn"
        ).forEach(button => {
            button.disabled = true;
        });
    }

    if (ui.feedback) {
        ui.feedback.className =
            `feedback-box ${wasCorrect ? "correct" : "incorrect"}`;

        ui.feedback.textContent = wasCorrect
            ? "✓ Correct answer. Your points have been recorded."
            : "✗ This question was answered incorrectly in this attempt.";
    }

    if (ui.hint) {
        ui.hint.textContent =
            "This question has already been answered in this attempt.";
    }
}

// ============================================================
// SUBMIT ANSWER
// ============================================================

async function submitAnswer() {
    if (!currentMission || sessionFinished || submittingAnswer) {
        return;
    }

    const challenge =
        currentMission.challenges[currentQuestionIndex];

    const id = Number(challenge.id);

    if (answerSubmitted) {
        moveToNextQuestion();
        return;
    }

    if (selectedOption === null) {
        showToast("Choose an answer first.");
        return;
    }

    submittingAnswer = true;

    if (ui.next) {
        ui.next.disabled = true;
        ui.next.textContent = "CHECKING ANSWER...";
    }

    try {
        // FIX: Use API_BASE_URL consistently here too.
        const response = await fetch(
            `${API_BASE_URL}/submit-answer`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    challenge_id: id,
                    selected_option: selectedOption
                })
            }
        );

        const result = await readResponse(response);

        const correct = Boolean(
            result.is_correct ??
            result.correct ??
            result.success
        );

        answerSubmitted = true;

        answeredQuestions.set(id, selectedOption);

        if (correct) {
            correctQuestions.add(id);

            const pointsEarned = Number(
                result.points_earned ??
                result.points ??
                getPoints(challenge)
            );

            earnedPoints += pointsEarned;

            if (ui.feedback) {
                ui.feedback.className =
                    "feedback-box correct";

                ui.feedback.textContent =
                    `✓ CORRECT! +${pointsEarned} points. ` +
                    (
                        result.explanation ||
                        "Great work! Keep going."
                    );
            }

            showToast("Correct answer! Points earned.");
        } else {
            correctQuestions.delete(id);

            if (ui.feedback) {
                ui.feedback.className =
                    "feedback-box incorrect";

                ui.feedback.textContent =
                    "✗ Not quite right. " +
                    (
                        result.explanation ||
                        "Review the situation carefully for your next attempt."
                    );
            }

            showToast("Incorrect answer. Keep learning.");
        }

        if (ui.options) {
            ui.options.querySelectorAll(
                ".option-btn"
            ).forEach((button, index) => {
                button.disabled = true;

                if (index === selectedOption) {
                    button.classList.add(
                        correct
                            ? "correct-option"
                            : "wrong-option"
                    );
                }
            });
        }

        if (ui.hint) {
            ui.hint.textContent = correct
                ? "Decision accepted. You have moved one step closer to the exit."
                : "Decision recorded. Continue the missions to see your final result.";
        }

        if (ui.next) {
            ui.next.textContent =
                currentQuestionIndex ===
                currentMission.challenges.length - 1
                    ? "FINISH MISSION →"
                    : "NEXT QUESTION →";
        }

        updateOverallProgress();
    } catch (error) {
        console.error("Answer submission error:", error);

        if (ui.feedback) {
            ui.feedback.className =
                "feedback-box incorrect";

            ui.feedback.textContent =
                `Unable to submit this answer: ${error.message}`;
        }

        if (ui.next) {
            ui.next.disabled = false;
            ui.next.textContent = "TRY SUBMITTING AGAIN →";
        }

        answerSubmitted = false;
    } finally {
        submittingAnswer = false;

        if (ui.next) {
            ui.next.disabled = false;
        }
    }
}

// ============================================================
// NEXT QUESTION AND FINISH GAME
// ============================================================

function moveToNextQuestion() {
    const challenges = currentMission.challenges;

    if (currentQuestionIndex < challenges.length - 1) {
        currentQuestionIndex += 1;
        renderQuestion();
        return;
    }

    const nextMission = missionGroups.find(mission =>
        mission.challenges.some(
            challenge =>
                !answeredQuestions.has(Number(challenge.id))
        )
    );

    if (nextMission) {
        showToast(
            `${currentMission.info.title} completed. Next mission unlocked!`
        );

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

    if (scene) {
        scene.classList.remove("victory", "failure");
        scene.classList.add(
            escaped ? "victory" : "failure"
        );
    }

    setText(
        "resultEyebrow",
        escaped
            ? "ESCAPE PROTOCOL // SUCCESS"
            : "ESCAPE PROTOCOL // FAILED"
    );

    setText(
        "resultTitle",
        escaped ? "YOU ESCAPED!" : "STILL TRAPPED!"
    );

    setText(
        "resultMessage",
        escaped
            ? "The security door unlocks. You proved your cybersecurity skills."
            : `Your score is ${scorePercentage}%. You need at least ${ESCAPE_TARGET}% to escape. Review what you learned and try again.`
    );

    setText("finalScore", earnedPoints);
    setText("maxScore", maximumPoints);
    setText("resultAccuracy", `${accuracy}%`);

    setText(
        "resultCorrect",
        `${correctQuestions.size}/${allChallenges.length}`
    );

    const completedMissions = missionGroups.filter(mission =>
        mission.challenges.every(
            challenge =>
                answeredQuestions.has(Number(challenge.id))
        )
    ).length;

    setText(
        "resultMissions",
        `${completedMissions}/${missionGroups.length}`
    );

    setText(
        "resultLevel",
        getRank(scorePercentage, escaped)
    );

    setText(
        "resultRecommendation",
        escaped
            ? "Excellent work. You demonstrated strong digital safety awareness. Keep applying these habits online."
            : "Review the explanations, learn from incorrect answers, and replay the escape room to improve your score."
    );

    const meter = $("resultMeterFill");

    if (meter) {
        meter.style.width =
            `${Math.min(scorePercentage, 100)}%`;
    }

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

    if (!container) return;

    container.innerHTML = "";

    if (!escaped) return;

    for (let i = 0; i < 42; i++) {
        const particle = document.createElement("span");

        particle.className = "particle";

        particle.style.setProperty(
            "--dx",
            `${Math.random() * 600 - 300}px`
        );

        particle.style.setProperty(
            "--dy",
            `${Math.random() * 440 - 220}px`
        );

        particle.style.animationDelay =
            `${Math.random() * 0.8}s`;

        if (i % 3 === 0) {
            particle.style.background = "#48e0d0";
        }

        if (i % 3 === 1) {
            particle.style.background = "#9b72ff";
        }

        container.appendChild(particle);
    }
}

// ============================================================
// RESET GAME
// ============================================================

function resetGame() {
    answeredQuestions = new Map();
    correctQuestions = new Set();

    earnedPoints = 0;
    sessionFinished = false;
    submittingAnswer = false;

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
        showToast(
            "Challenges are still loading. Try again in a moment."
        );
        return;
    }

    if (sessionFinished) {
        resetGame();
    }

    const firstUnanswered = missionGroups.find(mission =>
        mission.challenges.some(
            challenge =>
                !answeredQuestions.has(Number(challenge.id))
        )
    );

    startMission(firstUnanswered || missionGroups[0]);
}

// ============================================================
// EVENT LISTENERS
// ============================================================

if (ui.start) {
    ui.start.addEventListener("click", beginGame);
}

if (ui.next) {
    ui.next.addEventListener("click", submitAnswer);
}

if (ui.back) {
    ui.back.addEventListener("click", () => {
        showSection("missions");
        renderMissionCards();
    });
}

if (ui.resultsBack) {
    ui.resultsBack.addEventListener("click", () => {
        showSection("missions");
        renderMissionCards();
    });
}

if (ui.playAgain) {
    ui.playAgain.addEventListener("click", resetGame);
}

if (ui.home) {
    ui.home.addEventListener("click", (event) => {
        event.preventDefault();
        showSection("missions");
    });
}

// ============================================================
// INITIALIZE
// ============================================================

loadChallenges();
