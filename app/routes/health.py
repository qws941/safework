"""Health check endpoint"""

from datetime import datetime
from flask import Blueprint, jsonify

health_bp = Blueprint("health", __name__)


@health_bp.route("/health")
def health_check():
    """Health check endpoint for Docker"""
    return jsonify({
        "status": "healthy", 
        "service": "safework",
        "timestamp": datetime.utcnow().isoformat()
    }), 200
