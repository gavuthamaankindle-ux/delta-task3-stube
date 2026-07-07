package routes

import (
	"server/controllers"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

func UnprotectedRoutes(router *gin.Engine, client *mongo.Client) {
	router.GET("/videos", controllers.Getvideos(client))
	router.POST("/logout", controllers.Logout(client))
	router.POST("/login", controllers.Login(client))
	router.POST("/register", controllers.Register(client))
	router.POST("/forgot-password", controllers.ForgotPassword(client))
	router.POST("/reset-password", controllers.ResetPassword(client))
	
	router.GET("/auth/google/login", controllers.GoogleLogin)
	router.GET("/auth/google/callback", controllers.GoogleCallback(client))
}
