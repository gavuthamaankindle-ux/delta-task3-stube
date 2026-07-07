package routes

import (
	"server/middleware"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

func ProtectedRoutes(router *gin.Engine, client *mongo.Client) {
	router.Use(middleware.AuthMiddleWare())

	 
	router.PATCH("/video/:id/like", controllers.Addlikes(client))
	router.PATCH("/video/:id/removelike", controllers.Removelikes(client))
	router.POST("/video/request-upload", controllers.RequestVideoUpload(client))
	router.GET("/video/:id", controllers.Getvideo(client))
	router.PATCH("/channel/:id/subscribe", controllers.Subscribe(client))
	router.GET("/ban-user/:id", controllers.BanUser(client))
	router.GET("/users", controllers.Getusers(client))
	router.POST("/unban-user/:id", controllers.UnBanUser(client))
	router.GET("/video/:id", controllers.Getvideo(client))
	router.GET("/channel/:channelid", controllers.GetVideosByChannel(client))
	router.PATCH("/video/:id/addcomment", controllers.Addcomment(client))
}
