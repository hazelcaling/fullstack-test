from flask import Flask, request, jsonify
from flask_cors import CORS
from models import db, Note
from config import Config

app = Flask(__name__)
app.config.from_object(Config)

CORS(app)

db.init_app(app)

with app.app_context():
    db.create_all()

@app.route("/notes", methods=["GET"])
def get_notes():
    notes = Note.query.all()
    return jsonify([
        {"id": n.id, "title": n.title, "content": n.content}
        for n in notes
    ])

@app.route("/notes", methods=["POST"])
def add_note():
    data = request.json
    note = Note(title=data["title"], content=data["content"])
    db.session.add(note)
    db.session.commit()
    return jsonify({"message": "Note created"}), 201

if __name__ == "__main__":
    app.run(debug=True)