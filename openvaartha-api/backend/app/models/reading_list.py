from sqlalchemy import Column, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base, GUID


class ReadingList(Base):
    __tablename__ = "reading_lists"

    user_id = Column(GUID, ForeignKey("users.id"), primary_key=True)
    article_id = Column(GUID, ForeignKey("articles.id"), primary_key=True)
    saved_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="reading_list")
    article = relationship("Article", backref="saved_by_users")
