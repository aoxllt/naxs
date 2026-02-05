/*
 * @Author: xel
 * @Date: 2026-02-04 18:37:10
 * @LastEditors: xel
 * @LastEditTime: 2026-02-04 18:50:00
 * @FilePath: \api\internal\gateway\middleware\jwt.go
 * @Description: JWT 认证中间件
 */
package middleware

import (
	"api/pkg/utils"
	"strings"

	"github.com/gin-gonic/gin"
)

// JWTAuth JWT 认证中间件
func JWTAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 从 Authorization header 获取 token
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(401, gin.H{"code": 1, "msg": "未提供认证信息"})
			return
		}

		// 解析 Bearer token
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.AbortWithStatusJSON(401, gin.H{"code": 1, "msg": "认证格式错误，需要 Bearer token"})
			return
		}

		// 验证 access token
		claims, err := utils.ValidateAccessToken(parts[1])
		if err != nil {
			c.AbortWithStatusJSON(401, gin.H{"code": 1, "msg": "token无效或已过期"})
			return
		}

		// 将用户信息存入 context，供后续 handler 使用
		c.Set("claims", claims)
		c.Set("userId", claims.UserID)
		c.Set("username", claims.Username)
		c.Set("role", claims.Role)

		c.Next()
	}
}
