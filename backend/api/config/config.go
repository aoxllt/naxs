package config

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/spf13/viper"
)

// Load 加载配置文件，返回配置实例
func Load() (*Config, error) {
	v := viper.New()
	v.SetConfigName("config")
	v.SetConfigType("yaml")

	// 允许从不同工作目录启动：当前目录与上级目录逐级搜索 config
	wd, _ := os.Getwd()
	searchDirs := []string{wd}
	// 向上最多搜索 4 层
	cur := wd
	for i := 0; i < 4; i++ {
		searchDirs = append(searchDirs, filepath.Join(cur, "config"))
		parent := filepath.Dir(cur)
		if parent == cur {
			break
		}
		cur = parent
		searchDirs = append(searchDirs, cur)
	}

	for _, dir := range searchDirs {
		v.AddConfigPath(dir)
	}

	if err := v.ReadInConfig(); err != nil {
		return nil, fmt.Errorf("配置读取失败: %w", err)
	}
	v.AutomaticEnv()

	var cfg Config
	if err := v.Unmarshal(&cfg); err != nil {
		return nil, fmt.Errorf("配置解析失败: %w", err)
	}
	return &cfg, nil
}

// GetConfig 加载配置文件，失败时 panic
// 适用于程序启动时必须成功加载配置的场景
func GetConfig() *Config {
	cfg, err := Load()
	if err != nil {
		panic(err)
	}
	return cfg
}
