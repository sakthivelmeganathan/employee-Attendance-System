import os
import sys
from datetime import datetime, timedelta
import random
from sqlalchemy.orm import Session
from .database import SessionLocal, engine, Base
from . import models, auth

# Ensure we are in the right directory to find the db
DB_PATH = "attendance_v2.db"

def seed_db():
    print("Resetting database...")
    # Drop all tables and recreate them
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # 1. Create Shifts
        print("Seeding shifts...")
        shifts = [
            models.Shift(name="Morning Shift", start_time="09:00", end_time="17:00"),
            models.Shift(name="Day Shift", start_time="11:00", end_time="19:00"),
            models.Shift(name="Night Shift", start_time="22:00", end_time="06:00"),
        ]
        db.add_all(shifts)
        db.commit()
        for s in shifts: db.refresh(s)

        # 2. Create Users
        print("Seeding users...")
        users_data = [
            {"full_name": "System Admin", "email": "admin@tracker.com", "password": "admin123", "is_admin": True, "role": "admin", "shift_id": None},
            {"full_name": "Arjun Sharma", "email": "arjun@tracker.com", "password": "password123", "is_admin": False, "role": "employee", "shift_id": shifts[0].id},
            {"full_name": "Priya Patel", "email": "priya@tracker.com", "password": "password123", "is_admin": False, "role": "employee", "shift_id": shifts[0].id},
            {"full_name": "Rahul Verma", "email": "rahul@tracker.com", "password": "password123", "is_admin": False, "role": "employee", "shift_id": shifts[1].id},
            {"full_name": "Sanya Iyer", "email": "sanya@tracker.com", "password": "password123", "is_admin": False, "role": "employee", "shift_id": shifts[2].id},
            {"full_name": "Vikram Singh", "email": "vikram@tracker.com", "password": "password123", "is_admin": False, "role": "employee", "shift_id": shifts[1].id},
        ]

        db_users = []
        for u in users_data:
            hashed_pwd = auth.get_password_hash(u["password"])
            db_user = models.User(
                full_name=u["full_name"],
                email=u["email"],
                hashed_password=hashed_pwd,
                is_admin=u["is_admin"],
                role=u["role"],
                shift_id=u["shift_id"]
            )
            db.add(db_user)
            db_users.append(db_user)
        db.commit()
        for u in db_users: db.refresh(u)

        # 3. Create Attendance History (Last 30 days)
        print("Seeding attendance logs...")
        now = datetime.utcnow()
        for user in db_users:
            if user.is_admin: continue # Admin doesn't need logs for this demo
            
            for i in range(30):
                # 80% attendance rate
                if random.random() > 0.8: continue
                
                day = now - timedelta(days=i)
                # Skip weekends
                if day.weekday() >= 5: continue
                
                # Randomized check-in around 08:45 - 09:30
                check_in_time = day.replace(hour=8, minute=45, second=0) + timedelta(minutes=random.randint(0, 50))
                # Randomized check-out around 17:00 - 18:00
                check_out_time = day.replace(hour=17, minute=0, second=0) + timedelta(minutes=random.randint(0, 60))
                
                attendance = models.Attendance(
                    user_id=user.id,
                    check_in=check_in_time,
                    check_out=check_out_time,
                    lat="12.9716",
                    lon="77.5946"
                )
                db.add(attendance)

        # 4. Create Leaves
        print("Seeding leave requests...")
        leave_types = ["Sick Leave", "Casual Leave", "Vacation", "Emergency"]
        statuses = ["approved", "pending", "rejected"]
        
        for user in db_users:
            if user.is_admin: continue
            
            # Sample approved leave
            db.add(models.LeaveRequest(
                user_id=user.id,
                leave_type=random.choice(leave_types),
                start_date=now - timedelta(days=40),
                end_date=now - timedelta(days=38),
                status="approved",
                reason="Family function in hometown.",
                created_at=now - timedelta(days=45)
            ))
            
            # Sample pending leave
            db.add(models.LeaveRequest(
                user_id=user.id,
                leave_type=random.choice(leave_types),
                start_date=now + timedelta(days=10),
                end_date=now + timedelta(days=12),
                status="pending",
                reason="Doctor appointment for health checkup.",
                created_at=now - timedelta(days=1)
            ))

        db.commit()
        print("Database reset and seeded successfully!")
        print("\nCredentials:")
        print("Admin: admin@tracker.com / admin123")
        print("Employee: arjun@tracker.com / password123")

    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
