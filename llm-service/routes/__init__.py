"""
Route handlers for LLM Service API.

Extracted from app.py to follow Single Responsibility Principle.
"""

from flask import Blueprint

# Create blueprints for each route group
chat_bp = Blueprint('chat', __name__)
document_bp = Blueprint('document', __name__)
model_bp = Blueprint('model', __name__)
ocr_bp = Blueprint('ocr', __name__)
scrum_bp = Blueprint('scrum', __name__)
monitoring_bp = Blueprint('monitoring', __name__)
rag_admin_bp = Blueprint('rag_admin', __name__)
report_bp = Blueprint('report', __name__)
db_admin_bp = Blueprint('db_admin', __name__)
wbs_bp = Blueprint('wbs', __name__)


def register_blueprints(app):
    """Register all blueprints with the Flask app."""
    from . import chat_routes
    from . import document_routes
    from . import model_routes
    from . import ocr_routes
    from . import scrum_routes
    from . import monitoring_routes
    from . import rag_admin_routes
    from . import report_routes
    from . import db_admin_routes
    from . import wbs_routes

    app.register_blueprint(chat_bp)
    app.register_blueprint(document_bp)
    app.register_blueprint(model_bp)
    app.register_blueprint(ocr_bp)
    app.register_blueprint(scrum_bp)
    app.register_blueprint(monitoring_bp)
    app.register_blueprint(rag_admin_bp)
    app.register_blueprint(report_bp)
    app.register_blueprint(db_admin_bp)
    app.register_blueprint(wbs_bp)
