from sqlalchemy.orm import Session
from backend.database import SessionLocal
from backend.models import User
import sys

def make_admin(email: str):
    db: Session = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"Error: User with email {email} not found.")
            return
        
        user.is_admin = True
        user.role = "admin"
        db.commit()
        print(f"Success: User {email} is now an admin.")
    except Exception as e:
        print(f"An error occurred: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python make_admin.py <email>")
    else:
        make_admin(sys.argv[1])
