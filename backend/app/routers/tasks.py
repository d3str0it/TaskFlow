from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional

from ..database import SessionLocal
from .. import crud, schemas, auth

router = APIRouter(prefix="/api/tasks", tags=["tasks"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/", response_model=schemas.TaskResponse)
def create_task(
    task: schemas.TaskCreate,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    return crud.create_task(db, task, current_user.id)

@router.get("/")
def get_tasks(
    completed: Optional[bool] = Query(None),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    tasks = crud.get_tasks(db, current_user.id, completed, offset, limit)
    total = crud.count_tasks(db, current_user.id, completed)
    return {
        "tasks": tasks,
        "total": total,
        "limit": limit,
        "offset": offset
    }

@router.put("/{task_id}", response_model=schemas.TaskResponse)
def update_task(
    task_id: int,
    task_update: schemas.TaskUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    updated = crud.update_task(db, task_id, task_update, current_user.id)
    if not updated:
        raise HTTPException(status_code=404, detail="Task not found")
    return updated

@router.delete("/{task_id}")
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    deleted = crud.delete_task(db, task_id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task deleted"}