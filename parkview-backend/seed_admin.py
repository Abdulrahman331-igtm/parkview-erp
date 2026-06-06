from app.db.base import SessionLocal
from app.models.user import User
from passlib.context import CryptContext

# Set up the password hasher
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_first_director():
    # Open a connection to PostgreSQL
    db = SessionLocal()
    
    try:
        # Check if the user already exists so we don't duplicate
        existing_user = db.query(User).filter(User.username == "director_jm").first()
        if existing_user:
            print("Director already exists in the database!")
            return

        # Hash the password
        hashed_pw = pwd_context.hash("password123")

        # Create the user object
        new_director = User(
            username="director_jm",
            password_hash=hashed_pw,
            role="Director"
        )

        # Save to database
        db.add(new_director)
        db.commit()
        
        print("Success! Director account created securely.")
        
    except Exception as e:
        print(f"An error occurred: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_first_director()