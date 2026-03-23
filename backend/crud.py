from sqlalchemy.orm import Session
from . import models, schemas
from .auth import get_password_hash
from datetime import datetime, timedelta
import pytz
import math

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
        is_admin=is_admin,
        shift_id=user.shift_id
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

def update_user_shift(db: Session, user_id: int, shift_id: int = None):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if db_user:
        db_user.shift_id = shift_id
        db.commit()
        db.refresh(db_user)
    return db_user


# Geofencing Constants (Office Location)
OFFICE_LAT = 12.9716  # Example: Bangalore
OFFICE_LON = 77.5946
ALLOWED_RADIUS_METERS = 200  # 200 meters

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance in meters between two points using Haversine formula."""
    R = 6371000  # Earth radius in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def create_attendance(db: Session, user_id: int, lat: str = None, lon: str = None):
    ist = pytz.timezone('Asia/Kolkata')
    current_time = datetime.now(ist).replace(tzinfo=None)  # Convert to naive datetime for SQLite
    
    # Geofencing check
    out_of_range = False
    if lat and lon and lat != "Unknown" and lon != "Unknown":
        try:
            distance = calculate_distance(float(lat), float(lon), OFFICE_LAT, OFFICE_LON)
            if distance > ALLOWED_RADIUS_METERS:
                out_of_range = True
        except (ValueError, TypeError):
            pass

    # Late check-in check
    is_late = False
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user and user.shift_id:
        shift = db.query(models.Shift).filter(models.Shift.id == user.shift_id).first()
        if shift and shift.start_time:
            try:
                h, m = map(int, shift.start_time.split(':'))
                # Allow 5 mins grace period
                if current_time.hour > h or (current_time.hour == h and current_time.minute > m + 5):
                    is_late = True
            except ValueError:
                pass

    db_attendance = models.Attendance(
        user_id=user_id, 
        check_in=current_time, 
        lat=lat, 
        lon=lon,
        is_out_of_range=out_of_range,
        is_late=is_late
    )
    db.add(db_attendance)
    db.commit()
    db_attendance.is_out_of_range = out_of_range
    db_attendance.is_late = is_late
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
    user = get_user(db, user_id)
    history = db.query(models.Attendance).filter(models.Attendance.user_id == user_id).all()
    if not history:
        return 100
    
    # Default shift start if none assigned
    default_start_hour = 9
    default_start_minute = 5
    
    if user.shift_id:
        shift = db.query(models.Shift).filter(models.Shift.id == user.shift_id).first()
        if shift and shift.start_time:
            try:
                h, m = map(int, shift.start_time.split(':'))
                default_start_hour = h
                default_start_minute = m
            except ValueError:
                pass

    total_lateness = 0
    # for each check-in > shift start, subtract points
    for record in history:
        check_in_time = record.check_in.time()
        if check_in_time.hour > default_start_hour or (check_in_time.hour == default_start_hour and check_in_time.minute > default_start_minute):
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
