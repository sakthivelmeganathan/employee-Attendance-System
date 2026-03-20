from .database import engine, Base
from . import models
import os

def wipe_db():
    print("Wiping all data and resetting schema...")
    # Drop all tables
    Base.metadata.drop_all(bind=engine)
    # Recreate all tables (empty)
    Base.metadata.create_all(bind=engine)
    print("Database is now clean and empty.")
    print("Note: The first user to register will automatically become the System Administrator.")

if __name__ == "__main__":
    wipe_db()
