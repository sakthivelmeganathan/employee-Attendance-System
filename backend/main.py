from fastapi import FastAPI, Depends, HTTPException, status
from datetime import datetime
from typing import List, Optional
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from . import models, schemas, crud, auth, database
from .database import engine

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Employee Attendance Tracker")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/register", response_model=schemas.User)
def register_user(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    return crud.create_user(db=db, user=user)

@app.post("/token", response_model=schemas.Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    user = crud.get_user_by_email(db, email=form_data.username)
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = auth.create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me", response_model=schemas.User)
async def read_users_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

@app.post("/attendance/check-in")
async def check_in(location: Optional[schemas.AttendanceCreate] = None, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    # Create a default location if none provided
    if not location:
        location = schemas.AttendanceCreate(lat="Unknown", lon="Unknown")
    
    # Check if user already has an active session
    active = db.query(models.Attendance).filter(
        models.Attendance.user_id == current_user.id,
        models.Attendance.check_out == None
    ).first()
    if active:
        raise HTTPException(status_code=400, detail="User is already checked in")
    return crud.create_attendance(db=db, user_id=current_user.id, lat=location.lat, lon=location.lon)

@app.post("/leaves/request", response_model=schemas.LeaveRequest)
async def request_leave(leave: schemas.LeaveRequestCreate, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    return crud.create_leave_request(db=db, user_id=current_user.id, leave=leave)

@app.get("/leaves/history", response_model=list[schemas.LeaveRequest])
async def get_leave_history(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    return crud.get_leave_requests(db=db, user_id=current_user.id)

@app.post("/attendance/check-out")
async def check_out_current(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    active = db.query(models.Attendance).filter(
        models.Attendance.user_id == current_user.id,
        models.Attendance.check_out == None
    ).first()
    if not active:
        raise HTTPException(status_code=404, detail="No active attendance session found")
    return crud.update_attendance_checkout(db=db, attendance_id=active.id)

@app.post("/attendance/check-out/{attendance_id}")
async def check_out(attendance_id: int, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    db_attendance = crud.update_attendance_checkout(db=db, attendance_id=attendance_id)
    if not db_attendance:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    return db_attendance

@app.get("/attendance/history", response_model=list[schemas.Attendance])
async def get_history(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    return crud.get_attendance_history(db=db, user_id=current_user.id)

@app.get("/attendance/my", response_model=list[schemas.Attendance])
async def get_my_attendance(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    return crud.get_attendance_history(db=db, user_id=current_user.id)

@app.get("/admin/attendance")
async def get_admin_attendance(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    attendance = crud.get_all_attendance(db)
    # Include user info in response
    return [
        {
            "id": a.id,
            "user_id": a.user_id,
            "user_name": a.owner.full_name,
            "check_in": a.check_in,
            "check_out": a.check_out,
            "lat": a.lat,
            "lon": a.lon
        } for a in attendance
    ]

@app.get("/admin/users")
async def get_admin_users(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    return crud.get_all_users(db)

@app.get("/admin/stats")
async def get_admin_stats(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    users = crud.get_all_users(db)
    attendance = crud.get_all_attendance(db)
    leaves = crud.get_all_leave_requests(db)
    
    # Simple stats
    # Count unique users who have an active (not checked out) session
    active_now_user_ids = {a.user_id for a in attendance if not a.check_out}
    pending_leaves = [l for l in leaves if l.status == "pending"]
    
    return {
        "total_employees": len([u for u in users if not u.is_admin]), # Or all users depending on definition
        "active_now": len(active_now_user_ids),
        "pending_leaves": len(pending_leaves),
        "total_attendance_records": len(attendance)
    }

@app.post("/admin/attendance/mark")
async def mark_attendance_admin(mark: schemas.AttendanceAdminMark, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if mark.is_checkin:
        # Check if already checked in
        active = db.query(models.Attendance).filter(models.Attendance.user_id == mark.user_id, models.Attendance.check_out == None).first()
        if active:
            raise HTTPException(status_code=400, detail="User is already checked in")
        return crud.create_attendance(db=db, user_id=mark.user_id, lat=mark.lat, lon=mark.lon)
    else:
        active = db.query(models.Attendance).filter(models.Attendance.user_id == mark.user_id, models.Attendance.check_out == None).first()
        if not active:
            raise HTTPException(status_code=400, detail="No active attendance session found for this user")
        return crud.update_attendance_checkout(db=db, attendance_id=active.id)

@app.get("/admin/analytics/trend")
async def get_admin_trend(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    return crud.get_attendance_trend(db)

@app.get("/admin/leaves")
async def get_admin_leaves(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    leaves = crud.get_all_leave_requests(db)
    return [
        {
            "id": l.id,
            "user_id": l.user_id,
            "user_name": l.owner.full_name,
            "leave_type": l.leave_type,
            "start_date": l.start_date,
            "end_date": l.end_date,
            "status": l.status,
            "reason": l.reason,
            "created_at": l.created_at
        } for l in leaves
    ]

@app.post("/admin/leaves/{leave_id}/status")
async def update_leave_status_admin(leave_id: int, status_update: schemas.LeaveRequestStatusUpdate, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    db_leave = crud.update_leave_status(db, leave_id, status_update.status)
    if not db_leave:
        raise HTTPException(status_code=404, detail="Leave request not found")
    return db_leave

@app.delete("/admin/users/{user_id}")
async def delete_user_admin(user_id: int, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    db_user = crud.delete_user(db, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted successfully"}

@app.patch("/admin/users/{user_id}/role")
async def toggle_user_role(user_id: int, is_admin: bool, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    db_user = crud.update_user_role(db, user_id, is_admin)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user

@app.patch("/admin/users/{user_id}/shift")
async def update_user_shift(user_id: int, shift_id: Optional[int] = None, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    db_user = crud.update_user_shift(db, user_id, shift_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user

@app.get("/analytics/stats")
async def get_stats(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    score = crud.calculate_punctuality_score(db, current_user.id)
    return {
        "punctuality_score": score,
        "total_days": len(crud.get_attendance_history(db, current_user.id)),
        "trend": "0%"
    }

@app.get("/users/me/stats")
async def get_user_stats(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    history = crud.get_attendance_history(db, current_user.id)
    punctuality = crud.calculate_punctuality_score(db, current_user.id)
    
    # Check if currently checked in
    active = db.query(models.Attendance).filter(
        models.Attendance.user_id == current_user.id,
        models.Attendance.check_out == None
    ).first()
    
    # Calculate total hours (very basic)
    total_hours = 0
    for record in history:
        if record.check_in and record.check_out:
            duration = record.check_out - record.check_in
            total_hours += duration.total_seconds() / 3600

    return {
        "total_hours": round(total_hours, 1),
        "punctuality": punctuality,
        "active_streak": 0,
        "status": "online" if active else "offline"
    }

@app.get("/shifts", response_model=List[schemas.Shift])
async def get_shifts(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    return db.query(models.Shift).all()

@app.post("/shifts", response_model=schemas.Shift)
async def create_shift(shift: schemas.ShiftCreate, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    db_shift = models.Shift(name=shift.name, start_time=shift.start_time, end_time=shift.end_time)
    db.add(db_shift)
    db.commit()
    db.refresh(db_shift)
    return db_shift

@app.delete("/shifts/{shift_id}")
async def delete_shift(shift_id: int, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    db_shift = db.query(models.Shift).filter(models.Shift.id == shift_id).first()
    if not db_shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    db.delete(db_shift)
    db.commit()
    return {"message": "Shift deleted successfully"}
