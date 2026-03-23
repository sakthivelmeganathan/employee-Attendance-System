from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import List, Optional

class ShiftBase(BaseModel):
    name: str
    start_time: str
    end_time: str

class ShiftCreate(ShiftBase):
    pass

class Shift(ShiftBase):
    id: int

    class Config:
        from_attributes = True

class AttendanceBase(BaseModel):
    check_in: datetime
    check_out: Optional[datetime] = None
    lat: Optional[str] = None
    lon: Optional[str] = None
    is_out_of_range: bool = False
    is_late: bool = False

class AttendanceCreate(BaseModel):
    lat: Optional[str] = None
    lon: Optional[str] = None

class AttendanceAdminMark(BaseModel):
    user_id: int
    is_checkin: bool
    lat: Optional[str] = None
    lon: Optional[str] = None

class Attendance(AttendanceBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True

class LeaveRequestBase(BaseModel):
    leave_type: str
    start_date: datetime
    end_date: datetime
    reason: Optional[str] = None

class LeaveRequestCreate(LeaveRequestBase):
    pass

class LeaveRequestStatusUpdate(BaseModel):
    status: str # "approved" or "rejected"

class LeaveRequest(LeaveRequestBase):
    id: int
    user_id: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class UserBase(BaseModel):
    email: EmailStr
    full_name: str

class UserCreate(UserBase):
    password: str
    shift_id: Optional[int] = None

class User(UserBase):
    id: int
    is_admin: bool
    attendance: List[Attendance] = []

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
