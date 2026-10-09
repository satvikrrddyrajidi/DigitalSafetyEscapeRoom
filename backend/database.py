
import json
import sqlite3
from pathlib import Path

DATABASE_PATH = Path(__file__).resolve().parent / "database.db"

SEED_CHALLENGES = [
    {
        "category": "Phishing",
        "title": "The Urgent Email",
        "scenario": "You receive an email claiming your college account will be suspended in 10 minutes unless you verify your password using a link.",
        "question": "What is the safest action?",
        "options": [
            "Click the link and enter your password quickly",
            "Reply with your password to confirm your identity",
            "Open the official college website independently and verify the alert",
            "Forward the email to all your classmates"
        ],
        "correct_option": 2,
        "explanation": "Urgency and threats are common phishing tactics. Visit the official website independently instead of using a link in a suspicious message.",
        "points": 10,
        "difficulty": "Easy"
    },
    {
        "category": "Phishing",
        "title": "The Strange Sender",
        "scenario": "A message appears to come from your bank, but the sender address contains extra characters and spelling mistakes.",
        "question": "Which detail is the strongest warning sign?",
        "options": [
            "The message uses your first name",
            "The sender address does not match the bank's genuine domain",
            "The message arrived in the morning",
            "The email contains a greeting"
        ],
        "correct_option": 1,
        "explanation": "Attackers often use lookalike domains to impersonate trusted organizations.",
        "points": 10,
        "difficulty": "Easy"
    },
    {
        "category": "Phishing",
        "title": "The Unexpected Attachment",
        "scenario": "An unknown sender emails an attachment named College_Result.exe and asks you to open it immediately.",
        "question": "What should you do?",
        "options": [
            "Open it to check your result",
            "Rename the file and open it",
            "Send it to your friends first",
            "Do not open it; verify the sender through a trusted channel"
        ],
        "correct_option": 3,
        "explanation": "Unexpected executable attachments may contain malware. Verify the sender through official channels.",
        "points": 10,
        "difficulty": "Medium"
    },
    {
        "category": "Password Security",
        "title": "The Reused Password",
        "scenario": "You use the same password for email, social media, and your college portal. One website reports a data breach.",
        "question": "What is the best way to protect your other accounts?",
        "options": [
            "Keep the same password everywhere",
            "Change it only if someone contacts you",
            "Use unique passwords for each account and change exposed ones",
            "Write your password in a public profile"
        ],
        "correct_option": 2,
        "explanation": "Unique passwords reduce the risk of attackers using leaked credentials on other websites.",
        "points": 10,
        "difficulty": "Easy"
    },
    {
        "category": "Password Security",
        "title": "The Verification Code",
        "scenario": "Someone claiming to be technical support calls you and asks for a one-time password sent to your phone.",
        "question": "What should you do?",
        "options": [
            "Share it because the caller sounds professional",
            "Never share the code and independently contact official support",
            "Send it through chat",
            "Share it if the caller knows your name"
        ],
        "correct_option": 1,
        "explanation": "Never disclose one-time passwords or authentication codes to callers.",
        "points": 10,
        "difficulty": "Medium"
    },
    {
        "category": "Password Security",
        "title": "Building a Strong Password",
        "scenario": "You are creating a password for an important personal account.",
        "question": "Which approach is generally the safest?",
        "options": [
            "Use your birth date and first name",
            "Use password123",
            "Use the same short password everywhere",
            "Use a long, unique password or passphrase, ideally stored in a password manager"
        ],
        "correct_option": 3,
        "explanation": "Long, unique passwords or passphrases help protect accounts against guessing and password reuse.",
        "points": 10,
        "difficulty": "Easy"
    },
    {
        "category": "Malicious QR Codes",
        "title": "The Parking QR Code",
        "scenario": "A QR code sticker on a parking meter directs you to a payment page with an unfamiliar web address.",
        "question": "What should you do before paying?",
        "options": [
            "Check the destination address and use the official payment method if anything seems suspicious",
            "Enter your card details immediately",
            "Assume QR codes are always safe",
            "Share the QR code with strangers"
        ],
        "correct_option": 0,
        "explanation": "QR codes can lead to fraudulent websites. Inspect the destination before paying.",
        "points": 10,
        "difficulty": "Medium"
    },
    {
        "category": "Malicious QR Codes",
        "title": "The Free Wi-Fi QR",
        "scenario": "A public Wi-Fi QR code opens a page requesting your email password.",
        "question": "What is the safest decision?",
        "options": [
            "Enter your email password",
            "Use your banking password",
            "Avoid entering sensitive credentials and verify the network with staff",
            "Disable your phone security"
        ],
        "correct_option": 2,
        "explanation": "A Wi-Fi sign-in page should not need your unrelated email password.",
        "points": 10,
        "difficulty": "Medium"
    },
    {
        "category": "Malicious QR Codes",
        "title": "The Fake Delivery Notice",
        "scenario": "An unexpected delivery QR code opens a website asking for a small fee and your card details.",
        "question": "How should you verify the delivery request?",
        "options": [
            "Pay immediately",
            "Check the delivery through the courier's official app or website",
            "Enter card details on any page",
            "Share your banking PIN"
        ],
        "correct_option": 1,
        "explanation": "Check shipment details using the courier's verified website or app.",
        "points": 10,
        "difficulty": "Medium"
    },
    {
        "category": "Online Scams",
        "title": "The Too-Good-To-Be-True Offer",
        "scenario": "A social media account offers an expensive phone at a 90% discount if you immediately transfer money to a personal account.",
        "question": "What is the safest response?",
        "options": [
            "Transfer money before the offer expires",
            "Trust the account because it has a logo",
            "Send identity documents to reserve the offer",
            "Verify the seller independently and avoid suspicious advance payments"
        ],
        "correct_option": 3,
        "explanation": "Extreme discounts and pressure to pay immediately are common scam indicators.",
        "points": 10,
        "difficulty": "Easy"
    },
    {
        "category": "Online Scams",
        "title": "The Fake Job Offer",
        "scenario": "A recruiter promises a high-paying job without an interview but demands a registration fee.",
        "question": "What should you do?",
        "options": [
            "Pay quickly",
            "Verify the company and recruiter through official channels; do not pay suspicious fees",
            "Send your banking password",
            "Borrow money to pay the recruiter"
        ],
        "correct_option": 1,
        "explanation": "Requests for upfront job fees can indicate recruitment fraud.",
        "points": 10,
        "difficulty": "Medium"
    },
    {
        "category": "Online Scams",
        "title": "The Impersonation Message",
        "scenario": "An account using your friend's photo urgently asks you to send money.",
        "question": "What is the best first step?",
        "options": [
            "Send money immediately",
            "Post your bank details in the chat",
            "Call your friend using a known number to verify the request",
            "Forward the request to everyone"
        ],
        "correct_option": 2,
        "explanation": "Verify urgent financial requests through a separate, trusted communication channel.",
        "points": 10,
        "difficulty": "Easy"
    }
]


def get_connection():
    connection = sqlite3.connect(str(DATABASE_PATH))
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database():
    """Create or safely upgrade the database without deleting existing records."""
    with get_connection() as connection:
        connection.execute("""
            CREATE TABLE IF NOT EXISTS challenges (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                category TEXT NOT NULL,
                title TEXT NOT NULL,
                scenario TEXT NOT NULL,
                question TEXT NOT NULL,
                options TEXT NOT NULL,
                correct_option INTEGER NOT NULL,
                explanation TEXT NOT NULL,
                points INTEGER NOT NULL DEFAULT 10,
                difficulty TEXT NOT NULL DEFAULT 'Medium'
            )
        """)

        columns = {
            row["name"]
            for row in connection.execute(
                "PRAGMA table_info(challenges)"
            ).fetchall()
        }

        # Add optional columns missing from an older database.
        if "points" not in columns:
            connection.execute("""
                ALTER TABLE challenges
                ADD COLUMN points INTEGER NOT NULL DEFAULT 10
            """)
            columns.add("points")

        if "difficulty" not in columns:
            connection.execute("""
                ALTER TABLE challenges
                ADD COLUMN difficulty TEXT NOT NULL DEFAULT 'Medium'
            """)
            columns.add("difficulty")

        required_columns = {
            "id", "category", "title", "scenario", "question",
            "options", "correct_option", "explanation",
            "points", "difficulty"
        }

        missing = required_columns - columns
        if missing:
            raise RuntimeError(
                f"Database is missing required columns: {sorted(missing)}. "
                "Existing records have not been deleted."
            )

        count = connection.execute(
            "SELECT COUNT(*) FROM challenges"
        ).fetchone()[0]

        # Insert sample challenges only when the table is empty.
        if count == 0:
            connection.executemany("""
                INSERT INTO challenges (
                    category, title, scenario, question, options,
                    correct_option, explanation, points, difficulty
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, [
                (
                    item["category"],
                    item["title"],
                    item["scenario"],
                    item["question"],
                    json.dumps(item["options"]),
                    item["correct_option"],
                    item["explanation"],
                    item["points"],
                    item["difficulty"]
                )
                for item in SEED_CHALLENGES
            ])

        connection.commit()


def convert_row(row):
    if row is None:
        return None

    item = dict(row)

    try:
        item["options"] = json.loads(item["options"])
    except (TypeError, json.JSONDecodeError):
        item["options"] = []

    item["points"] = int(item.get("points") or 10)
    item["difficulty"] = item.get("difficulty") or "Medium"

    return item


def get_all_challenges():
    with get_connection() as connection:
        rows = connection.execute("""
            SELECT id, category, title, scenario, question,
                   options, correct_option, explanation, points, difficulty
            FROM challenges
            ORDER BY id
        """).fetchall()

    return [convert_row(row) for row in rows]


def get_challenge_by_id(challenge_id):
    with get_connection() as connection:
        row = connection.execute("""
            SELECT id, category, title, scenario, question,
                   options, correct_option, explanation, points, difficulty
            FROM challenges
            WHERE id = ?
        """, (challenge_id,)).fetchone()

    return convert_row(row)


def get_database_statistics():
    with get_connection() as connection:
        total = connection.execute(
            "SELECT COUNT(*) FROM challenges"
        ).fetchone()[0]

        categories = connection.execute("""
            SELECT COUNT(DISTINCT category) FROM challenges
        """).fetchone()[0]

        maximum_score = connection.execute("""
            SELECT COALESCE(SUM(points), 0) FROM challenges
        """).fetchone()[0]

    return {
        "total_challenges": total,
        "total_missions": categories,
        "maximum_score": maximum_score
    }


if __name__ == "__main__":
    initialize_database()
    print("Database initialized successfully.")
    print(f"Database location: {DATABASE_PATH}")
    print(f"Challenge count: {len(get_all_challenges())}")
    print(f"Statistics: {get_database_statistics()}")
