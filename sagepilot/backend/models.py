from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.sql import func
from sagepilot.backend.database import Base
import json

class SavedWorkflow(Base):
    """Model for saved workflows"""
    __tablename__ = "saved_workflows"
    
    id = Column(Integer, primary_key=True, index=True)
    webhook_id = Column(String(36), unique=True, nullable=False, index=True)
    name = Column(String(255), unique=True, nullable=False, index=True)
    workflow_data = Column(Text, nullable=False)  # JSON stored as text
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
    
    def to_dict(self):
        """Convert to dictionary for API response"""
        return {
            "id": self.id,
            "webhook_id": self.webhook_id,
            "name": self.name,
            "workflow_data": json.loads(self.workflow_data) if self.workflow_data else {},
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
