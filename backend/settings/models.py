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


class UserSettingCreate(SQLModel):
    name: str
    active: bool = True


class UserSettingUpdate(SQLModel):
    name: str | None = None
    active: bool | None = None


class UserSettingRead(SQLModel):
    id: int
    name: str
    active: bool


class SourceSettingCreate(SQLModel):
    name: str
    type: str
    active: bool = True


class SourceSettingUpdate(SQLModel):
    name: str | None = None
    type: str | None = None
    active: bool | None = None


class SourceSettingRead(SQLModel):
    id: int
    name: str
    type: str
    active: bool
