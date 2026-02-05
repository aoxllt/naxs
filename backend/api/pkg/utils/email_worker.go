package utils

import (
	"api/config"
	"context"
	"log"
	"time"
)

type EmailJob struct {
	To      string
	Captcha string
}

var (
	emailQueue  chan EmailJob
	maxAttempts = 3
	queueSize   = 200
	workerCount = 5
	// 入队等待时间，避免瞬时高峰直接回退为同步发送
	enqueueTimeout = 200 * time.Millisecond
	sendTimeout    = 10 * time.Second
)

func init() {
	loadEmailConfig()

	if queueSize <= 0 {
		queueSize = 200
	}
	if workerCount <= 0 {
		workerCount = 5
	}
	if maxAttempts <= 0 {
		maxAttempts = 3
	}
	if sendTimeout <= 0 {
		sendTimeout = 10 * time.Second
	}

	emailQueue = make(chan EmailJob, queueSize)
	// 启动固定数量的 worker，避免协程风暴
	for i := 0; i < workerCount; i++ {
		go emailWorker()
	}
}

// EnqueueEmail 尝试将发送任务放入队列，放入失败返回 false
func EnqueueEmail(to, captcha string) bool {
	job := EmailJob{To: to, Captcha: captcha}
	select {
	case emailQueue <- job:
		return true
	default:
		// 队列已满，尝试短暂等待
	}

	if enqueueTimeout <= 0 {
		return false
	}

	timer := time.NewTimer(enqueueTimeout)
	defer timer.Stop()
	select {
	case emailQueue <- job:
		return true
	case <-timer.C:
		// 队列已满，返回 false 供调用方决定回退策略
		return false
	}
}

func emailWorker() {
	for job := range emailQueue {
		sendWithRetry(job)
	}
}

func sendWithRetry(job EmailJob) {
	for attempt := 1; attempt <= maxAttempts; attempt++ {
		// 这里可以传入 context 到发送函数（如果需要），当前使用短超时互相分离
		ctx, cancel := context.WithTimeout(context.Background(), sendTimeout)
		_ = ctx
		err := SendEmailWithCaptcha(job.To, job.Captcha)
		cancel()
		if err == nil {
			log.Printf("邮件发送成功 to=%s", job.To)
			return
		}
		log.Printf("邮件发送失败 to=%s attempt=%d err=%v", job.To, attempt, err)
		// 指数退避
		time.Sleep(time.Duration(1<<uint(attempt-1)) * time.Second)
	}
	// 最终失败：持久化或告警（此处简单记录，生产应写入 DB 或告警）
	recordEmailFailure(job)
}

func recordEmailFailure(job EmailJob) {
	log.Printf("邮件最终失败 to=%s captcha=%s", job.To, job.Captcha)
}

func loadEmailConfig() {
	cfg, err := config.Load()
	if err != nil {
		log.Printf("邮箱队列配置加载失败，使用默认值: %v", err)
		return
	}

	if cfg.Email.QueueSize > 0 {
		queueSize = cfg.Email.QueueSize
	}
	if cfg.Email.Workers > 0 {
		workerCount = cfg.Email.Workers
	}
	if cfg.Email.MaxAttempts > 0 {
		maxAttempts = cfg.Email.MaxAttempts
	}
	if cfg.Email.EnqueueTimeout != "" {
		if d, err := time.ParseDuration(cfg.Email.EnqueueTimeout); err == nil {
			enqueueTimeout = d
		}
	}
	if cfg.Email.SendTimeout != "" {
		if d, err := time.ParseDuration(cfg.Email.SendTimeout); err == nil {
			sendTimeout = d
		}
	}
}
