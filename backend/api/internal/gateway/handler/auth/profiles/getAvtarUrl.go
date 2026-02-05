/*
 * @Author: xel
 * @Date: 2026-02-04 18:21:32
 * @LastEditors: xel
 * @LastEditTime: 2026-02-04 18:36:49
 * @FilePath: \api\internal\gateway\handler\user\getAvtarUrl.go
 * @Description:
 */
package profiles

import (
	userservice "api/internal/services/user"
	"api/internal/shared/common"
	"api/pkg/utils"
	"log"
	"strings"

	"github.com/gin-gonic/gin"
)

func GetAvtarUrlController(c *gin.Context) {
	// 从 Authorization header 获取 token
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		c.JSON(401, gin.H{"code": 1, "msg": "未提供认证信息"})
		return
	}

	// 解析 Bearer token
	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || parts[0] != "Bearer" {
		c.JSON(401, gin.H{"code": 1, "msg": "认证格式错误"})
		return
	}

	claims, err := utils.ValidateAccessToken(parts[1])
	if err != nil {
		c.JSON(401, gin.H{"code": 1, "msg": "token无效或已过期"})
		return
	}

	var services userservice.IUser = &userservice.Suser{}
	code, url, err := services.GetAvtarUrl(*claims)
	switch code {
	case 200:
		common.Ok(c, "获取成功", gin.H{"avatarUrl": url})
	case 400:
		common.Err(c, "用户不存在")
	default:
		common.ServerErr(c, "获取失败")
		if err != nil {
			log.Println(err)
		}
	}
}
