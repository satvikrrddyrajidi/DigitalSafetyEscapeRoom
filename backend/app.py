
import os

from flask import Flask, jsonify, request
from flask_cors import CORS

from database import (
    initialize_database,
    get_all_challenges,
    get_challenge_by_id,
    get_database_statistics,
)

app = Flask(__name__)
CORS(app)

app.config["JSON_SORT_KEYS"] = False

# Create or upgrade the database when the service starts.
initialize_database()


def public_challenge(challenge):
    """Return challenge data without exposing answers or explanations."""
    if challenge is None:
        return None

    result = dict(challenge)
    result.pop("correct_option", None)
    result.pop("explanation", None)
    return result


@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "project": "Digital Safety Escape Room",
        "status": "running",
        "message": "Cybersecurity learning API is online.",
        "endpoints": [
            "/api/health",
            "/api/challenges",
            "/api/challenges/<id>",
            "/api/submit-answer",
            "/api/statistics",
        ],
    })


@app.route("/api/health", methods=["GET"])
def health():
    try:
        return jsonify({
            "status": "healthy",
            "database": "connected",
            **get_database_statistics(),
        }), 200
    except Exception:
        app.logger.exception("Health check failed")
        return jsonify({
            "status": "error",
            "message": "Unable to access the database.",
        }), 500


@app.route("/api/challenges", methods=["GET"])
def challenges():
    try:
        records = get_all_challenges()
        return jsonify([
            public_challenge(item) for item in records
        ]), 200
    except Exception:
        app.logger.exception("Unable to retrieve challenges")
        return jsonify({
            "error": "Unable to load challenges."
        }), 500


@app.route("/api/challenges/<int:challenge_id>", methods=["GET"])
def challenge_details(challenge_id):
    try:
        challenge = get_challenge_by_id(challenge_id)

        if challenge is None:
            return jsonify({
                "error": "Challenge not found."
            }), 404

        return jsonify(public_challenge(challenge)), 200

    except Exception:
        app.logger.exception("Unable to retrieve challenge")
        return jsonify({
            "error": "Unable to load this challenge."
        }), 500


@app.route("/api/submit-answer", methods=["POST"])
def submit_answer():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "error": "Send a valid JSON request body."
        }), 400

    challenge_id = data.get("challenge_id")
    selected_option = data.get("selected_option")

    if (
        isinstance(challenge_id, bool)
        or not isinstance(challenge_id, int)
        or challenge_id < 1
    ):
        return jsonify({
            "error": "challenge_id must be a positive integer."
        }), 400

    if (
        isinstance(selected_option, bool)
        or not isinstance(selected_option, int)
        or selected_option < 0
    ):
        return jsonify({
            "error": "selected_option must be a non-negative integer."
        }), 400

    try:
        challenge = get_challenge_by_id(challenge_id)

        if challenge is None:
            return jsonify({
                "error": "Challenge not found."
            }), 404

        options = challenge.get("options", [])
        correct_option = challenge.get("correct_option")

        if (
            not isinstance(options, list)
            or selected_option >= len(options)
        ):
            return jsonify({
                "error": "The selected option is invalid."
            }), 400

        if (
            isinstance(correct_option, bool)
            or not isinstance(correct_option, int)
            or not 0 <= correct_option < len(options)
        ):
            app.logger.error(
                "Invalid correct_option for challenge ID %s",
                challenge_id,
            )
            return jsonify({
                "error": "The correct answer is not configured properly."
            }), 500

        is_correct = selected_option == correct_option
        points_available = int(challenge.get("points", 10))
        points_earned = points_available if is_correct else 0

        return jsonify({
            "challenge_id": challenge_id,
            "selected_option": selected_option,
            "correct_option": correct_option,
            "is_correct": is_correct,
            "correct": is_correct,
            "points_earned": points_earned,
            "points": points_earned,
            "explanation": challenge.get("explanation", ""),
        }), 200

    except Exception:
        app.logger.exception("Unable to process submitted answer")
        return jsonify({
            "error": "Unable to check your answer. Please try again."
        }), 500


@app.route("/api/statistics", methods=["GET"])
def statistics():
    try:
        return jsonify(get_database_statistics()), 200
    except Exception:
        app.logger.exception("Unable to retrieve statistics")
        return jsonify({
            "error": "Unable to load statistics."
        }), 500


@app.errorhandler(404)
def not_found(error):
    return jsonify({
        "error": "The requested API endpoint was not found."
    }), 404


@app.errorhandler(405)
def method_not_allowed(error):
    return jsonify({
        "error": "This HTTP method is not supported for this endpoint."
    }), 405


if __name__ == "__main__":
    print("Digital Safety Escape Room API starting...")

    app.run(
        host="127.0.0.1",
        port=int(os.environ.get("PORT", 5000)),
        debug=False,
        use_reloader=False,
    )
