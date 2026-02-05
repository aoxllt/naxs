/*
 * @Author: xel
 * @Date: 2026-02-03 18:25:20
 * @LastEditors: xel
 * @LastEditTime: 2026-02-04 18:27:49
 * @FilePath: \api\internal\services\user\Suser.go
 * @Description:
 */

package userservice

import (
	"api/config"
	"api/internal/model"
	"api/internal/services/database"
	"api/pkg/utils"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"path"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"gorm.io/gorm"
)

type Suser struct {
}

func (s *Suser) SendCode(email string) error {
	// 先生成验证码并持久化（确保验证流程可用），再异步发送邮件以降低请求延迟
	captcha := utils.Generate6Captcha()

	// 将验证码存入 Redis，TTL 为 3 分钟
	ctx := context.Background()
	err := database.Redis.Set(ctx, email, captcha, 3*time.Minute).Err()
	if err != nil {
		return fmt.Errorf("验证码存储失败: %w", err)
	}

	// 异步入队发送，队列满时回退为同步发送以保证尝试交付
	enqueued := utils.EnqueueEmail(email, captcha)
	if !enqueued {
		// 回退：短超时同步发送（尽量不阻塞过久）
		log.Printf("email queue full, falling back to sync send for %s", email)
		sendErr := utils.SendEmailWithCaptcha(email, captcha)
		if sendErr != nil {
			log.Printf("fallback sync send failed for %s: %v", email, sendErr)
		}
	}

	return nil
}

func (s *Suser) CheckUsername(username string) (int, error) {
	// 使用生成的模型查询用户名是否存在
	var user model.User
	err := database.DB.Where("username = ?", username).First(&user).Error
	if err != nil {
		// 如果是未找到记录，说明用户名可用
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return 200, nil
		}
		return 500, fmt.Errorf("查询失败: %w", err)
	}

	// 如果找到了记录，说明用户名已存在
	return 400, fmt.Errorf("用户名已存在")
}

func (s *Suser) Register(username, email, password, captcha, inviteCode string) (int, error) {
	_ = inviteCode // currently unused, reserve for invite logic
	ctx := context.Background()
	storedCaptcha, err := database.Redis.Get(ctx, email).Result()
	if err != nil {
		return 400, fmt.Errorf("验证码已过期或不存在")
	}
	if storedCaptcha != captcha {
		return 400, fmt.Errorf("验证码不正确")
	}

	// 2. 检查用户名和邮箱是否已存在
	var count int64
	database.DB.Where("username = ? OR email = ?", username, email).Model(&model.User{}).Count(&count)
	if count > 0 {
		return 400, fmt.Errorf("用户名或邮箱已存在")
	}

	hashedPassword, err := utils.HashPassword(password)
	if err != nil {
		return 500, fmt.Errorf("密码加密失败: %w", err)
	}

	var Lcount int32 = 0
	newUser := &model.User{
		Username:   username,
		Email:      &email,
		Password:   hashedPassword,
		Role:       "user",
		Status:     "active",
		IsAdmin:    false,
		LoginCount: &Lcount,
	}

	// 使用事务确保用户和资料同时创建
	err = database.DB.Transaction(func(tx *gorm.DB) error {
		// 创建用户
		if err := tx.Create(newUser).Error; err != nil {
			return err
		}

		// 创建关联的用户资料（使用用户名作为默认昵称）
		profile := &model.UserProfile{
			UserID:   newUser.ID,
			Nickname: &username,
		}
		if err := tx.Create(profile).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		return 500, fmt.Errorf("用户创建失败: %w", err)
	}

	database.Redis.Del(ctx, email)

	return 200, nil
}

func (s *Suser) LoginWithUsername(username, password string, c *gin.Context) (int, *LoginResult, error) {
	var user model.User
	err := database.DB.Where("username = ?", username).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return 400, nil, fmt.Errorf("用户不存在")
		}
		return 500, nil, fmt.Errorf("查询失败: %w", err)
	}
	if !utils.CheckPasswordHash(password, user.Password) {
		return 400, nil, fmt.Errorf("密码错误")
	}

	// 生成 access token（返回给前端存内存）
	accessToken, err := utils.GenerateAccessToken(int(user.ID), user.Username, user.Role)
	if err != nil {
		return 500, nil, fmt.Errorf("生成accessToken失败: %w", err)
	}

	// 生成 refresh token（设置 HttpOnly Cookie）
	refreshToken, maxAge, err := utils.GenerateRefreshToken(int(user.ID), user.Username, user.Role)
	if err != nil {
		return 500, nil, fmt.Errorf("生成refreshToken失败: %w", err)
	}
	// 使用通用的 cookie helper，确保 SameSite 和 Secure 正确设置
	utils.SetRefreshCookie(c.Writer, refreshToken, maxAge)

	// 异步更新登录信息
	ip := c.ClientIP()
	go func(userID int64, ip string) {
		err := UpdateLoginInfo(userID, ip)
		if err != nil {
			log.Printf("更新登录信息失败: %v", err)
		}
	}(user.ID, ip)

	return 200, &LoginResult{AccessToken: accessToken}, nil
}

func (s *Suser) LoginWithEmail(email, password string, c *gin.Context) (int, *LoginResult, error) {
	var user model.User
	err := database.DB.Where("email = ?", email).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return 400, nil, fmt.Errorf("用户不存在")
		}
		return 500, nil, fmt.Errorf("查询失败: %w", err)
	}
	if !utils.CheckPasswordHash(password, user.Password) {
		return 400, nil, fmt.Errorf("密码错误")
	}

	// 生成 access token（返回给前端存内存）
	accessToken, err := utils.GenerateAccessToken(int(user.ID), user.Username, user.Role)
	if err != nil {
		return 500, nil, fmt.Errorf("生成accessToken失败: %w", err)
	}

	// 生成 refresh token（设置 HttpOnly Cookie）
	refreshToken, maxAge, err := utils.GenerateRefreshToken(int(user.ID), user.Username, user.Role)
	if err != nil {
		return 500, nil, fmt.Errorf("生成refreshToken失败: %w", err)
	}
	// 使用通用的 cookie helper，确保 SameSite 和 Secure 正确设置
	utils.SetRefreshCookie(c.Writer, refreshToken, maxAge)

	// 异步更新登录信息
	ip := c.ClientIP()
	go func(userID int64, ip string) {
		err := UpdateLoginInfo(userID, ip)
		if err != nil {
			log.Printf("更新登录信息失败: %v", err)
		}
	}(user.ID, ip)

	return 200, &LoginResult{AccessToken: accessToken}, nil
}

// UpdateLoginInfo 通过用户ID更新登录信息
func UpdateLoginInfo(userID int64, ip string) error {
	now := time.Now()
	return database.DB.Model(&model.User{}).Where("id = ?", userID).Updates(map[string]interface{}{
		"last_login_at": now,
		"last_login_ip": ip,
		"login_count":   gorm.Expr("login_count + 1"),
	}).Error
}

func (s *Suser) GetAvtarUrl(c utils.CustomClaims) (int, string, error) {

	// 查询用户资料获取头像URL
	var profile model.UserProfile
	err := database.DB.Where("user_id = ?", c.UserID).First(&profile).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return 200, "", nil
		}
		return 500, "", fmt.Errorf("查询用户资料失败: %w", err)
	}
	avatarURL := ""
	if profile.AvatarURL != nil {
		avatarURL = *profile.AvatarURL
	}

	return 200, avatarURL, nil
}

func (s *Suser) GoogleCallback(code string, c *gin.Context) (int, *LoginResult, map[string]any, error) {
	cfg := config.GetConfig()
	clientID := cfg.OAuth.Google.ClientID
	clientSecret := cfg.OAuth.Google.ClientSecret
	redirectURL := cfg.OAuth.Google.RedirectURL
	oauthCfg := &oauth2.Config{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		RedirectURL:  redirectURL,
		Scopes:       []string{"openid", "profile", "email"},
		Endpoint:     google.Endpoint,
	}

	proxyURL, _ := url.Parse("http://127.0.0.1:7890")
	transport := &http.Transport{
		Proxy: http.ProxyURL(proxyURL),
	}
	client := &http.Client{Transport: transport}
	ctx := context.WithValue(context.Background(), oauth2.HTTPClient, client)

	token, err := oauthCfg.Exchange(ctx, code)

	if err != nil {
		// 不使用 log.Fatal，以免退出整个进程；返回错误给调用方处理
		log.Printf("oauth token exchange failed: %v", err)
		return 500, nil, nil, fmt.Errorf("failed to exchange token: %w", err)
	}

	// 从 token 获取 id_token（若存在）与 access_token
	idToken := ""
	if v := token.Extra("id_token"); v != nil {
		if s, ok := v.(string); ok {
			idToken = s
		}
	}

	// 使用 access token 调用 userinfo 获取 profile
	userInfoURL := "https://www.googleapis.com/oauth2/v3/userinfo"
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, userInfoURL, nil)
	req.Header.Set("Authorization", "Bearer "+token.AccessToken)
	resp, err := client.Do(req)
	if err != nil {
		return 500, nil, nil, fmt.Errorf("failed to get user info: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return 500, nil, nil, fmt.Errorf("failed to get user info: %s", string(body))
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return 500, nil, nil, fmt.Errorf("failed to read user info: %w", err)
	}

	var u struct {
		Sub     string `json:"sub"`
		Email   string `json:"email"`
		Name    string `json:"name"`
		Picture string `json:"picture"`
	}
	if err := json.Unmarshal(body, &u); err != nil {
		return 500, nil, nil, fmt.Errorf("failed to parse userinfo: %w", err)
	}

	// 1) 按 provider+provider_id 查找（优先）
	var user model.User
	err = database.DB.Where("provider = ? AND provider_id = ?", "google", u.Sub).First(&user).Error
	if err == nil {
		// 找到已绑定用户 -> 生成我方 token 并返回
		accessToken, err := utils.GenerateAccessToken(int(user.ID), user.Username, user.Role)
		if err != nil {
			return 500, nil, nil, fmt.Errorf("生成 access token 失败: %w", err)
		}
		refreshToken, maxAge, err := utils.GenerateRefreshToken(int(user.ID), user.Username, user.Role)
		if err != nil {
			return 500, nil, nil, fmt.Errorf("生成 refresh token 失败: %w", err)
		}
		// 使用通用的 cookie helper，确保 SameSite 和 Secure 正确设置
		utils.SetRefreshCookie(c.Writer, refreshToken, maxAge)
		// 异步更新登录信息
		ip := c.ClientIP()
		go func(userID int64, ip string) {
			err := UpdateLoginInfo(userID, ip)
			if err != nil {
				log.Printf("更新登录信息失败: %v", err)
			}
		}(user.ID, ip)

		// 额外优化：如果用户资料中没有 provider 或 provider_id（历史数据），尝试写入；
		// 以及如果 profile.avatar 与 Google 返回不一致，更新 avatar
		// 使用事务级别的轻量更新以避免干扰主流程
		go func(u model.User, profilePic string) {
			defer func() {
				if r := recover(); r != nil {
					log.Printf("recover in update profile: %v", r)
				}
			}()
			upd := map[string]interface{}{}
			if u.Provider == nil || *u.Provider == "" {
				p := "google"
				upd["provider"] = p
			}
			if u.ProviderID == nil || *u.ProviderID == "" {
				// provider_id 为空或未设置，跳过自动写入（否则需要类型转换）
			}
			if len(upd) > 0 {
				database.DB.Model(&model.User{}).Where("id = ?", u.ID).Updates(upd)
			}

			// 更新 profile.avatar
			if profilePic != "" {
				var profile model.UserProfile
				err := database.DB.Where("user_id = ?", u.ID).First(&profile).Error
				if err == nil {
					if profile.AvatarURL == nil || *profile.AvatarURL != profilePic {
						database.DB.Model(&model.UserProfile{}).Where("user_id = ?", u.ID).Update("avatar_url", profilePic)
					}
				}
			}
		}(user, u.Picture)

		return 200, &LoginResult{AccessToken: accessToken}, nil, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return 500, nil, nil, fmt.Errorf("查询用户失败: %w", err)
	}

	// 2) 未绑定：不要自动创建用户。返回 Google 回调得到的 token/profile 给前端以便后续绑定。
	data := map[string]any{
		"provider":    "google",
		"providerId":  u.Sub,
		"email":       u.Email,
		"name":        u.Name,
		"avatar":      u.Picture,
		"idToken":     idToken,
		"accessToken": token.AccessToken,
	}
	return 400, nil, data, nil
}

func (s *Suser) RegisterWithBind(bindToken, username, password, email string, c *gin.Context) (int, *LoginResult, error) {
	// 从 Redis 获取 bindToken 对应的数据
	ctx := context.Background()
	key := "oauth:bind:" + bindToken
	val, err := database.Redis.Get(ctx, key).Result()
	if err != nil {
		return 400, nil, fmt.Errorf("无效或已过期的 bind_token")
	}

	var data map[string]any
	if err := json.Unmarshal([]byte(val), &data); err != nil {
		return 500, nil, fmt.Errorf("解析 bind 数据失败: %w", err)
	}

	// 简单校验：如果传了邮箱并且与 bind 数据不一致，则提示错误（可选策略）
	if email == "" && data["email"] != nil {
		email = data["email"].(string)
	}
	if email != "" && data["email"] != nil {
		if em, ok := data["email"].(string); ok && em != email {
			// 不强制拒绝，但记录并返回错误以避免误绑定
			return 400, nil, fmt.Errorf("提交的邮箱与第三方账号邮箱不匹配")
		}
	}

	hashPassword, err := utils.HashPassword(password)
	if err != nil {
		return 500, nil, fmt.Errorf("密码加密失败: %w", err)
	}

	var Lcount int32 = 0
	newUser := &model.User{
		Username:   username,
		Email:      &email,
		Password:   hashPassword,
		Role:       "user",
		Status:     "active",
		IsAdmin:    false,
		LoginCount: &Lcount,
	}

	// 从 bind 数据填充 provider 信息（安全地处理类型断言）
	if p, ok := data["provider"].(string); ok && p != "" {
		newUser.Provider = utils.PointerToString(p)
	}
	if pid, ok := data["providerId"].(string); ok && pid != "" {
		newUser.ProviderID = utils.PointerToString(pid)
	}

	// 使用事务创建用户和 profile
	err = database.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(newUser).Error; err != nil {
			return err
		}

		profile := &model.UserProfile{
			UserID:   newUser.ID,
			Nickname: utils.PointerToString(username),
		}
		// go
		if a, ok := data["avatar"].(string); ok && a != "" {
			cfg := config.GetConfig()

			// 准备 uploads 目录
			root, _ := os.Getwd()
			uploadsDir := filepath.Join(root, "uploads")
			_ = os.MkdirAll(uploadsDir, 0755)

			// 从 URL 推断扩展名
			ext := ".jpg"
			if u, err := url.Parse(a); err == nil {
				if e := path.Ext(u.Path); e != "" {
					ext = e
				}
			}

			// 用 username 生成安全文件名（替换非法字符）
			safeName := regexp.MustCompile(`[^a-zA-Z0-9\-_]`).ReplaceAllString(username, "_")
			filename := safeName + ext
			dst := filepath.Join(uploadsDir, filename)

			// 下载图片到本地
			client := &http.Client{Timeout: 10 * time.Second}
			if resp, err := client.Get(a); err == nil {
				defer resp.Body.Close()
				if resp.StatusCode == http.StatusOK {
					if f, err := os.Create(dst); err == nil {
						_, _ = io.Copy(f, resp.Body)
						_ = f.Close()
					}
				}
			}

			// 拼接对外 URL（以 cfg.AppURL 为准）
			appURL := ""
			// 若配置字段名不同请调整 cfg.AppURL 为正确字段
			if cfg != nil {
				// 假定配置字段为 AppURL
				// 如果你的配置为 AppUrl 或其他，请修改此处
				if val := cfg.App.Url; val != "" {
					appURL = strings.TrimRight(val, "/")
				}
			}
			profile.AvatarURL = utils.PointerToString(appURL + "/uploads/" + filename)
		}

		if err := tx.Create(profile).Error; err != nil {
			return err
		}

		return nil
	})
	if err != nil {
		return 500, nil, fmt.Errorf("用户创建失败: %w", err)
	}

	// 删除 Redis 中的 bind token，防止重复使用
	_ = database.Redis.Del(ctx, key).Err()

	// 生成我方 access token + refresh token
	accessToken, err := utils.GenerateAccessToken(int(newUser.ID), newUser.Username, newUser.Role)
	if err != nil {
		return 500, nil, fmt.Errorf("生成 access token 失败: %w", err)
	}
	refreshToken, maxAge, err := utils.GenerateRefreshToken(int(newUser.ID), newUser.Username, newUser.Role)
	if err != nil {
		return 500, nil, fmt.Errorf("生成 refresh token 失败: %w", err)
	}
	// 使用通用的 cookie helper，确保 SameSite 和 Secure 正确设置
	utils.SetRefreshCookie(c.Writer, refreshToken, maxAge)

	// 异步更新登录信息
	ip := c.ClientIP()
	go func(userID int64, ip string) {
		err := UpdateLoginInfo(userID, ip)
		if err != nil {
			log.Printf("更新登录信息失败: %v", err)
		}
	}(newUser.ID, ip)

	return 200, &LoginResult{AccessToken: accessToken}, nil
}

func (s *Suser) Bind(bindToken, username, password string, c *gin.Context) (int, *LoginResult, error) {
	// 从 Redis 获取 bindToken 对应的数据
	ctx := context.Background()
	key := "oauth:bind:" + bindToken
	val, err := database.Redis.Get(ctx, key).Result()
	if err != nil {
		return 400, nil, fmt.Errorf("无效或已过期的 bind_token")
	}

	var data map[string]any
	if err := json.Unmarshal([]byte(val), &data); err != nil {
		return 500, nil, fmt.Errorf("解析 bind 数据失败: %w", err)
	}

	// Trim 并校验输入，防止空字符串导致 WHERE username = ''
	username = strings.TrimSpace(username)
	if username == "" {
		return 400, nil, fmt.Errorf("用户名或邮箱不能为空")
	}

	var user model.User
	// 修正：如果传入的是邮箱，应按邮箱查询；否则按用户名查询。
	if utils.IsEmailValid(username) {
		err = database.DB.Where("email = ?", username).First(&user).Error
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return 400, nil, fmt.Errorf("用户不存在")
			}
			return 500, nil, fmt.Errorf("查询失败: %w", err)
		}
	} else {
		err = database.DB.Where("username = ?", username).First(&user).Error
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return 400, nil, fmt.Errorf("用户不存在")
			}
			return 500, nil, fmt.Errorf("查询失败: %w", err)
		}
	}
	if !utils.CheckPasswordHash(password, user.Password) {
		return 400, nil, fmt.Errorf("密码错误")
	}

	// 仅更新 provider / provider_id 字段，避免意外更新用户其他字段
	upd := map[string]any{}
	if p, ok := data["provider"].(string); ok && p != "" {
		upd["provider"] = p
	}
	if pid, ok := data["providerId"].(string); ok && pid != "" {
		upd["provider_id"] = pid
	}
	if len(upd) > 0 {
		if err := database.DB.Model(&model.User{}).Where("id = ?", user.ID).Updates(upd).Error; err != nil {
			return 500, nil, fmt.Errorf("绑定失败: %w", err)
		}
	}

	// 删除 Redis 中的 bind token，防止重复使用
	_ = database.Redis.Del(ctx, key).Err()
	// 生成我方 access token + refresh token
	accessToken, err := utils.GenerateAccessToken(int(user.ID), user.Username, user.Role)
	if err != nil {
		return 500, nil, fmt.Errorf("生成 access token 失败: %w", err)
	}
	refreshToken, maxAge, err := utils.GenerateRefreshToken(int(user.ID), user.Username, user.Role)
	if err != nil {
		return 500, nil, fmt.Errorf("生成 refresh token 失败: %w", err)
	}
	// 使用通用的 cookie helper，确保 SameSite 和 Secure 正确设置
	utils.SetRefreshCookie(c.Writer, refreshToken, maxAge)

	// 异步更新登录信息
	ip := c.ClientIP()
	go func(userID int64, ip string) {
		err := UpdateLoginInfo(userID, ip)
		if err != nil {
			log.Printf("更新登录信息失败: %v", err)
		}
	}(user.ID, ip)

	return 200, &LoginResult{AccessToken: accessToken}, nil

}
