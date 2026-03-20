from sqlalchemy.orm import Session
from . import models, schemas
from .auth import get_password_hash
from datetime import datetime, timedelta
import pytz

def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = get_password_hash(user.password)
    # Check if this is the first user, and if so, make them an admin
    user_count = db.query(models.User).count()
    is_admin = True if user_count == 0 else False
    
    db_user = models.User(
        email=user.email, 
        full_name=user.full_name, 
        hashed_password=hashed_password,
        is_admin=is_admin
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_all_users(db: Session):
    return db.query(models.User).all()

def delete_user(db: Session, user_id: int):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if db_user:
        db.delete(db_user)
        db.commit()
    return db_user

def update_user_role(db: Session, user_id: int, is_admin: bool):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if db_user:
        db_user.is_admin = is_admin
        db_user.role = "admin" if is_admin else "employee"
        db.commit()
        db.refresh(db_user)
    return db_user

def create_attendance(db: Session, user_id: int, lat: str = None, lon: str = None):
    ist = pytz.timezone('Asia/Kolkata')
    current_time = datetime.now(ist).replace(tzinfo=None)  # Convert to naive datetime for SQLite
    db_attendance = models.Attendance(user_id=user_id, check_in=current_time, lat=lat, lon=lon)
    db.add(db_attendance)
    db.commit()
    db.refresh(db_attendance)
    return db_attendance

def create_leave_request(db: Session, user_id: int, leave: schemas.LeaveRequestCreate):
    db_leave = models.LeaveRequest(
        user_id=user_id,
        leave_type=leave.leave_type,
        start_date=leave.start_date,
        end_date=leave.end_date,
        reason=leave.reason
    )
    db.add(db_leave)
    db.commit()
    db.refresh(db_leave)
    return db_leave

def get_leave_requests(db: Session, user_id: int):
    return db.query(models.LeaveRequest).filter(models.LeaveRequest.user_id == user_id).all()

def update_leave_status(db: Session, leave_id: int, status: str):
    db_leave = db.query(models.LeaveRequest).filter(models.LeaveRequest.id == leave_id).first()
    if db_leave:
        db_leave.status = status
        db.commit()
        db.refresh(db_leave)
    return db_leave

def update_attendance_checkout(db: Session, attendance_id: int):
    db_attendance = db.query(models.Attendance).filter(models.Attendance.id == attendance_id).first()
    if db_attendance:
        ist = pytz.timezone('Asia/Kolkata')
        current_time = datetime.now(ist).replace(tzinfo=None)  # Convert to naive datetime for SQLite
        db_attendance.check_out = current_time
        db.commit()
        db.refresh(db_attendance)
    return db_attendance

def get_attendance_history(db: Session, user_id: int):
    return db.query(models.Attendance).filter(models.Attendance.user_id == user_id).order_by(models.Attendance.check_in.desc()).all()

def get_all_attendance(db: Session):
    return db.query(models.Attendance).order_by(models.Attendance.check_in.desc()).all()

def get_all_leave_requests(db: Session):
    return db.query(models.LeaveRequest).order_by(models.LeaveRequest.created_at.desc()).all()

def calculate_punctuality_score(db: Session, user_id: int):
    # Logic to calculate score based on lateness
    history = db.query(models.Attendance).filter(models.Attendance.user_id == user_id).all()
    if not history:
        return 100
    
    total_lateness = 0
    # Simple logic: for each check-in > 09:00, subtract points
    for record in history:
        check_in_time = record.check_in.time()
        if check_in_time.hour > 9 or (check_in_time.hour == 9 and check_in_time.minute > 5):
            total_lateness += 1
            
    score = max(0, 100 - (total_lateness * 5))
    return score

def get_attendance_trend(db: Session):
    # Get last 7 days check-in counts
    now = datetime.utcnow()
    trend = []
    for i in range(6, -1, -1):
        day = (now - timedelta(days=i)).date()
        count = db.query(models.Attendance).filter(
            models.Attendance.check_in >= datetime.combine(day, datetime.min.time()),
            models.Attendance.check_in <= datetime.combine(day, datetime.max.time())
        ).count()
        trend.append({"name": day.strftime("%a"), "count": count})
    return trend
