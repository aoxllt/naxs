/*
 * @Author: xel
 * @Date: 2026-02-03 17:43:27
 * @LastEditors: xel
 * @LastEditTime: 2026-02-03 17:44:14
 * @FilePath: \api\internal\shared\common\respone.go
 * @Description:
 */

package common

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type Response struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Data    any    `json:"data,omitempty"`
}

func Ok(c *gin.Context, msg string, data any) {
	c.JSON(http.StatusOK, &Response{
		Code:    0,
		Message: msg,
		Data:    data,
	})
}

func OkMsg(c *gin.Context, msg string) {
	c.JSON(http.StatusOK, &Response{
		Code:    0,
		Message: msg,
	})
}

func OkData(c *gin.Context, data any) {
	c.JSON(http.StatusOK, &Response{
		Code: 0,
		Data: data,
	})
}

func Fail(c *gin.Context, msg string) {
	c.JSON(http.StatusOK, &Response{
		Code:    1,	
		Message: msg,
	})
} 

func Err(c *gin.Context, msg string) {
	c.JSON(http.StatusBadRequest, &Response{
		Code:    1,
		Message: msg,
	})
}

func ServerErr(c *gin.Context, msg string) {
	c.JSON(http.StatusInternalServerError, &Response{
		Code:    1,
		Message: msg,
	})
}
