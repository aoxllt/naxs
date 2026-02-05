/*
 * @Author: xel
 * @Date: 2026-02-03 12:34:27
 * @LastEditors: xel
 * @LastEditTime: 2026-02-03 22:33:30
 * @FilePath: \api\cmd\app\main.go
 * @Description:api应用入口
 */

package main

import (
	"fmt"
	"log"

	"api/config"
	"api/internal/gateway/router"
	"api/internal/services/database"
	"api/pkg/utils"

	"go.uber.org/zap"
)

func main() {
	// 载入配置
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("配置加载失败: %v", err)
	}

	// 初始化日志
	logger, err := utils.InitLoggerWithConfig(cfg)
	if err != nil {
		log.Fatalf("初始化日志失败: %v", err)
	}
	defer logger.Sync()

	// 初始化数据库
	_, err = database.NewPgsql(cfg.Database.Pgsql)
	if err != nil {
		log.Fatalf("初始化数据库失败: %v", err)
	}
	defer func() {
		if database.DB != nil {
			_ = database.Close(database.DB)
		}
	}()

	// 初始化 Redis
	_, err = database.NewRedis(cfg.Database.Redis)
	if err != nil {
		log.Fatalf("初始化 Redis 失败: %v", err)
	}
	defer func() {
		if database.Redis != nil {
			_ = database.Redis.Close()
		}
	}()

	// 初始化路由
	r := router.NewRouter(cfg, logger)

	logger.Info("应用初始化成功")

	// 注册路由
	if err := r.Register(); err != nil {
		log.Fatalf("路由注册失败: %v", err)
	}

	// 启动服务
	if err := r.Run(fmt.Sprintf("%s:%s", cfg.Server.Addr, cfg.Server.Port)); err != nil {
		log.Fatalf("服务启动失败: %v", err)
	}

	logger.Info("服务启动成功", zap.String("addr", cfg.Server.Addr), zap.String("port", cfg.Server.Port))
}
