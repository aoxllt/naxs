/*
 * @Author: xel
 * @Date: 2026-02-04 12:34:33
 * @LastEditors: xel
 * @LastEditTime: 2026-02-04 12:34:35
 * @FilePath: \api\internal\gateway\handler\user\register.go
 * @Description:
 */
package user

import (
	"api/internal/shared/common"
	"api/pkg/utils"
	"api/internal/services/user"

	"github.com/gin-gonic/gin"
)

type RegisterRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
	Captcha  string `json:"captcha"`
	InviteCode string `json:"inviteCode"`
}


func RegisterController(c *gin.Context) {
	var req RegisterRequest
	var services userservice.IUser = &userservice.Suser{}
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ServerErr(c,"参数解析错误")
		return
	}
	if len(req.Username)<3||len(req.Password)<6 || len(req.Captcha)!=6 || !utils.IsEmailValid(req.Email) {
		common.Err(c,"参数错误")
		return
	}

	status, err := services.Register(req.Username, req.Email, req.Password, req.Captcha, req.InviteCode)
	switch status {
	case 200:
		common.OkMsg(c, "注册成功")
	case 400:
		common.Fail(c, "注册失败，用户名或邮箱已存在")
	case 500:
		common.ServerErr(c, "服务器错误，稍后再尝试")
	default:
		common.ServerErr(c, err.Error())
	}
}