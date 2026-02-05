/*
 * @Author: xel
 * @Date: 2026-02-04 11:18:29
 * @LastEditors: xel
 * @LastEditTime: 2026-02-04 11:55:25
 * @FilePath: \api\internal\gateway\handler\user\checkUsername.go
 * @Description:
 */
package user

import (
	userservice "api/internal/services/user"
	"api/internal/shared/common"

	"github.com/gin-gonic/gin"
)

func CheckUsernameController(c *gin.Context) {
	var username string = c.Query("username")
	var userSvc userservice.IUser = &userservice.Suser{}
	if len(username) < 3 || len(username) > 20 {
		common.Err(c, "用户名非法")
		return
	}
	code, err := userSvc.CheckUsername(username)
	switch code {
	case 200:
		common.OkMsg(c, "用户名可用")
	case 400:
		common.Fail(c, "用户名已存在")
	case 500:
		common.ServerErr(c, "服务器错误，稍后再尝试")
	default:
		if err != nil {
			common.Err(c, err.Error())
			return
		}
		common.Err(c, "查询失败")
	}

}
