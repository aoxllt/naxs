/*
 * @Author: xel
 * @Date: 2026-02-04 15:49:57
 * @LastEditors: xel
 * @LastEditTime: 2026-02-04 17:00:00
 * @FilePath: \api\pkg\utils\jwt.go
 * @Description:
 */

package utils

import (
	"api/config"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// TokenType 区分 access 和 refresh token
type TokenType string

const (
	AccessToken  TokenType = "access"
	RefreshToken TokenType = "refresh"
)

// CustomClaims JWT claims 结构
type CustomClaims struct {
	UserID    int       `json:"userId"`
	Username  string    `json:"username"`
	Role      string    `json:"role"`
	TokenType TokenType `json:"tokenType"`
	jwt.RegisteredClaims
}

// GenerateAccessToken 生成 access token
func GenerateAccessToken(userId int, username string, userRole string) (string, error) {
	cfg := config.GetConfig()

	accessExpire, err := time.ParseDuration(cfg.Auth.JWT.AccessExpire)
	if err != nil {
		accessExpire = 15 * time.Minute
	}

	now := time.Now()
	claims := CustomClaims{
		UserID:    userId,
		Username:  username,
		Role:      userRole,
		TokenType: AccessToken,
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(accessExpire)),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(cfg.Auth.JWT.Secret))
}

// GenerateRefreshToken 生成 refresh token
func GenerateRefreshToken(userId int, username string, userRole string) (string, int, error) {
	cfg := config.GetConfig()

	refreshExpire, err := time.ParseDuration(cfg.Auth.JWT.RefreshExpire)
	if err != nil {
		refreshExpire = 30 * 24 * time.Hour
	}

	now := time.Now()
	claims := CustomClaims{
		UserID:    userId,
		Username:  username,
		Role:      userRole,
		TokenType: RefreshToken,
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(refreshExpire)),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(cfg.Auth.JWT.Secret))
	if err != nil {
		return "", 0, err
	}

	// 返回秒数用于设置 cookie MaxAge
	return signed, int(refreshExpire.Seconds()), nil
}

// ParseJWT 解析并验证 JWT
func ParseJWT(tokenString string) (*CustomClaims, error) {
	cfg := config.GetConfig()
	token, err := jwt.ParseWithClaims(tokenString, &CustomClaims{}, func(token *jwt.Token) (interface{}, error) {
		return []byte(cfg.Auth.JWT.Secret), nil
	})
	if err != nil {
		return nil, err
	}
	if claims, ok := token.Claims.(*CustomClaims); ok && token.Valid {
		return claims, nil
	}
	return nil, jwt.ErrTokenInvalidClaims
}

// ValidateAccessToken 验证 access token
func ValidateAccessToken(tokenStr string) (*CustomClaims, error) {
	claims, err := ParseJWT(tokenStr)
	if err != nil {
		return nil, err
	}
	if claims.TokenType != AccessToken {
		return nil, errors.New("invalid token type: expected access token")
	}
	return claims, nil
}

// ValidateRefreshToken 验证 refresh token
func ValidateRefreshToken(tokenStr string) (*CustomClaims, error) {
	claims, err := ParseJWT(tokenStr)
	if err != nil {
		return nil, err
	}
	if claims.TokenType != RefreshToken {
		return nil, errors.New("invalid token type: expected refresh token")
	}
	return claims, nil
}
