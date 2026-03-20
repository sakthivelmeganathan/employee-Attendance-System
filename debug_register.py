import sys
import os

# Put current dir on path to allow imports
sys.path.append(os.getcwd())

try:
    from backend import crud, schemas, database, models
    from sqlalchemy.orm import Session
    
    # Simulate DB session
    db = database.SessionLocal()
    
    # Create test user schema
    user_in = schemas.UserCreate(
        email="debugging_test@example.com",
        full_name="Debug User",
        password="password123"
    )
    
    print("Attempting to create user...")
    db_user = crud.create_user(db, user_in)
    print(f"Successfully created user: {db_user.email}")
    
except Exception as e:
    import traceback
    print("\nERROR DETECTED:\n")
    traceback.print_exc()
    sys.exit(1)
finally:
    if 'db' in locals():
        db.close()
