/*
 * @Author: xel
 * @Date: 2026-02-04 17:28:19
 * @LastEditors: xel
 * @LastEditTime: 2026-02-04 17:28:22
 * @FilePath: \api\internal\gateway\handler\auth\refresh.go
 * @Description:
 */
package auth

import (
	"api/internal/shared/common"
	"api/pkg/utils"

	"github.com/gin-gonic/gin"
)

// RefreshController 刷新 access token
func RefreshController(c *gin.Context) {
	// 从 HttpOnly Cookie 获取 refreshToken
	refreshToken, err := c.Cookie("refreshToken")
	if err != nil {
		c.JSON(401, gin.H{"code": 1, "msg": "refreshToken不存在，请重新登录"})
		return
	}

	// 验证 refresh token
	claims, err := utils.ValidateRefreshToken(refreshToken)
	if err != nil {
		// 清除无效的 cookie
		utils.ClearRefreshCookie(c.Writer)
		c.JSON(401, gin.H{"code": 1, "msg": "refreshToken已过期，请重新登录"})
		return
	}

	// 生成新的 access token
	accessToken, err := utils.GenerateAccessToken(claims.UserID, claims.Username, claims.Role)
	if err != nil {
		common.ServerErr(c, "生成token失败")
		return
	}

	// 轮换 refresh token（可选，更安全）
	newRefreshToken, maxAge, err := utils.GenerateRefreshToken(claims.UserID, claims.Username, claims.Role)
	if err != nil {
		common.ServerErr(c, "生成token失败")
		return
	}
	utils.SetRefreshCookie(c.Writer, newRefreshToken, maxAge)

	common.Ok(c, "刷新成功", gin.H{"accessToken": accessToken})
}
