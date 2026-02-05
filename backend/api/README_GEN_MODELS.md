# 数据库模型自动生成指南

本项目使用 GORM Gen 自动从数据库表生成模型代码。

## 使用方法

### 1. 快速生成（推荐）

```powershell
# 运行生成脚本
.\scripts\gen_models.ps1
```

### 2. 手动生成

```powershell
# 安装依赖
go get -u gorm.io/gen
go get -u gorm.io/gen/field

# 运行生成器
go run cmd/gen/main.go
```

## 生成配置

生成器配置文件: `cmd/gen/main.go`

### 生成所有表

```go
g.GenerateAllTable()
```

### 生成指定表

```go
g.GenerateModel("users")
g.GenerateModel("posts")
g.GenerateModel("comments")
```

### 自定义字段映射

```go
g.GenerateModel("users",
    gen.FieldType("created_at", "time.Time"),
    gen.FieldType("updated_at", "time.Time"),
    gen.FieldType("status", "int"),
    gen.FieldIgnore("deleted_at"), // 忽略某些字段
)
```

### 添加方法

```go
// 为模型添加自定义方法
g.GenerateModel("users",
    gen.FieldType("status", "int"),
    gen.FieldMethod("IsActive", func(u *User) bool {
        return u.Status == 1
    }),
)
```

## 生成文件说明

生成后会在 `internal/models/` 目录下创建：

- `users.gen.go` - User 模型定义
- `posts.gen.go` - Post 模型定义
- `query.go` - 查询方法（可直接使用）
- `xxx.gen.go` - 其他表的模型

## 使用生成的模型

### 基础查询

```go
import (
    "api/internal/models"
    "api/internal/services/database"
)

func main() {
    // 初始化查询对象
    q := models.Use(database.DB)

    // 查询用户
    user, err := q.User.Where(q.User.Username.Eq("admin")).First()

    // 创建用户
    newUser := &models.User{
        Username: "test",
        Email:    "test@example.com",
    }
    err = q.User.Create(newUser)

    // 更新用户
    _, err = q.User.Where(q.User.ID.Eq(1)).Update(q.User.Status, 1)

    // 删除用户
    _, err = q.User.Where(q.User.ID.Eq(1)).Delete()
}
```

### 在服务层使用

```go
// internal/services/user/Suser.go
func (s *Suser) CheckUsername(username string) error {
    q := models.Use(database.DB)

    // 查询用户名是否存在
    count, err := q.User.Where(q.User.Username.Eq(username)).Count()
    if err != nil {
        return fmt.Errorf("查询失败: %w", err)
    }

    if count > 0 {
        return fmt.Errorf("用户名已存在")
    }

    return nil
}
```

## 配置选项说明

| 选项                | 说明                         |
| ------------------- | ---------------------------- |
| `OutPath`           | 生成代码的输出目录           |
| `WithoutContext`    | 不生成带 context 的方法      |
| `WithDefaultQuery`  | 生成默认查询实例             |
| `FieldNullable`     | 可为 NULL 的字段生成指针类型 |
| `FieldCoverable`    | 有默认值的字段生成指针类型   |
| `FieldWithIndexTag` | 生成索引标签                 |
| `FieldWithTypeTag`  | 生成类型标签                 |

## 注意事项

1. 确保数据库配置正确（config/config.yaml）
2. 确保数据库表已创建
3. 生成后的文件建议不要手动修改（以 .gen.go 结尾）
4. 需要添加自定义方法时，创建新文件而不是修改生成的文件

## 数据库迁移

如果还没有创建表，可以手动定义模型然后使用 AutoMigrate：

```go
// 定义模型
type User struct {
    ID        uint      `gorm:"primaryKey"`
    Username  string    `gorm:"uniqueIndex;not null"`
    Email     string    `gorm:"uniqueIndex;not null"`
    Password  string    `gorm:"not null"`
    CreatedAt time.Time
    UpdatedAt time.Time
}

// 自动迁移
db.AutoMigrate(&User{})
```

然后运行生成器更新模型代码。
