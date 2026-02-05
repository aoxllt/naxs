/*
 * @Author: xel
 * @Date: 2026-02-04 13:17:00
 * @LastEditors: xel
 * @LastEditTime: 2026-02-04 13:17:14
 * @FilePath: \api\pkg\utils\hashPassword.go
 * @Description: 
 */

 package utils


 import "golang.org/x/crypto/bcrypt"

 func HashPassword(password string) (string, error) {
	hashedBytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hashedBytes), nil
}

func CheckPasswordHash(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}