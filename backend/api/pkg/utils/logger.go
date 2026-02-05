/*
 * @Author: xel
 * @Date: 2026-02-03 16:40:00
 * @LastEditors: xel
 * @LastEditTime: 2026-02-03 16:45:26
 * @FilePath: \api\pkg\utils\logger.go
 * @Description: zap日志初始化工具 - 支持config配置
 */
package utils

import (
	"api/config"
	"os"
	"path/filepath"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
	"gopkg.in/natefinch/lumberjack.v2"
)

// InitLoggerWithConfig 使用config配置初始化zap日志实例
func InitLoggerWithConfig(cfg *config.Config) (*zap.Logger, error) {
	return InitLogger(cfg.Log.Level, cfg.Log)
}

// InitLogger 初始化zap日志实例 (支持日志文件)
func InitLogger(logLevel string, logCfg config.Log) (*zap.Logger, error) {
	level := parseLogLevel(logLevel)

	// 定义日志编码器配置
	encoderConfig := zapcore.EncoderConfig{
		TimeKey:        "时间",
		LevelKey:       "级别",
		NameKey:        "日志器",
		CallerKey:      "调用者",
		MessageKey:     "消息",
		StacktraceKey:  "堆栈跟踪",
		LineEnding:     zapcore.DefaultLineEnding,
		EncodeLevel:    zapcore.LowercaseLevelEncoder,
		EncodeTime:     zapcore.ISO8601TimeEncoder,
		EncodeDuration: zapcore.SecondsDurationEncoder,
		EncodeCaller:   zapcore.ShortCallerEncoder,
	}

	// 选择编码器（json或console）
	var encoder zapcore.Encoder
	if logCfg.Format == "json" {
		encoder = zapcore.NewJSONEncoder(encoderConfig)
	} else {
		encoder = zapcore.NewConsoleEncoder(encoderConfig)
	}

	// 配置输出目标
	var writeSyncer zapcore.WriteSyncer

	if logCfg.Output == "file" && logCfg.File.Path != "" {
		// 确保日志目录存在
		logDir := filepath.Dir(logCfg.File.Path)
		if err := os.MkdirAll(logDir, 0755); err != nil {
			return nil, err
		}

		// 使用lumberjack进行日志文件轮转
		writer := &lumberjack.Logger{
			Filename:   logCfg.File.Path,
			MaxSize:    logCfg.File.MaxSize,    // MB
			MaxBackups: logCfg.File.MaxBackups, // 保留备份数
			MaxAge:     logCfg.File.MaxAge,     // 天数
			Compress:   true,
		}
		writeSyncer = zapcore.NewMultiWriteSyncer(
			zapcore.AddSync(os.Stdout),
			zapcore.AddSync(writer),
		)
	} else {
		// 仅输出到标准输出
		writeSyncer = zapcore.NewMultiWriteSyncer(
			zapcore.AddSync(os.Stdout),
		)
	}

	// 创建core
	core := zapcore.NewCore(encoder, writeSyncer, level)

	// 创建logger
	logger := zap.New(core, zap.AddCaller(), zap.AddStacktrace(zapcore.ErrorLevel))
	return logger, nil
}

// InitLoggerSimple 简单初始化（仅日志级别）
func InitLoggerSimple(logLevel string) (*zap.Logger, error) {
	level := parseLogLevel(logLevel)

	config := zapcore.EncoderConfig{
		TimeKey:        "时间",
		LevelKey:       "级别",
		NameKey:        "日志器",
		CallerKey:      "调用者",
		MessageKey:     "消息",
		StacktraceKey:  "堆栈跟踪",
		LineEnding:     zapcore.DefaultLineEnding,
		EncodeLevel:    zapcore.LowercaseLevelEncoder,
		EncodeTime:     zapcore.ISO8601TimeEncoder,
		EncodeDuration: zapcore.SecondsDurationEncoder,
		EncodeCaller:   zapcore.ShortCallerEncoder,
	}

	core := zapcore.NewCore(
		zapcore.NewJSONEncoder(config),
		zapcore.NewMultiWriteSyncer(
			zapcore.AddSync(os.Stdout),
		),
		level,
	)

	logger := zap.New(core, zap.AddCaller(), zap.AddStacktrace(zapcore.ErrorLevel))
	return logger, nil
}

// parseLogLevel 解析日志级别
func parseLogLevel(level string) zapcore.Level {
	switch level {
	case "debug":
		return zapcore.DebugLevel
	case "info":
		return zapcore.InfoLevel
	case "warn":
		return zapcore.WarnLevel
	case "error":
		return zapcore.ErrorLevel
	case "panic":
		return zapcore.PanicLevel
	case "fatal":
		return zapcore.FatalLevel
	default:
		return zapcore.InfoLevel
	}
}

// SugaredLogger 返回sugared logger (更便捷的API)
func SugaredLogger(logger *zap.Logger) *zap.SugaredLogger {
	return logger.Sugar()
}
