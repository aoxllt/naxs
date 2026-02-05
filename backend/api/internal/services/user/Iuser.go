/*
 * @Author: xel
 * @Date: 2026-02-03 18:24:08
 * @LastEditors: xel
 * @LastEditTime: 2026-02-04 12:40:20
 * @FilePath: \api\internal\services\user\Iuser.go
 * @Description:
 */

package userservice

import (
	"api/pkg/utils"

	"github.com/gin-gonic/gin"
)

// LoginResult 登录结果
type LoginResult struct {
	AccessToken string `json:"accessToken"`
}

type IUser interface {
	SendCode(email string) error
	CheckUsername(username string) (int, error)
	Register(username, email, password, captcha, inviteCode string) (int, error)
	LoginWithUsername(username, password string, c *gin.Context) (int, *LoginResult, error)
	LoginWithEmail(email, password string, c *gin.Context) (int, *LoginResult, error)
	GetAvtarUrl(utils.CustomClaims) (int, string, error)
	GoogleCallback(code string, c *gin.Context) (int, *LoginResult, map[string]any, error)
	RegisterWithBind(bindToken, username, password, email string, c *gin.Context) (int, *LoginResult, error)
	Bind(bindToken, username, password string, c *gin.Context) (int, *LoginResult, error)
}
