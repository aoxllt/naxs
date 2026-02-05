package user

import (
	userservice "api/internal/services/user"
	"api/internal/shared/common"

	"github.com/gin-gonic/gin"
)

type OAuthBindInfoRequest struct {
	BindToken string `json:"bindToken"`
	Username  string `json:"username"`
	Password  string `json:"password"`
}

// OAuthBindInfoController 通过 bind_token 拉取临时保存在 Redis 的第三方回调数据
func OAuthBindInfoController(c *gin.Context) {
	var req OAuthBindInfoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Err(c, "参数解析错误")
		return
	}
	if req.BindToken == "" {
		common.Err(c, "参数错误")
		return
	}
	var userSvc userservice.IUser = &userservice.Suser{}
	status, result, err := userSvc.Bind(req.BindToken, req.Username, req.Password, c)
	if err != nil {
		common.ServerErr(c, "服务器错误")
		return
	}
	switch status {
	case 200:
		common.Ok(c, "绑定成功", result)
	case 400:
		common.Fail(c, "绑定失败")
	case 500:
		common.ServerErr(c, "服务器错误")
	default:
		common.ServerErr(c, "绑定失败")
	}

}
