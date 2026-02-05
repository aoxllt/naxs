package database

import (
	"fmt"
	"time"

	"api/config"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// 全局数据库实例
var DB *gorm.DB

// NewPgsql 创建 PostgreSQL 数据库连接
func NewPgsql(cfg config.Pgsql) (*gorm.DB, error) {
	// 构建 DSN
	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		cfg.Host,
		cfg.Port,
		cfg.User,
		cfg.Password,
		cfg.DBName,
		cfg.SSLMode,
	)

	// GORM 配置
	gormConfig := &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
		NowFunc: func() time.Time {
			return time.Now().Local()
		},
	}

	// 连接数据库
	db, err := gorm.Open(postgres.Open(dsn), gormConfig)
	if err != nil {
		return nil, fmt.Errorf("连接数据库失败: %w", err)
	}

	// 获取底层 sql.DB 进行连接池配置
	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("获取数据库实例失败: %w", err)
	}

	// 连接池配置
	if cfg.MaxOpenConns > 0 {
		sqlDB.SetMaxOpenConns(cfg.MaxOpenConns)
	}
	if cfg.MaxIdleConns > 0 {
		sqlDB.SetMaxIdleConns(cfg.MaxIdleConns)
	}
	if cfg.ConnMaxLifetime != "" {
		lifetime, err := time.ParseDuration(cfg.ConnMaxLifetime)
		if err == nil {
			sqlDB.SetConnMaxLifetime(lifetime)
		}
	}

	// 测试连接
	if err := sqlDB.Ping(); err != nil {
		return nil, fmt.Errorf("数据库连接测试失败: %w", err)
	}

	// 创建 user_profiles 表（使用原生 SQL 避免 GORM 迁移冲突）
	createSQL := `
	CREATE TABLE IF NOT EXISTS user_profiles (
		id BIGSERIAL PRIMARY KEY,
		user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
		created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
		deleted_at TIMESTAMPTZ,
		nickname VARCHAR(50),
		avatar_url VARCHAR(500),
		bio VARCHAR(500),
		gender SMALLINT DEFAULT 0,
		birthday DATE,
		phone VARCHAR(20),
		country VARCHAR(50),
		city VARCHAR(50),
		address VARCHAR(200),
		website VARCHAR(200),
		github VARCHAR(100),
		twitter VARCHAR(100)
	);
	CREATE INDEX IF NOT EXISTS idx_user_profiles_deleted_at ON user_profiles(deleted_at);
	`
	if err := db.Exec(createSQL).Error; err != nil {
		return nil, fmt.Errorf("创建 user_profiles 表失败: %w", err)
	}

	// 设置全局实例
	DB = db

	return db, nil
}

// Close 关闭数据库连接
func Close(db *gorm.DB) error {
	sqlDB, err := db.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}
