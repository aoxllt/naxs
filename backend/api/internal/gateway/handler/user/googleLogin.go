package user

import (
	"crypto/rand"
	"encoding/base64"
	"net/http"

	"api/config"

	"github.com/gin-gonic/gin"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

func GoogleUrlController(c *gin.Context) {
	cfg := config.GetConfig()

	// 从配置中读取 Google OAuth 参数
	clientID := cfg.OAuth.Google.ClientID
	clientSecret := cfg.OAuth.Google.ClientSecret
	redirectURL := cfg.OAuth.Google.RedirectURL

	scopes := cfg.OAuth.Google.Scopes
	if len(scopes) == 0 {
		scopes = []string{"openid", "profile", "email"}
	}

	oauthCfg := &oauth2.Config{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		RedirectURL:  redirectURL,
		Scopes:       scopes,
		Endpoint:     google.Endpoint,
	}

	// 生成随机 state 并设置到 cookie，后续回调用于验证
	state, err := generateState()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": 1, "error": "failed to generate state"})
		return
	}
	// cookie 有效期 1 小时，根据需要调整
	c.SetCookie("oauthstate", state, 3600, "/", "", true, true)

	// 生成授权 URL 并返回
	authURL := oauthCfg.AuthCodeURL(state, oauth2.AccessTypeOffline)
	c.JSON(http.StatusOK, gin.H{"code": 0, "url": authURL})
}

// 生成安全的随机 state 字符串
func generateState() (string, error) {
	b := make([]byte, 16)
	_, err := rand.Read(b)
	if err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(b), nil
}
