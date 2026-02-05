package utils

import (
	"net/http"
	"strings"
	"time"

	"api/config"
)

// SetRefreshCookie 在响应中设置 HttpOnly 的 refresh token cookie
// If running in dev (non-HTTPS), we set SameSite=Lax to avoid browser rejection of SameSite=None without Secure.
func SetRefreshCookie(w http.ResponseWriter, token string, maxAge int) {
	cfg := config.GetConfig()
	secure := true
	if strings.ToLower(cfg.App.Env) == "dev" || cfg.App.Env == "" {
		secure = false
	}
	cookie := &http.Cookie{
		Name:     "refreshToken",
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		Secure:   secure,
		MaxAge:   maxAge,
		Expires:  time.Now().Add(time.Duration(maxAge) * time.Second),
	}
	// Only set SameSite=None when cookie is secure (browser requires this)
	if secure {
		cookie.SameSite = http.SameSiteNoneMode
	} else {
		cookie.SameSite = http.SameSiteLaxMode
	}
	http.SetCookie(w, cookie)
}

// ClearRefreshCookie 清除 refresh token
func ClearRefreshCookie(w http.ResponseWriter) {
	cfg := config.GetConfig()
	secure := true
	if strings.ToLower(cfg.App.Env) == "dev" || cfg.App.Env == "" {
		secure = false
	}
	cookie := &http.Cookie{
		Name:     "refreshToken",
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   secure,
		MaxAge:   -1,
		Expires:  time.Unix(0, 0),
	}
	if secure {
		cookie.SameSite = http.SameSiteNoneMode
	} else {
		cookie.SameSite = http.SameSiteLaxMode
	}
	http.SetCookie(w, cookie)
}
