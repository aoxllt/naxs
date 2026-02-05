/*
 * @Author: xel
 * @Date: 2026-02-04 15:38:36
 * @LastEditors: xel
 * @LastEditTime: 2026-02-04 17:25:20
 * @FilePath: \api\internal\gateway\handler\user\login.go
 * @Description:
 */

package user

import (
	userservice "api/internal/services/user"
	"api/internal/shared/common"
	"api/pkg/utils"
	"log"

	"github.com/gin-gonic/gin"
)

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func LoginController(c *gin.Context) {
	var req LoginRequest
	var services userservice.IUser = &userservice.Suser{}
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Err(c, "参数错误")
		return
	}

	var code int
	var result *userservice.LoginResult
	var err error

	if utils.IsEmailValid(req.Username) {
		code, result, err = services.LoginWithEmail(req.Username, req.Password, c)
	} else {
		code, result, err = services.LoginWithUsername(req.Username, req.Password, c)
	}

	switch code {
	case 200:
		common.Ok(c, "登录成功", result)
	case 400:
		common.Err(c, "用户名或密码错误")
	case 500:
		common.ServerErr(c, "服务器错误")
		log.Println(err)
	default:
		common.ServerErr(c, "登录失败，请稍后重试")
	}
}
