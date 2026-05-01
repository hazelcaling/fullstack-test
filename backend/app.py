from flask import Flask, request, jsonify
from flask_cors import CORS
from models import db, Note, Quote, LineItem
from config import Config
import math

app = Flask(__name__)
app.config.from_object(Config)

CORS(app)
db.init_app(app)

with app.app_context():
    db.create_all()


def money(value):
    return float(value or 0)

def num(value, default=0):
    if value is None or value == "":
        return default
    return float(value)

def round_to_preferred(value):
    return round(value)


def calculate_line_item(item):
    qty = float(item.qty or 1)
    list_price = float(item.list_price or 0)
    multiplier = float(item.multiplier or 1)
    markup = float(item.markup or 0)
    freight = float(item.freight or 0)
    startup = float(item.startup or 0)
    surcharge = float(item.surcharge or 0)

    # ✅ CORRECT formula
    net_cost = list_price * (1 + surcharge) * multiplier

    raw_sell = (net_cost * (1 + markup)) + freight + startup

    sell_price = round_to_preferred(raw_sell)

    total_price = sell_price * qty

    item.net_cost = round(net_cost, 2)
    item.sell_price = round(sell_price, 2)
    item.total_price = round(total_price, 2)


def line_item_to_dict(item):
    return {
        "id": item.id,
        "quote_id": item.quote_id,
        "tag": item.tag,
        "vendor": item.vendor,
        "qty": item.qty,
        "description": item.description,
        "list_price": money(item.list_price),
        "multiplier": money(item.multiplier),
        "markup": money(item.markup),
        "freight": money(item.freight),
        "startup": money(item.startup),
        "surcharge": money(item.surcharge),
        "net_cost": money(item.net_cost),
        "sell_price": money(item.sell_price),
        "total_price": money(item.total_price),
        "terms": item.terms,
        "notes": item.notes,
    }


def quote_to_dict(q):
    return {
        "id": q.id,
        "date": q.date.strftime("%m/%d/%Y"),
        "quote_number": q.quote_number,
        "bid_date": q.bid_date,
        "contact": q.contact or [],
        "project": q.project,
        "to_company": q.to_company,
        "attention": q.attention,
        "location": q.location,
        "line_items": [line_item_to_dict(item) for item in q.line_items],
        "status": q.status,
    }


@app.route("/quotes", methods=["GET"])
def get_quotes():
    quotes = Quote.query.order_by(Quote.id.desc()).all()
    return jsonify([quote_to_dict(q) for q in quotes])


@app.route("/quotes/<int:id>", methods=["GET"])
def get_quote(id):
    quote = Quote.query.get_or_404(id)
    return jsonify(quote_to_dict(quote))


@app.route("/quotes", methods=["POST"])
def create_quote():
    data = request.json

    quote = Quote(
        bid_date=data.get("bid_date", "N/A"),
        contact=data.get("contact", []),
        project=data.get("project"),
        to_company=data.get("to_company"),
        attention=data.get("attention"),
        location=data.get("location"),
        status=data.get("status", "Not Started"),
    )

    db.session.add(quote)
    db.session.commit()

    return jsonify(quote_to_dict(quote)), 201


@app.route("/quotes/<int:id>", methods=["PUT"])
def update_quote(id):
    quote = Quote.query.get_or_404(id)
    data = request.json

    quote.bid_date = data.get("bid_date", quote.bid_date)
    quote.contact = data.get("contact", quote.contact or [])
    quote.project = data.get("project", quote.project)
    quote.to_company = data.get("to_company", quote.to_company)
    quote.attention = data.get("attention", quote.attention)
    quote.location = data.get("location", quote.location)
    quote.status = data.get("status", quote.status)

    db.session.commit()

    return jsonify(quote_to_dict(quote))


@app.route("/quotes/<int:id>", methods=["DELETE"])
def delete_quote(id):
    quote = Quote.query.get_or_404(id)

    LineItem.query.filter_by(quote_id=id).delete()
    db.session.delete(quote)
    db.session.commit()

    return jsonify({"message": "Quote deleted"}), 200


@app.route("/quotes/<int:quote_id>/line-items", methods=["POST"])
def create_line_item(quote_id):
    Quote.query.get_or_404(quote_id)
    data = request.json

    item = LineItem(
    quote_id=quote_id,
    tag=data.get("tag"),
    vendor=data.get("vendor"),
    qty=num(data.get("qty"), 1),
    description=data.get("description"),
    list_price=num(data.get("list_price"), 0),
    multiplier=num(data.get("multiplier"), 1),
    markup=num(data.get("markup"), 0),
    freight=num(data.get("freight"), 0),
    startup=num(data.get("startup"), 0),
    surcharge=num(data.get("surcharge"), 0),  # ⭐ important
    terms=data.get("terms", "FFA"),
    notes=data.get("notes"),
)

    calculate_line_item(item)

    db.session.add(item)
    db.session.commit()

    return jsonify(line_item_to_dict(item)), 201


@app.route("/line-items/<int:id>", methods=["PUT"])
def update_line_item(id):
    item = LineItem.query.get_or_404(id)
    data = request.json

    item.tag = data.get("tag", item.tag)
    item.vendor = data.get("vendor", item.vendor)
    item.qty = num(data.get("qty"), item.qty)
    item.description = data.get("description", item.description)
    item.list_price = num(data.get("list_price"), item.list_price)
    item.multiplier = num(data.get("multiplier"), item.multiplier)
    item.markup = num(data.get("markup"), item.markup)
    item.freight = num(data.get("freight"), item.freight)
    item.startup = num(data.get("startup"), item.startup)
    item.surcharge = num(data.get("surcharge"), 0)
    item.terms = data.get("terms", item.terms)
    item.notes = data.get("notes", item.notes)

    calculate_line_item(item)

    db.session.commit()

    return jsonify(line_item_to_dict(item))


@app.route("/line-items/<int:id>", methods=["DELETE"])
def delete_line_item(id):
    item = LineItem.query.get_or_404(id)

    db.session.delete(item)
    db.session.commit()

    return jsonify({"message": "Line item deleted"}), 200


if __name__ == "__main__":
    app.run(debug=True)