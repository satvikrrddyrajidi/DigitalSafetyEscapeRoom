import json
import sqlite3
from pathlib import Path

DATABASE_PATH = Path(__file__).resolve().parent / "database.db"

# Correct option indexes: A = 0, B = 1, C = 2, D = 3
SEED_CHALLENGES = [
    {
        "id": 1,
        "category": "Phishing",
        "difficulty": "Easy",
        "title": "Urgent Bank Verification",
        "scenario": "You receive an email claiming your bank account will be suspended within 30 minutes unless you click a verification link.",
        "question": "What is the safest response?",
        "options": [
            "Click the link immediately and verify the account.",
            "Reply to the email asking the sender to confirm it.",
            "Do not click the link. Open the bank's official app or website independently.",
            "Forward the email to friends to ask whether it is legitimate."
        ],
        "correct_option": 2,
        "explanation": "Urgency and threats are common phishing tactics. Open the bank's official app or website independently.",
        "points": 10
    },
    {
        "id": 2,
        "category": "Phishing",
        "difficulty": "Easy",
        "title": "Suspicious Login Alert",
        "scenario": "A message says someone attempted to log into your social media account. It contains a 'Secure My Account' button.",
        "question": "What should you do first?",
        "options": [
            "Click the button immediately.",
            "Open the official social media website or app separately and check account security.",
            "Send your password to the sender for verification.",
            "Ignore all future security alerts."
        ],
        "correct_option": 1,
        "explanation": "Open the official app or website directly and review your account activity.",
        "points": 10
    },
    {
        "id": 3,
        "category": "Phishing",
        "difficulty": "Medium",
        "title": "Fake Internship Email",
        "scenario": "You receive an internship email from an unknown recruiter. The message asks you to download an attachment and enable macros before viewing the document.",
        "question": "What is the safest decision?",
        "options": [
            "Enable macros because the email looks professional.",
            "Download the file and scan it after enabling macros.",
            "Do not enable macros or open the attachment unless the sender and file are independently verified.",
            "Send the attachment to classmates to check it."
        ],
        "correct_option": 2,
        "explanation": "Unexpected attachments and requests to enable macros can be dangerous. Verify the recruiter and file through trusted channels.",
        "points": 10
    },
    {
        "id": 4,
        "category": "Password Security",
        "difficulty": "Easy",
        "title": "Strong Password",
        "scenario": "You are creating a password for an online banking account and want it to be resistant to guessing and automated attacks.",
        "question": "Which password is strongest?",
        "options": [
            "satvik123",
            "password2026",
            "R7!qZ#91@Lm$4x",
            "mybirthday2005"
        ],
        "correct_option": 2,
        "explanation": "A long, random, unique password is harder to guess. Do not reuse it on other accounts.",
        "points": 10
    },
    {
        "id": 5,
        "category": "Password Security",
        "difficulty": "Medium",
        "title": "Password Reuse",
        "scenario": "You use the same password for your email, gaming account, social media account, and college portal because it is easier to remember.",
        "question": "What is the biggest security risk?",
        "options": [
            "The password will become too long.",
            "If one service is breached, attackers may try the same password on your other accounts.",
            "Websites will automatically delete the password.",
            "Using one password improves account security."
        ],
        "correct_option": 1,
        "explanation": "Password reuse enables attackers to try leaked credentials on your other accounts. Use unique passwords.",
        "points": 10
    },
    {
        "id": 6,
        "category": "Password Security",
        "difficulty": "Easy",
        "title": "Multi-Factor Authentication",
        "scenario": "Your email provider offers multi-factor authentication. After entering your password, you must also approve a login through an authenticator app.",
        "question": "Why is MFA useful?",
        "options": [
            "It makes passwords unnecessary in every situation.",
            "It provides an additional verification factor beyond the password.",
            "It guarantees that phishing attacks cannot happen.",
            "It prevents the account from being accessed from a phone."
        ],
        "correct_option": 1,
        "explanation": "MFA adds another verification step, making access harder for someone who only knows your password.",
        "points": 10
    },
    {
        "id": 7,
        "category": "Malicious QR Codes",
        "difficulty": "Easy",
        "title": "Free Shopping Voucher",
        "scenario": "A poster in a public place advertises a free shopping voucher. A QR code asks you to scan it and enter your banking credentials.",
        "question": "What is the safest action?",
        "options": [
            "Scan it and enter the requested banking information.",
            "Scan it because the poster looks professionally designed.",
            "Do not scan it. Verify the offer through the company's official website.",
            "Share the QR code with friends first."
        ],
        "correct_option": 2,
        "explanation": "A QR code can lead to a fake website. Never enter banking credentials to claim an unverified offer.",
        "points": 10
    },
    {
        "id": 8,
        "category": "Malicious QR Codes",
        "difficulty": "Medium",
        "title": "Parking Payment QR",
        "scenario": "You find a QR sticker placed over the original parking payment QR code. It redirects you to a website asking for card details.",
        "question": "What should you do?",
        "options": [
            "Enter the card details because parking payments are normal.",
            "Use the official parking application or independently verify the payment location.",
            "Take a screenshot and send it to strangers online.",
            "Disable your phone's security features."
        ],
        "correct_option": 1,
        "explanation": "A sticker may replace a legitimate QR code with a fraudulent destination. Use an official payment method.",
        "points": 10
    },
    {
        "id": 9,
        "category": "Malicious QR Codes",
        "difficulty": "Medium",
        "title": "QR Login Request",
        "scenario": "A QR code sent through an unknown message claims that scanning it will instantly log you into your account on another device.",
        "question": "What should you consider before scanning?",
        "options": [
            "QR codes are always safe because they contain no text.",
            "Verify the source and destination before scanning because QR codes can lead to malicious websites.",
            "Scan it immediately if it promises convenience.",
            "Give the sender your password after scanning."
        ],
        "correct_option": 1,
        "explanation": "QR codes can lead to malicious websites or risky login flows. Only use codes from trusted sources.",
        "points": 10
    },
    {
        "id": 10,
        "category": "Online Scams",
        "difficulty": "Easy",
        "title": "Lottery Processing Fee",
        "scenario": "You receive a message claiming you have won ₹50,000. To receive the prize, you must first pay ₹2,000 as a processing fee.",
        "question": "What should you do?",
        "options": [
            "Pay the fee immediately.",
            "Send your bank details so the prize can be transferred.",
            "Ignore the message and verify the claim through an official source.",
            "Forward the message to other people."
        ],
        "correct_option": 2,
        "explanation": "Unexpected prizes that require upfront payment are a common scam pattern. Verify the claim independently.",
        "points": 10
    },
    {
        "id": 11,
        "category": "Online Scams",
        "difficulty": "Easy",
        "title": "Fake Customer Support",
        "scenario": "You search online for customer support and find a social media account offering to fix your banking problem. The account asks for your OTP.",
        "question": "What should you do?",
        "options": [
            "Share the OTP because they claim to be support staff.",
            "Share only the last four digits of the OTP.",
            "Do not share the OTP. Contact the organization through its official support channel.",
            "Post the OTP publicly so support can see it."
        ],
        "correct_option": 2,
        "explanation": "Never share OTPs or authentication codes. Contact the organization using its official support channel.",
        "points": 10
    },
    {
        "id": 12,
        "category": "Online Scams",
        "difficulty": "Easy",
        "title": "Investment Opportunity",
        "scenario": "A stranger promises to double your money in two days if you transfer funds to a private account immediately.",
        "question": "Which warning sign is most obvious?",
        "options": [
            "The promise of guaranteed high returns with urgent payment.",
            "The message uses a smartphone.",
            "The sender uses a profile picture.",
            "The investment discussion happens online."
        ],
        "correct_option": 0,
        "explanation": "Guaranteed unusually high returns and pressure to transfer money immediately are major fraud warning signs.",
        "points": 10
    }
]


def get_connection():
    connection = sqlite3.connect(str(DATABASE_PATH))
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database():
    """Create the table and synchronize the built-in challenges by ID."""
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

        if "points" not in columns:
            connection.execute("""
                ALTER TABLE challenges
                ADD COLUMN points INTEGER NOT NULL DEFAULT 10
            """)

        if "difficulty" not in columns:
            connection.execute("""
                ALTER TABLE challenges
                ADD COLUMN difficulty TEXT NOT NULL DEFAULT 'Medium'
            """)

        columns = {
            row["name"]
            for row in connection.execute(
                "PRAGMA table_info(challenges)"
            ).fetchall()
        }

        required_columns = {
            "id", "category", "title", "scenario", "question",
            "options", "correct_option", "explanation",
            "points", "difficulty"
        }

        missing = required_columns - columns
        if missing:
            raise RuntimeError(
                f"Database is missing required columns: {sorted(missing)}"
            )

        for item in SEED_CHALLENGES:
            values = (
                item["category"],
                item["title"],
                item["scenario"],
                item["question"],
                json.dumps(item["options"], ensure_ascii=False),
                item["correct_option"],
                item["explanation"],
                item["points"],
                item["difficulty"]
            )

            existing = connection.execute(
                "SELECT id FROM challenges WHERE id = ?",
                (item["id"],)
            ).fetchone()

            if existing:
                connection.execute("""
                    UPDATE challenges
                    SET category = ?,
                        title = ?,
                        scenario = ?,
                        question = ?,
                        options = ?,
                        correct_option = ?,
                        explanation = ?,
                        points = ?,
                        difficulty = ?
                    WHERE id = ?
                """, (*values, item["id"]))
            else:
                connection.execute("""
                    INSERT INTO challenges (
                        id, category, title, scenario, question,
                        options, correct_option, explanation,
                        points, difficulty
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (item["id"], *values))

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
    challenges = get_all_challenges()

    print("Database initialized successfully.")
    print(f"Database location: {DATABASE_PATH}")
    print(f"Challenge count: {len(challenges)}")
    print(f"Statistics: {get_database_statistics()}")

    for challenge in challenges:
        print(
            f'{challenge["id"]}. {challenge["title"]}: '
            f'correct option index = {challenge["correct_option"]}'
        )