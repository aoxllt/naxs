/*
 * @Author: xel
 * @Date: 2026-02-03 17:29:48
 * @LastEditors: xel
 * @LastEditTime: 2026-02-03 22:32:34
 * @FilePath: \api\internal\gateway\handler\user\sendCode.go
 * @Description:
 */

package user

import (
	userservice "api/internal/services/user"
	"api/internal/shared/common"
	"api/pkg/utils"

	"github.com/gin-gonic/gin"
)

type SendCodeRequest struct {
	Email string `json:"email" `
}

func SendCodeController(c *gin.Context) {
	var req SendCodeRequest

	var userSvc userservice.IUser = userservice.IUser(&userservice.Suser{})
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Err(c, "参数解析错误")
		return
	}

	if !utils.IsEmailValid(req.Email) {
		common.Err(c, "邮箱格式不正确")
		return
	}

	if err := userSvc.SendCode(req.Email); err != nil {
		common.Err(c, "发送验证码失败")
		return
	}

	common.OkMsg(c, "验证码发送成功")

}
