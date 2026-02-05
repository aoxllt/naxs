package utils

import (
	"api/config"
	"crypto/rand"
	"fmt"
	"log"
	"net/smtp"
	"regexp"
	"strings"
	"time"
)

func IsEmailValid(email string) bool {
	// 简单的邮箱格式验证逻辑
	if len(email) < 3 || len(email) > 254 {
		return false
	}
	pattern := `^[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}$`
	matched, _ := regexp.MatchString(pattern, email)
	return matched
}

func SendEmail(userEmail string) (bool, string) {
	if userEmail == "" {
		log.Println("邮件发送失败: 邮箱地址为空")
		return false, ""
	}

	// 生成4位验证码
	captcha := Generate6Captcha()
	subject := "注册确认邮件"

	// HTML 格式的邮件正文
	body := `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>验证码</title>
</head>
<body style="background-color: #f4f4f4; margin: 0; padding: 0; font-family: Arial, sans-serif;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);">
        <div style="text-align: center; padding: 20px 0;">
            <h1 style="color: #1b9de2; font-size: 28px; margin: 0;">浴巾和科技</h1>
        </div>

        <div style="font-size: 16px; color: #333; margin-bottom: 20px;">
            尊敬的 ` + userEmail + `，
        </div>
        <div style="font-size: 16px; color: #333; line-height: 1.6; text-align: left;">
            <p>您正在注册naxs账号，请使用以下验证码完成注册。</p>
            <p>请勿将此验证码分享给任何人，以确保您的账户安全。</p>
            <p>验证码3分钟内有效</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
            <div style="display: inline-block; background-color: #e6f3fa; padding: 15px 30px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);">
                <div style="font-size: 14px; color: #666; margin-bottom: 5px;">验证码</div>
                <div style="font-size: 36px; color: #1b9de2; font-weight: bold; letter-spacing: 5px;">
                    ` + captcha + `
                </div>
            </div>
        </div>

        <div style="font-size: 12px; color: #777; text-align: center; margin-top: 20px;">
            <p>如有问题，请联系我们：<a href="mailto:xel77@qq.com" style="color: #1b9de2; text-decoration: none;">support@naxs.com</a></p>
        </div>
    </div>
</body>
</html>`
	cfg, _ := config.Load()
	// 构造邮件消息
	msg := strings.Join([]string{
		"From: \"naxs-您的计划管家\" <" + cfg.SMTP.Email + ">",
		"To: " + userEmail,
		"Subject: " + subject,
		"MIME-Version: 1.0",
		"Content-Type: text/html; charset=UTF-8",
		"",
		body,
	}, "\r\n")

	// 配置 SMTPConfig 认证
	auth := smtp.PlainAuth("", cfg.SMTP.Email, cfg.SMTP.Password, cfg.SMTP.Host)

	// 发送邮件
	err := smtp.SendMail(
		cfg.SMTP.Host+":"+cfg.SMTP.Port,
		auth,
		cfg.SMTP.Email,
		[]string{userEmail},
		[]byte(msg),
	)

	// 日志记录
	timestamp := time.Now().Format("2006-01-02 15:04:05.000")
	if err != nil {
		log.Printf("[%s] 邮件发送失败至 %s: %v", timestamp, userEmail, err)
		return false, ""
	}
	log.Printf("[%s] 邮件发送成功至 %s", timestamp, userEmail)
	return true, captcha
}

// SendEmailWithCaptcha 发送使用外部提供的验证码（不再内部生成）
func SendEmailWithCaptcha(userEmail, captcha string) error {
	if userEmail == "" {
		log.Println("邮件发送失败: 邮箱地址为空")
		return fmt.Errorf("empty email")
	}

	subject := "注册确认邮件"

	body := `<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<title>验证码</title>
</head>
<body style="background-color: #f4f4f4; margin: 0; padding: 0; font-family: Arial, sans-serif;">
	<div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);">
		<div style="text-align: center; padding: 20px 0;">
			<h1 style="color: #1b9de2; font-size: 28px; margin: 0;">浴巾和科技</h1>
		</div>

		<div style="font-size: 16px; color: #333; margin-bottom: 20px;">
			尊敬的 ` + userEmail + `，
		</div>
		<div style="font-size: 16px; color: #333; line-height: 1.6; text-align: left;">
			<p>您正在注册naxs账号，请使用以下验证码完成注册。</p>
			<p>请勿将此验证码分享给任何人，以确保您的账户安全。</p>
			<p>验证码3分钟内有效</p>
		</div>

		<div style="text-align: center; margin: 30px 0;">
			<div style="display: inline-block; background-color: #e6f3fa; padding: 15px 30px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);">
				<div style="font-size: 14px; color: #666; margin-bottom: 5px;">验证码</div>
				<div style="font-size: 36px; color: #1b9de2; font-weight: bold; letter-spacing: 5px;">
					` + captcha + `
				</div>
			</div>
		</div>

		<div style="font-size: 12px; color: #777; text-align: center; margin-top: 20px;">
			<p>如有问题，请联系我们：<a href="mailto:xel77@qq.com" style="color: #1b9de2; text-decoration: none;">support@naxs.com</a></p>
		</div>
	</div>
</body>
</html>`
	cfg, _ := config.Load()
	msg := strings.Join([]string{
		"From: \"naxs-您的计划管家\" <" + cfg.SMTP.Email + ">",
		"To: " + userEmail,
		"Subject: " + subject,
		"MIME-Version: 1.0",
		"Content-Type: text/html; charset=UTF-8",
		"",
		body,
	}, "\r\n")

	auth := smtp.PlainAuth("", cfg.SMTP.Email, cfg.SMTP.Password, cfg.SMTP.Host)

	err := smtp.SendMail(
		cfg.SMTP.Host+":"+cfg.SMTP.Port,
		auth,
		cfg.SMTP.Email,
		[]string{userEmail},
		[]byte(msg),
	)

	timestamp := time.Now().Format("2006-01-02 15:04:05.000")
	if err != nil {
		log.Printf("[%s] 邮件发送失败至 %s: %v", timestamp, userEmail, err)
		return err
	}
	log.Printf("[%s] 邮件发送成功至 %s", timestamp, userEmail)
	return nil
}

func Generate6Captcha() string {
	const chars = "0123456789"
	const length = 6

	out := make([]byte, length)
	// 尝试用 crypto/rand 获取随机字节
	buf := make([]byte, length)
	if _, err := rand.Read(buf); err == nil {
		for i, b := range buf {
			out[i] = chars[int(b)%len(chars)]
		}
		return string(out)
	}

	return string(out)
}

func PointerToString(s string) *string {
	// 返回指向字符串副本的指针
	return &s
}
