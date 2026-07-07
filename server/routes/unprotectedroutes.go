package routes

import (
	"server/controllers"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

func UnprotectedRoutes(router *gin.Engine, client *mongo.Client) {
	router.PATCH("/video/:id/addcomment", controllers.Addcomment(client))
	router.GET("/videos", controllers.Getvideos(client))
	router.POST("/logout", controllers.Logout(client))
	router.POST("/login", controllers.Login(client))
	router.POST("/register", controllers.Register(client))
	router.PATCH("/video/:id/like", controllers.Addlikes(client))
	router.PATCH("/video/:id/removelike", controllers.Removelikes(client))
	router.GET("/channel/:channelid", controllers.GetVideosByChannel(client))
	router.POST("/forgot-password", controllers.ForgotPassword(client))
	router.POST("/reset-password", controllers.ResetPassword(client))
	router.PATCH("/subscribe", controllers.Subscribe(client))
	router.PATCH("/unsubscribe", controllers.Unsubscribe(client))
	router.GET("/auth/google/login", controllers.GoogleLogin)
	router.GET("/auth/google/callback", controllers.GoogleCallback(client))
	router.POST("/video/request-upload", controllers.RequestVideoUpload(client))
	router.GET("/video/:id", controllers.Getvideo(client))
	router.PATCH("/channel/:id/subscribe", controllers.Subscribe(client))
	router.GET("/ban-user/:id", controllers.BanUser(client))
	router.GET("/users", controllers.Getusers(client))
	router.POST("/unban-user/:id", controllers.UnBanUser(client))
}
