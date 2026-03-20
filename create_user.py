from sqlalchemy.orm import Session
from backend.database import SessionLocal
from backend.models import User
from backend.auth import get_password_hash
import sys

def create_user(full_name: str, email: str, password: str, is_admin: bool = False):
    db: Session = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            print(f"Error: User with email {email} already exists.")
            return
        
        hashed_password = get_password_hash(password)
        new_user = User(
            full_name=full_name,
            email=email,
            hashed_password=hashed_password,
            is_admin=is_admin,
            role="admin" if is_admin else "employee"
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        print(f"Success: User {email} created successfully (Admin: {is_admin}).")
    except Exception as e:
        print(f"An error occurred: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python create_user.py <full_name> <email> <password> [is_admin: True/False]")
    else:
        full_name = sys.argv[1]
        email = sys.argv[2]
        password = sys.argv[3]
        is_admin = sys.argv[4].lower() == "true" if len(sys.argv) > 4 else False
        create_user(full_name, email, password, is_admin)
