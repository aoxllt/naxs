/*
 * @Author: xel
 * @Date: 2026-02-03 18:34:00
 * @LastEditors: xel
 * @LastEditTime: 2026-02-03 18:34:03
 * @FilePath: \api\internal\services\database\redis.go
 * @Description:
 */

package database

import (
	"context"
	"fmt"
	"time"

	"api/config"

	"github.com/redis/go-redis/v9"
)

// 全局 Redis 实例
var Redis *redis.Client

// NewRedis 创建 Redis 客户端并进行连接测试
func NewRedis(cfg config.Redis) (*redis.Client, error) {
	client := redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%s", cfg.Host, cfg.Port),
		Password: cfg.Password,
		DB:       cfg.DB,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	if err := client.Ping(ctx).Err(); err != nil {
		_ = client.Close()
		return nil, fmt.Errorf("redis 连接测试失败: %w", err)
	}

	// 设置全局实例
	Redis = client

	return client, nil
}
