from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import random
from sqlalchemy import JSON

db = SQLAlchemy()


# ---------------------------
# Notes (optional)
# ---------------------------
class Note(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(120), nullable=False)
    content = db.Column(db.Text, nullable=False)


# ---------------------------
# Quote Number Generator
# ---------------------------
def generate_unique_quote_number():
    while True:
        date_part = datetime.now().strftime("%m%d%y")
        random_part = f"{random.randint(0, 999):03d}"
        quote_number = f"Q{date_part}{random_part}"

        existing = Quote.query.filter_by(quote_number=quote_number).first()
        if not existing:
            return quote_number


# ---------------------------
# Quote Model
# ---------------------------
class Quote(db.Model):
    __tablename__ = "quotes"

    id = db.Column(db.Integer, primary_key=True)

    quote_number = db.Column(
        db.String(20),
        unique=True,
        nullable=False,
        default=generate_unique_quote_number
    )

    date = db.Column(
        db.Date,
        nullable=False,
        default=datetime.utcnow
    )

    bid_date = db.Column(db.String(50), default="N/A")

    # multiple contacts
    contact = db.Column(JSON, default=list)

    project = db.Column(db.String(200))
    to_company = db.Column(db.String(100))
    attention = db.Column(db.String(100))
    location = db.Column(db.String(100))

    status = db.Column(db.String(30), default="Not Started")

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    # ✅ RELATIONSHIP (IMPORTANT)
    line_items = db.relationship(
        "LineItem",
        backref="quote",
        cascade="all, delete-orphan",
        order_by="LineItem.id"
    )


# ---------------------------
# Line Item Model
# ---------------------------
class LineItem(db.Model):
    __tablename__ = "line_items"

    id = db.Column(db.Integer, primary_key=True)

    # ✅ FK must match table name "quotes"
    quote_id = db.Column(
        db.Integer,
        db.ForeignKey("quotes.id"),
        nullable=False
    )

    product_id = db.Column(
        db.Integer,
        db.ForeignKey("products.id"),
        nullable=True
    )

    # Basic info
    tag = db.Column(db.String(100))
    vendor = db.Column(db.String(100))
    qty = db.Column(db.Integer, default=1)
    description = db.Column(db.Text)

    # Pricing inputs
    list_price = db.Column(db.Numeric(10, 2), default=0)
    multiplier = db.Column(db.Numeric(10, 4), default=1)
    markup = db.Column(db.Numeric(10, 4), default=0)

    freight = db.Column(db.Numeric(10, 2), default=0)
    startup = db.Column(db.Numeric(10, 2), default=0)
    surcharge = db.Column(db.Numeric(10, 2), default=0)

    # ✅ ONLY FFA or FOB
    terms = db.Column(db.String(20), default="FFA")

    # Calculated
    net_cost = db.Column(db.Numeric(10, 2), default=0)
    sell_price = db.Column(db.Numeric(10, 2), default=0)
    total_price = db.Column(db.Numeric(10, 2), default=0)

    notes = db.Column(db.Text)

    product = db.relationship(
        "Product",
        back_populates="line_items"
    )


# ---------------------------
# Product Model
# ---------------------------

class Product(db.Model):
    __tablename__ = "products"

    id = db.Column(db.Integer, primary_key=True)

    part_number = db.Column(db.String(100), unique=True, nullable=False)
    model = db.Column(db.String(100))
    series = db.Column(db.String(100))
    vendor = db.Column(db.String(100))

    category = db.Column(db.String(50))   # Boiler, Pump, Tank, etc
    type = db.Column(db.String(50))       # Condensing, Inline, etc

    name = db.Column(db.String(200))      # short display name
    description = db.Column(db.Text)      # full quote description

    # Pricing defaults
    list_price = db.Column(db.Numeric(10, 2), default=0)
    multiplier = db.Column(db.Numeric(10, 4), default=1)
    surcharge = db.Column(db.Numeric(10, 4), default=0)
    freight = db.Column(db.Numeric(10, 2), default=0)  # ✅ added

    notes = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    line_items = db.relationship(
        "LineItem",
        back_populates="product",
        order_by="LineItem.id"
    )