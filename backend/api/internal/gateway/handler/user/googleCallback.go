package user

import (
	"api/internal/services/database"
	svc "api/internal/services/user"
	"api/internal/shared/common"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"time"

	"github.com/gin-gonic/gin"
)

func GoogleCallbackController(c *gin.Context) {
	code := c.Query("code")
	if code == "" {
		common.Err(c, "missing code")
		return
	}

	status, result, data, err := (&svc.Suser{}).GoogleCallback(code, c)
	if err != nil {
		common.ServerErr(c, "服务器错误")
		return
	}

	frontend := "http://localhost:5173/oauth/callback"

	switch status {
	case 200:
		// 已绑定：服务端已设置 refreshToken cookie，直接重定向到前端成功页
		redirectURL := frontend + "?status=success&accessToken=" + url.QueryEscape(result.AccessToken)
		c.Redirect(http.StatusFound, redirectURL)
	case 400:
		// 未绑定：生成短期 bind_token，保存回调数据到 Redis，重定向带上 bind_token
		// 生成随机 token
		rb := make([]byte, 24)
		if _, err := rand.Read(rb); err != nil {
			common.ServerErr(c, "生成 bind token 失败")
			return
		}
		bindToken := hex.EncodeToString(rb)

		// 保存到 Redis，TTL 10 分钟
		ctx := context.Background()
		blob, _ := json.Marshal(data)
		if err := database.Redis.Set(ctx, "oauth:bind:"+bindToken, blob, 10*time.Minute).Err(); err != nil {
			common.ServerErr(c, "保存 bind token 失败")
			return
		}

		redirectURL := fmt.Sprintf("%s?bind_token=%s&bindRequired=1&avatar=%s&email=%s", frontend, url.QueryEscape(bindToken), url.QueryEscape(data["avatar"].(string)), url.QueryEscape(data["email"].(string)))
		c.Redirect(http.StatusFound, redirectURL)
	default:
		common.ServerErr(c, "回调处理失败")
	}
}
