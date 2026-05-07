from sqlmodel import Field, SQLModel

class UserSetting(SQLModel, table=True):
    __tablename__ = "settings_users"
    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(unique=True, index=True)
    active: bool = Field(default=True)

class SourceSetting(SQLModel, table=True):
    __tablename__ = "settings_sources"
    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(unique=True, index=True)
    type: str = Field(description="'price' | 'factor' | 'both'")
    active: bool = Field(default=True)
