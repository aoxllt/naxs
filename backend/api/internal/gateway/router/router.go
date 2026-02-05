/*
 * @Author: xel
 * @Date: 2026-02-03 14:51:43
 * @LastEditors: xel
 * @LastEditTime: 2026-02-05 11:38:39
 * @FilePath: \api\internal\gateway\router\router.go
 * @Description:
 */

package router

import (
	"api/config"
	"api/internal/gateway/handler/auth"
	"api/internal/gateway/handler/auth/profiles"
	"api/internal/gateway/handler/user"
	"api/internal/gateway/middleware"
	"os"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type IRouter interface {
	Run(add string) error
	Register() error
	Close() error
}

type Router struct {
	Engine *gin.Engine
}

func NewRouter(cfg *config.Config, logger *zap.Logger) *Router {
	r := gin.New()

	root, _ := os.Getwd()
	uploadsDir := filepath.Join(root, "uploads")
	r.Static("/uploads", uploadsDir)

	//设置中间件
	r.Use(gin.Recovery())
	r.Use(middleware.CORS(cfg))
	r.Use(middleware.TimeLogger(logger))
	r.Use(middleware.RecoveryLogger(logger))

	return &Router{
		Engine: r,
	}
}

// 设置路由
func (r *Router) Register() error {
	apiv1 := r.Engine.Group("/api/v1")
	{

		userGroup := apiv1.Group("/user")
		{
			userGroup.POST("/send", user.SendCodeController)
			userGroup.GET("/checkUsername", user.CheckUsernameController)
			userGroup.POST("/register", user.RegisterController)
			userGroup.POST("/registerWithBind", user.RegisterWithBindController)
			userGroup.POST("/login", user.LoginController)
			userGroup.GET("/google/url", user.GoogleUrlController)
			userGroup.GET("/google/callback", user.GoogleCallbackController)
			userGroup.POST("/bind", user.OAuthBindInfoController)
		}
		authGroup := apiv1.Group("/auth")
		authGroup.Use(middleware.JWTAuth())
		{
			authGroup.POST("/refresh", auth.RefreshController)
			authGroup.GET("/profiles/avatar", profiles.GetAvtarUrlController)
		}

	}
	return nil
}

func (r *Router) Run(add string) error {
	if err := r.Engine.Run(add); err != nil {
		return err
	}
	return nil
}

func parseDuration(s string) time.Duration {
	d, _ := time.ParseDuration(s)
	return d
}

func (r *Router) Close() error {

	return nil
}
