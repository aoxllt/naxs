/*
 * @Author: xel
 * @Date: 2026-02-03 16:33:30
 * @LastEditors: xel
 * @LastEditTime: 2026-02-03 23:03:52
 * @FilePath: \api\internal\gateway\middleware\logs.go
 * @Description: 接口日志中间件 - 使用zap记录请求响应信息
 */
package middleware

import (
	"fmt"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// TimeLogger 记录接口请求和响应的日志中间件
func TimeLogger(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()

		// 记录请求信息
		method := c.Request.Method
		path := c.Request.RequestURI
		clientIP := c.ClientIP()
		userAgent := c.Request.UserAgent()

		// 执行后续处理
		c.Next()

		// 计算耗时（使用微秒再转为毫秒以保留小数，避免短请求显示为 0ms）
		duration := time.Since(start)
		latencyMs := float64(duration.Microseconds()) / 1000.0
		statusCode := c.Writer.Status()
		responseSize := c.Writer.Size()
		if responseSize < 0 {
			responseSize = 0
		}

		// 根据状态码选择日志级别
		// 统一使用更简洁、可读的字段名，并以毫秒输出耗时
		// 中文输出，关键性能字段（耗时）优先
		if statusCode >= 500 {
			logger.Error("接口请求失败",
				zap.String("耗时", fmt.Sprintf("%.3fms", latencyMs)),
				zap.String("方法", method),
				zap.String("路径", path),
				zap.Int("状态", statusCode),
				zap.Int("响应体积", responseSize),
				zap.String("客户端IP", clientIP),
				zap.String("用户代理", userAgent),
			)
		} else if statusCode >= 400 {
			logger.Warn("接口请求告警",
				zap.String("耗时", fmt.Sprintf("%.3fms", latencyMs)),
				zap.String("方法", method),
				zap.String("路径", path),
				zap.Int("状态", statusCode),
				zap.Int("响应体积", responseSize),
				zap.String("客户端IP", clientIP),
				zap.String("用户代理", userAgent),
			)
		} else {
			logger.Info("接口请求成功",
				zap.String("耗时", fmt.Sprintf("%.3fms", latencyMs)),
				zap.String("方法", method),
				zap.String("路径", path),
				zap.Int("状态", statusCode),
				zap.Int("响应体积", responseSize),
				zap.String("客户端IP", clientIP),
			)
		}
	}
}

// RequestLogger 记录请求体信息的中间件
func RequestLogger(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 记录请求头信息
		headers := c.Request.Header
		contentType := headers.Get("Content-Type")
		authorization := headers.Get("Authorization")

		logger.Debug("请求详情",
			zap.String("请求方法", c.Request.Method),
			zap.String("请求路径", c.Request.RequestURI),
			zap.String("内容类型", contentType),
			zap.String("查询参数", c.Request.URL.RawQuery),
			zap.Bool("已授权", authorization != ""),
		)

		c.Set("request_start_time", time.Now())
		c.Set("request_content_type", contentType)

		c.Next()
	}
}

// RecoveryLogger 处理panic恢复日志的中间件
func RecoveryLogger(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				logger.Error("捕获到Panic异常",
					zap.Any("错误", err),
					zap.String("请求方法", c.Request.Method),
					zap.String("请求路径", c.Request.RequestURI),
					zap.String("客户端IP", c.ClientIP()),
					zap.Stack("堆栈跟踪"),
				)
				c.AbortWithStatusJSON(500, gin.H{
					"error": "Internal server error",
				})
			}
		}()
		c.Next()
	}
}
