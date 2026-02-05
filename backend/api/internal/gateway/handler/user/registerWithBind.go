package user

import (
	userservice "api/internal/services/user"
	"api/internal/shared/common"
	"api/pkg/utils"
	"log"

	"github.com/gin-gonic/gin"
)

type RegisterWithBindRequest struct {
	BindToken string `json:"bindToken"`
	Username  string `json:"username"`
	Password  string `json:"password"`
	Email     string `json:"email"`
}

func RegisterWithBindController(c *gin.Context) {
	var req RegisterWithBindRequest
	var userSvc userservice.IUser = &userservice.Suser{}
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Err(c, "参数解析错误")
		return
	}
	if len(req.Username) < 3 || len(req.Password) < 6 || req.BindToken == "" {
		common.Err(c, "参数错误")
		return
	}
	if req.Email != "" && !utils.IsEmailValid(req.Email) {
		common.Err(c, "邮箱格式不正确")
		return
	}

	status, result, err := userSvc.RegisterWithBind(req.BindToken, req.Username, req.Password, req.Email, c)
	if err != nil {
		log.Println(err)
	}
	switch status {
	case 200:
		common.Ok(c, "注册并绑定成功", result)
	case 400:
		common.Fail(c, "绑定或注册失败")
	case 500:
		common.ServerErr(c, "服务器错误")
	default:
		common.ServerErr(c, "注册失败")
	}
}
