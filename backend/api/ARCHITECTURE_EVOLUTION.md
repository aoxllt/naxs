# NAXS 架构演进指南：从单体到微服务

> 本文档详细展示如何从单体架构演变到微服务架构，包括设计思路、代码示例和迁移步骤

---

## 📋 目录

1. [单体架构](#单体架构阶段)
2. [微服务架构](#微服务架构阶段)
3. [迁移路径](#迁移路径)
4. [具体实现](#具体实现)

---

## 第一阶段：单体架构

### 🎯 阶段目标

- 快速开发和迭代
- 完整的功能实现
- 为微服务预留接口

### 📁 项目结构

```
api/
├── cmd/
│   ├── gateway/
│   │   └── main.go              # ⭐ 唯一的服务入口
│   └── gen/
│       └── main.go
│
├── internal/
│   ├── shared/                  # 共享包（所有域使用）
│   │   ├── middleware/
│   │   │   ├── auth.go
│   │   │   ├── log.go
│   │   │   └── trace.go
│   │   ├── common/
│   │   │   ├── response.go
│   │   │   ├── error.go
│   │   │   └── constants.go
│   │   ├── config/
│   │   │   └── config.go
│   │   └── utils/
│   │       ├── jwt.go
│   │       ├── validator.go
│   │       └── ...
│   │
│   ├── services/                # 各业务域（一个进程内）
│   │   ├── user/
│   │   │   ├── model/
│   │   │   │   └── user.go
│   │   │   ├── repo/
│   │   │   │   ├── interface.go
│   │   │   │   └── impl.go
│   │   │   ├── service/
│   │   │   │   ├── interface.go  # ⭐ 定义业务接口
│   │   │   │   └── impl.go
│   │   │   ├── handler/
│   │   │   │   ├── login.go
│   │   │   │   ├── register.go
│   │   │   │   └── profile.go
│   │   │   └── router.go
│   │   │
│   │   ├── order/
│   │   │   ├── model/
│   │   │   ├── repo/
│   │   │   ├── service/
│   │   │   ├── handler/
│   │   │   └── router.go
│   │   │
│   │   └── ...
│   │
│   └── gateway/                 # 网关层（路由汇总）
│       ├── handler/
│       │   ├── user/
│       │   ├── order/
│       │   └── ...
│       ├── router.go            # ⭐ 统一路由注册
│       └── middleware.go
│
├── pkg/
│   └── utils/
│       ├── jwt.go
│       └── ...
│
├── config/
│   ├── config.yaml              # ⭐ 单体配置文件
│   └── config.go
│
└── ...
```

### 🔄 请求流程（单体）

```
HTTP Request
    ↓
Router (统一路由)
    ↓
Middleware (认证、日志)
    ↓
Gateway Handler (请求分发)
    ↓
Service Handler (业务处理)
    ↓
Service Interface (业务逻辑)
    ↓
Repository Interface (数据访问)
    ↓
PostgreSQL
```

### 📝 代码示例

#### 1. 定义 Service 接口

```go
// internal/services/user/service/interface.go
package service

import "context"

type UserService interface {
    Login(ctx context.Context, username, password string) (*model.User, error)
    Register(ctx context.Context, username, password string) (*model.User, error)
    GetUser(ctx context.Context, id uint) (*model.User, error)
}
```

#### 2. 实现 Service

```go
// internal/services/user/service/impl.go
type userServiceImpl struct {
    repo UserRepository
}

func (s *userServiceImpl) Login(ctx context.Context, username, password string) (*model.User, error) {
    user, err := s.repo.GetByUsername(ctx, username)
    if err != nil {
        return nil, err
    }

    if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password)); err != nil {
        return nil, errors.New("invalid password")
    }

    return user, nil
}
```

#### 3. Repository 接口

```go
// internal/services/user/repo/interface.go
type UserRepository interface {
    GetByUsername(ctx context.Context, username string) (*model.User, error)
    GetByID(ctx context.Context, id uint) (*model.User, error)
    Create(ctx context.Context, user *model.User) error
    Update(ctx context.Context, user *model.User) error
}
```

#### 4. Handler 处理请求

```go
// internal/services/user/handler/login.go
package handler

type LoginHandler struct {
    userService service.UserService
}

func (h *LoginHandler) Login(c *gin.Context) {
    var req LoginRequest
    c.ShouldBindJSON(&req)

    // ⭐ 调用 service（内部函数调用）
    user, err := h.userService.Login(c.Request.Context(), req.Username, req.Password)
    if err != nil {
        common.Error(401, err.Error()).Response(c, 401)
        return
    }

    common.OkWithData(user).Response(c, 200)
}
```

#### 5. 统一路由注册

```go
// internal/gateway/router.go
func SetupRoutes(engine *gin.Engine) {
    apiV1 := engine.Group("/api/v1")

    // 注册用户服务的路由
    userRouter := user.NewRouter(userService)
    userRouter.Register(apiV1)

    // 注册订单服务的路由
    orderRouter := order.NewRouter(orderService)
    orderRouter.Register(apiV1)
}
```

#### 6. 服务路由注册

```go
// internal/services/user/router.go
type Router struct {
    service service.UserService
}

func (r *Router) Register(group *gin.RouterGroup) {
    auth := group.Group("/auth")
    {
        auth.POST("/login", r.handleLogin)
        auth.POST("/register", r.handleRegister)
    }

    users := group.Group("/users")
    users.Use(middleware.AuthMiddleware())
    {
        users.GET("/me", r.handleGetProfile)
    }
}

func (r *Router) handleLogin(c *gin.Context) {
    handler := handler.LoginHandler{userService: r.service}
    handler.Login(c)
}
```

### 📊 单体架构的优点

✅ 开发简单快速
✅ 调试容易，直接函数调用
✅ 部署简单，一个二进制文件
✅ 性能好，无网络开销
✅ 事务支持好，ACID 保证

### 💔 单体架构的痛点（6-12个月后）

❌ 代码库过大（>100KB 代码）
❌ 启动变慢
❌ 部署风险高（改一个功能需要重新部署整个系统）
❌ 难以独立扩展（用户服务需要扩展，订单服务不需要，但整体扩展）
❌ 技术栈固定（全部用 Go，无法选择最佳工具）
❌ 团队协作困难（多个团队改同一个代码库，容易冲突）

---

## 第二阶段：微服务架构

### 🎯 阶段目标

- 独立部署和扩展
- 技术栈灵活选择
- 团队独立开发
- 高可用和容错

### 📁 项目结构

```
api/
├── cmd/                         # 多个服务入口
│   ├── gateway/
│   │   └── main.go             # API 网关（轻量级转发）
│   ├── user-service/
│   │   └── main.go             # ⭐ 用户服务（独立进程）
│   ├── order-service/
│   │   └── main.go             # ⭐ 订单服务（独立进程）
│   └── product-service/
│       └── main.go             # ⭐ 产品服务（独立进程）
│
├── internal/
│   ├── shared/                  # 共享代码（各服务通用）
│   │   ├── middleware/
│   │   ├── common/
│   │   ├── config/
│   │   └── utils/
│   │
│   ├── gateway/                 # 网关内部逻辑
│   │   ├── handler/
│   │   │   ├── user/           # 代理到 user-service
│   │   │   ├── order/          # 代理到 order-service
│   │   │   └── ...
│   │   ├── client/             # gRPC/HTTP 客户端
│   │   │   ├── user_client.go
│   │   │   └── order_client.go
│   │   ├── router.go
│   │   └── middleware.go
│   │
│   └── services/                # 各服务的业务逻辑
│       ├── user/                # 用户服务（可独立部署）
│       │   ├── model/
│       │   ├── repo/
│       │   ├── service/
│       │   ├── handler/
│       │   ├── rpc/             # ⭐ gRPC 处理器
│       │   └── router.go
│       │
│       ├── order/               # 订单服务（可独立部署）
│       │   ├── model/
│       │   ├── repo/
│       │   ├── service/
│       │   ├── handler/
│       │   ├── rpc/             # ⭐ gRPC 处理器
│       │   └── router.go
│       │
│       └── ...
│
├── pkg/
│   ├── proto/                   # ⭐ Protocol Buffers 定义
│   │   ├── user/
│   │   │   ├── user.proto
│   │   │   └── user_grpc.pb.go
│   │   ├── order/
│   │   │   ├── order.proto
│   │   │   └── order_grpc.pb.go
│   │   └── ...
│   │
│   └── client/                  # ⭐ 服务客户端（跨服务调用）
│       ├── user_client.go
│       ├── order_client.go
│       └── ...
│
├── config/
│   ├── config.gateway.yaml
│   ├── config.user-service.yaml
│   ├── config.order-service.yaml
│   └── config.go
│
├── deploy/
│   ├── docker/
│   │   ├── Dockerfile.gateway
│   │   ├── Dockerfile.user-service
│   │   └── ...
│   ├── k8s/
│   │   ├── gateway-deployment.yaml
│   │   ├── user-service-deployment.yaml
│   │   └── ...
│   └── docker-compose.yml       # 本地开发
│
└── ...
```

### 🏗️ 微服务架构图

```
                   Client
                     ↓
        ┌────────────────────────┐
        │     API Gateway        │ (转发、认证、限流)
        └────────────┬───────────┘
                     │
    ┌────────────────┼────────────────┐
    ↓                ↓                 ↓
┌─────────────┐ ┌─────────────┐ ┌──────────────┐
│ User        │ │ Order       │ │ Product      │
│ Service     │ │ Service     │ │ Service      │
│ :50051      │ │ :50052      │ │ :50053       │
│ (gRPC)      │ │ (gRPC)      │ │ (gRPC)       │
└────┬────────┘ └────┬────────┘ └───┬──────────┘
     ↓               ↓                ↓
  user_db       order_db         product_db
  (独立)        (独立)            (独立)
```

### 🔄 请求流程（微服务）

```
HTTP Request (来自客户端)
    ↓
API Gateway
    ├─ 认证 (JWT)
    ├─ 限流
    ├─ 路由转发
    ↓
User Service gRPC
    ↓
User Service Handler
    ↓
User Service Logic
    ↓
User Database
    ↓
Response
```

### 📝 代码示例

#### 1. Protocol Buffers 定义

```protobuf
// pkg/proto/user/user.proto
syntax = "proto3";

package user;

service UserService {
  rpc Login(LoginRequest) returns (LoginResponse);
  rpc GetUser(GetUserRequest) returns (User);
}

message LoginRequest {
  string username = 1;
  string password = 2;
}

message LoginResponse {
  User user = 1;
  string token = 2;
  string error = 3;
}

message User {
  uint32 id = 1;
  string username = 2;
  string nickname = 3;
  string role = 4;
}

message GetUserRequest {
  uint32 id = 1;
}
```

#### 2. gRPC Server 实现

```go
// internal/services/user/rpc/impl.go
package rpc

import (
    "context"
    pb "api/pkg/proto/user"
)

type UserRPCServer struct {
    pb.UnimplementedUserServiceServer
    service service.UserService
}

func (s *UserRPCServer) Login(ctx context.Context, req *pb.LoginRequest) (*pb.LoginResponse, error) {
    // 调用内部 service
    user, err := s.service.Login(ctx, req.Username, req.Password)
    if err != nil {
        return &pb.LoginResponse{Error: err.Error()}, nil
    }

    // 生成 token
    token, _ := utils.GenerateToken(user.ID, user.Username, user.Role)

    return &pb.LoginResponse{
        User: &pb.User{
            Id:       uint32(user.ID),
            Username: user.Username,
            Nickname: user.Nickname,
            Role:     user.Role,
        },
        Token: token,
    }, nil
}

func (s *UserRPCServer) GetUser(ctx context.Context, req *pb.GetUserRequest) (*pb.User, error) {
    user, err := s.service.GetUser(ctx, uint(req.Id))
    if err != nil {
        return nil, err
    }

    return &pb.User{
        Id:       uint32(user.ID),
        Username: user.Username,
        Nickname: user.Nickname,
        Role:     user.Role,
    }, nil
}
```

#### 3. 用户服务独立 main.go

```go
// cmd/user-service/main.go
package main

import (
    "net"

    "google.golang.org/grpc"
    pb "api/pkg/proto/user"
)

func main() {
    // 1. 加载配置
    config.NewConfig()

    // 2. 初始化数据库
    database.InitDB()
    defer database.CloseDB()

    // 3. 初始化 repository 和 service
    userRepo := repo.NewUserRepository(database.DB)
    userService := service.NewUserService(userRepo)

    // 4. 创建 gRPC server
    listener, err := net.Listen("tcp", ":50051")
    if err != nil {
        log.Fatal(err)
    }

    grpcServer := grpc.NewServer()
    userRPCServer := rpc.NewUserRPCServer(userService)
    pb.RegisterUserServiceServer(grpcServer, userRPCServer)

    log.Println("User service listening on :50051")
    if err := grpcServer.Serve(listener); err != nil {
        log.Fatal(err)
    }
}
```

#### 4. API Gateway 代理

```go
// internal/gateway/handler/user/login.go
package handler

import (
    pb "api/pkg/proto/user"
)

type LoginHandler struct {
    userClient pb.UserServiceClient  // gRPC 客户端
}

func (h *LoginHandler) Login(c *gin.Context) {
    var req LoginRequest
    c.ShouldBindJSON(&req)

    // ⭐ 调用远程 user-service 的 gRPC
    resp, err := h.userClient.Login(c.Request.Context(), &pb.LoginRequest{
        Username: req.Username,
        Password: req.Password,
    })

    if err != nil {
        common.Error(500, err.Error()).Response(c, 500)
        return
    }

    common.OkWithData(map[string]any{
        "user": resp.User,
        "token": resp.Token,
    }).Response(c, 200)
}
```

#### 5. 初始化 gRPC 客户端

```go
// internal/gateway/client/user_client.go
package client

import (
    "google.golang.org/grpc"
    pb "api/pkg/proto/user"
)

var UserServiceClient pb.UserServiceClient

func InitUserServiceClient() error {
    // 连接到 user-service
    conn, err := grpc.Dial("user-service:50051", grpc.WithInsecure())
    if err != nil {
        return err
    }

    UserServiceClient = pb.NewUserServiceClient(conn)
    return nil
}
```

#### 6. Gateway main.go

```go
// cmd/gateway/main.go
func main() {
    // 1. 初始化所有 gRPC 客户端
    client.InitUserServiceClient()
    client.InitOrderServiceClient()

    // 2. 创建 Gin 引擎
    engine := gin.New()

    // 3. 注册中间件
    engine.Use(middleware.Logger())
    engine.Use(middleware.Auth())

    // 4. 注册路由（代理到各微服务）
    router.SetupRoutes(engine)

    // 5. 启动网关
    engine.Run(":8080")
}
```

### 📊 微服务架构的优点

✅ 独立部署（改用户服务，不影响订单服务）
✅ 独立扩展（用户服务高峰期，启动 5 个副本；订单服务启动 2 个）
✅ 技术栈灵活（用户服务用 Go，订单服务用 Node.js，产品服务用 Java）
✅ 团队独立（用户团队、订单团队各自开发，无需同步）
✅ 容错性好（订单服务宕机，用户登录不受影响）
✅ 可观测性好（独立的日志、监控、追踪）

### 🔴 微服务架构的挑战

❌ 分布式事务复杂（跨服务事务需要 Saga 等模式）
❌ 网络延迟（gRPC 调用有网络开销）
❌ 运维复杂（多个服务需要监控、告警、日志聚合）
❌ 开发成本高（需要学习 gRPC、容器、K8s 等）
❌ 调试困难（跨服务调用难以追踪）

---

## 迁移路径

### 📅 时间规划

```
现在（第 1-3 个月）        单体阶段 - 快速开发
    ↓
3 个月后                   准备阶段 - 为拆分做准备
    ↓
6 个月后                   拆分 User Service
    ↓
9 个月后                   拆分 Order Service
    ↓
12 个月后                  完整微服务 + K8s 部署
```

### 🚀 具体步骤

#### Step 1：现在（单体阶段）

**应该做的：**

- ✅ 完成业务开发
- ✅ Service 接口有 context.Context
- ✅ Repository 接口化
- ✅ 定义 .proto 文件（虽然还不用）

**代码示例：**

```go
// 现在已经这样写，为未来预留接口
type UserService interface {
    Login(ctx context.Context, username, password string) (*User, error)
}
```

#### Step 2：3个月后（准备阶段）

**应该做的：**

- ✅ 实现 gRPC Server
- ✅ 创建 user-service 独立 main.go（但仍然调用同一个数据库）
- ✅ 创建 gRPC 客户端代码
- ✅ 编写 Protocol Buffers

**代码改变：最小化**

```go
// 新增 gRPC server
type UserRPCServer struct {
    service UserService
}

// gRPC 方法只是转发到现有的 service
func (s *UserRPCServer) Login(ctx context.Context, req *pb.LoginRequest) (*pb.LoginResponse, error) {
    return s.service.Login(ctx, req.Username, req.Password)
}
```

#### Step 3：6个月后（拆分 User Service）

**应该做的：**

- ✅ User Service 独立进程（gRPC :50051）
- ✅ User Service 独立数据库
- ✅ Gateway 通过 gRPC 调用 User Service
- ✅ Order Service 仍然在主进程

**部署方式：**

```
Gateway (port 8080)
    ↓
User Service (port 50051, 单独启动)
Order Service (在 Gateway 进程内)
```

#### Step 4：9个月后（拆分 Order Service）

**应该做的：**

- ✅ Order Service 独立进程
- ✅ Order Service 独立数据库
- ✅ Gateway 通过 gRPC 调用 Order Service
- ✅ Product Service 也独立

**部署方式：**

```
Gateway (port 8080)
    ↓ (gRPC)
User Service (port 50051)
Order Service (port 50052)
Product Service (port 50053)
```

#### Step 5：12个月后（K8s 部署）

**应该做的：**

- ✅ Docker 镜像化
- ✅ K8s 部署配置
- ✅ Service Mesh（可选，Istio）
- ✅ 日志聚合（ELK）
- ✅ 监控告警（Prometheus）

---

## 具体实现

### 从单体到微服务的代码迁移

#### 现状：单体（所有代码在一个进程）

```go
// cmd/gateway/main.go
func main() {
    // 所有服务初始化
    userService := service.NewUserService(...)
    orderService := service.NewOrderService(...)

    // 所有路由注册
    router := setupRouter(userService, orderService)

    // 一个端口
    router.Run(":8080")
}
```

#### Step 1：添加 gRPC 支持（准备阶段）

```go
// cmd/gateway/main.go（改动最小）
func main() {
    userService := service.NewUserService(...)

    // 启动 gRPC server（内部，还是同一进程）
    go startGRPCServer(userService)

    // HTTP 路由仍然调用 userService
    router := setupRouter(userService)
    router.Run(":8080")
}

func startGRPCServer(userService service.UserService) {
    listener, _ := net.Listen("tcp", ":50051")
    grpcServer := grpc.NewServer()
    pb.RegisterUserServiceServer(grpcServer, rpc.NewUserRPCServer(userService))
    grpcServer.Serve(listener)
}
```

#### Step 2：拆分 User Service（6个月后）

**新增文件：cmd/user-service/main.go**

```go
// cmd/user-service/main.go（新增）
func main() {
    config.NewConfig()
    database.InitDB()  // 用户服务的独立数据库

    userRepo := repo.NewUserRepository(database.DB)
    userService := service.NewUserService(userRepo)

    listener, _ := net.Listen("tcp", ":50051")
    grpcServer := grpc.NewServer()
    pb.RegisterUserServiceServer(grpcServer, rpc.NewUserRPCServer(userService))
    grpcServer.Serve(listener)
}
```

**修改文件：cmd/gateway/main.go**

```go
// cmd/gateway/main.go（改动：不再内部启动 gRPC，改为调用）
func main() {
    // 连接到远程 user-service
    userClient := client.NewUserClient("user-service:50051")

    // gateway 不再有 orderService，因为它仍在内部
    orderService := service.NewOrderService(...)

    router := setupRouter(userClient, orderService)
    router.Run(":8080")
}
```

**修改文件：internal/gateway/handler/user/login.go**

```go
// 现在调用 gRPC 而不是直接调用 service
func Login(c *gin.Context) {
    // 之前：userService.Login(ctx, ...)
    // 现在：userClient.Login(ctx, ...)

    resp, err := userClient.Login(c.Request.Context(), &pb.LoginRequest{...})
    if err != nil {
        common.Error(500, err.Error()).Response(c, 500)
        return
    }

    common.OkWithData(resp).Response(c, 200)
}
```

#### Step 3：拆分 Order Service（9个月后）

同理，创建 `cmd/order-service/main.go`，修改 Gateway 调用方式。

### 💾 数据库迁移

#### 现在：共享数据库

```yaml
# config/config.yaml
database:
  host: localhost
  dbname: naxs # ⭐ 单一数据库
```

所有表在一个库：

```sql
CREATE TABLE users (...);
CREATE TABLE orders (...);
CREATE TABLE products (...);
```

#### 拆分后：独立数据库

```yaml
# config/config.gateway.yaml
database:
  host: localhost
  dbname: naxs_gateway  # 网关数据库（可选）

# config/config.user-service.yaml
database:
  host: localhost
  dbname: naxs_user     # ⭐ 用户服务独立库

# config/config.order-service.yaml
database:
  host: localhost
  dbname: naxs_order    # ⭐ 订单服务独立库
```

**数据分割：**

```
原数据库（naxs）
├── users
├── orders
└── products

拆分后
├── naxs_user
│   └── users
├── naxs_order
│   └── orders
└── naxs_product
    └── products
```

---

## 🎯 总结

### 单体架构（现在）

**优点：**

- 快速开发
- 部署简单
- 性能好

**缺点：**

- 6-12个月后会遇到瓶颈

### 微服务架构（未来）

**优点：**

- 独立部署和扩展
- 技术栈灵活
- 团队独立开发
- 高可用

**缺点：**

- 运维复杂
- 开发成本高

### 平滑过渡

**关键设计：**

1. Service 接口有 context.Context（为分布式准备）
2. Repository 接口化（数据隔离）
3. 定义 .proto 文件（gRPC 通信）
4. 无需大规模重构（渐进式迁移）

**时间规划：**

```
现在            准备            拆分 1          拆分 2          完成
(3个月)    →   (3个月)    →   (3个月)    →   (3个月)    →  (完成)
单体开发      gRPC 支持      User 独立       Order 独立       K8s 部署
```

**成本最低的方案：**
按照现在的规范开发 → 3个月后添加 gRPC 支持 → 逐步独立各微服务 → 无需重新开发，只需重新部署！

---

## 📚 参考资源

- [Protocol Buffers](https://developers.google.com/protocol-buffers)
- [gRPC 官方文档](https://grpc.io/docs/languages/go/)
- [微服务设计模式](https://microservices.io/)
- [Saga 模式](https://microservices.io/patterns/data/saga.html)
- [服务网格](https://istio.io/)
