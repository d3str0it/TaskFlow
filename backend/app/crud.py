from sqlalchemy.orm import Session
from . import models, schemas

def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

def create_user(db: Session, user: schemas.UserCreate, password_hash: str):
    db_user = models.User(username=user.username, password_hash=password_hash)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_tasks(db: Session, user_id: int, completed: bool = None, skip: int = 0, limit: int = 10):
    query = db.query(models.Task).filter(models.Task.user_id == user_id)
    if completed is not None:
        query = query.filter(models.Task.completed == completed)
    return query.order_by(models.Task.created_at.desc()).offset(skip).limit(limit).all()

def count_tasks(db: Session, user_id: int, completed: bool = None):
    query = db.query(models.Task).filter(models.Task.user_id == user_id)
    if completed is not None:
        query = query.filter(models.Task.completed == completed)
    return query.count()

def create_task(db: Session, task: schemas.TaskCreate, user_id: int):
    db_task = models.Task(**task.dict(), user_id=user_id)
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

def update_task(db: Session, task_id: int, task_update: schemas.TaskUpdate, user_id: int):
    db_task = db.query(models.Task).filter(
        models.Task.id == task_id,
        models.Task.user_id == user_id
    ).first()
    if not db_task:
        return None
    
    for key, value in task_update.dict(exclude_unset=True).items():
        setattr(db_task, key, value)
    
    db.commit()
    db.refresh(db_task)
    return db_task

def delete_task(db: Session, task_id: int, user_id: int):
    db_task = db.query(models.Task).filter(
        models.Task.id == task_id,
        models.Task.user_id == user_id
    ).first()
    if not db_task:
        return False
    db.delete(db_task)
    db.commit()
    return True