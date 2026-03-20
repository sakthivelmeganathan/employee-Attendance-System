import sys
import os

# Put current dir on path to allow imports
sys.path.append(os.getcwd())

try:
    from backend import crud, schemas, database, models
    from sqlalchemy.orm import Session
    
    db = database.SessionLocal()
    
    # 1. Create a temporary user
    temp_email = "temp_to_delete@example.com"
    user_in = schemas.UserCreate(
        email=temp_email,
        full_name="Temporary User",
        password="password123"
    )
    
    # Check if exists first
    existing = crud.get_user_by_email(db, temp_email)
    if existing:
        crud.delete_user(db, existing.id)
        
    user = crud.create_user(db, user_in)
    print(f"Created temp user: {user.email} (ID: {user.id})")
    
    # 2. Add an attendance record
    attendance = crud.create_attendance(db, user.id, lat="10.0", lon="20.0")
    print(f"Added attendance record: ID={attendance.id}")
    
    # 3. Delete the user
    print(f"Deleting user (ID: {user.id})...")
    crud.delete_user(db, user.id)
    
    # 4. Verify user is gone
    user_check = db.query(models.User).filter(models.User.id == user.id).first()
    if user_check is None:
        print("VERIFICATION SUCCESS: User correctly removed from database.")
    else:
        print("VERIFICATION FAILURE: User still exists.")
        sys.exit(1)
        
    # 5. Verify attendance is gone (Cascading delete)
    attendance_check = db.query(models.Attendance).filter(models.Attendance.id == attendance.id).first()
    if attendance_check is None:
        print("VERIFICATION SUCCESS: Attendance record correctly removed via cascade.")
    else:
        print("VERIFICATION FAILURE: Attendance record orphan remained.")
        sys.exit(1)
        
    print("\nAll deletion logic verifications passed.")

except Exception as e:
    import traceback
    print("\nERROR DURING VERIFICATION:")
    traceback.print_exc()
    sys.exit(1)
finally:
    if 'db' in locals():
        db.close()
