#this it the central "Base" class that all models e.g Unit, User, Reading inherit from,
#It links my python classes to SQLAlchemy's database magic

from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()