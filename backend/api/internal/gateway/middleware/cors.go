/*
 * @Author: xel
 * @Date: 2026-02-04 11:15:00
 * @LastEditors: xel
 * @LastEditTime: 2026-02-04 11:20:00
 * @FilePath: \api\internal\gateway\middleware\cors.go
 * @Description: CORS 跨域中间件
 */
package middleware

import (
	"api/config"
	"strings"

	"github.com/gin-gonic/gin"
)

// CORS 跨域中间件 - 从配置文件读取并处理浏览器的预检请求
func CORS(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 如果未启用 CORS，直接跳过
		if !cfg.Middleware.CORS.Enabled {
			c.Next()
			return
		}

		// 设置允许的源
		if len(cfg.Middleware.CORS.AllowedOrigins) > 0 {
			// 根据请求的 Origin 动态返回单一匹配的源，浏览器在启用凭证时不接受逗号分隔或通配符的 Access-Control-Allow-Origin
			reqOrigin := c.Request.Header.Get("Origin")
			if reqOrigin != "" {
				for _, o := range cfg.Middleware.CORS.AllowedOrigins {
					if o == "*" || o == reqOrigin {
						c.Writer.Header().Set("Access-Control-Allow-Origin", reqOrigin)
						// 告诉 CDN/缓存/客户端响应取决于 Origin
						c.Writer.Header().Set("Vary", "Origin")
						break
					}
				}
			} else {
				// 回退：如果请求没有 Origin，设置第一个允许的 origin（通常用于 server-to-server）
				c.Writer.Header().Set("Access-Control-Allow-Origin", cfg.Middleware.CORS.AllowedOrigins[0])
				c.Writer.Header().Set("Vary", "Origin")
			}
		}

		// 设置允许的请求方法
		if len(cfg.Middleware.CORS.AllowedMethods) > 0 {
			methods := strings.Join(cfg.Middleware.CORS.AllowedMethods, ", ")
			c.Writer.Header().Set("Access-Control-Allow-Methods", methods)
		}

		// 设置允许的请求头
		if len(cfg.Middleware.CORS.AllowedHeaders) > 0 {
			headers := strings.Join(cfg.Middleware.CORS.AllowedHeaders, ", ")
			c.Writer.Header().Set("Access-Control-Allow-Headers", headers)
		} else {
			// 默认允许常用的请求头
			c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		}

		// 允许携带凭证
		if cfg.Middleware.CORS.AllowedCredentials {
			c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		}
		// 预检请求的缓存时间（秒）
		c.Writer.Header().Set("Access-Control-Max-Age", "86400")

		// 如果是 OPTIONS 预检请求，直接返回 204
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
