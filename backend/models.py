from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class Shift(Base):
    __tablename__ = "shifts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)  # e.g., "Morning", "Night"
    start_time = Column(String)  # "09:00"
    end_time = Column(String)    # "17:00"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_admin = Column(Boolean, default=False)
    role = Column(String, default="employee") # employee, manager, admin
    shift_id = Column(Integer, ForeignKey("shifts.id"), nullable=True)

    attendance = relationship("Attendance", back_populates="owner", cascade="all, delete-orphan")
    leaves = relationship("LeaveRequest", back_populates="owner", cascade="all, delete-orphan")

class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    check_in = Column(DateTime, default=datetime.utcnow)
    check_out = Column(DateTime, nullable=True)
    lat = Column(String, nullable=True)
    lon = Column(String, nullable=True)

    owner = relationship("User", back_populates="attendance")

class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    leave_type = Column(String)  # "Vacation", "Sick", "Personal"
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    status = Column(String, default="pending")  # "pending", "approved", "rejected"
    reason = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="leaves")
