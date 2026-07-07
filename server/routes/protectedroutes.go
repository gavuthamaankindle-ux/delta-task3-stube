package routes

import (
	"server/middleware"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

func ProtectedRoutes(router *gin.Engine, client *mongo.Client) {
	router.Use(middleware.AuthMiddleWare())

	 router.GET("/video/:id", controllers.Getvideo(client))
	 router.PATCH("/video/:id/like", controllers.Addlikes(client))
	 router.PATCH("/video/:id/removelike", controllers.Removelikes(client))
     router.PATCH("/video/:id/addcomment", controllers.Addcomment(client))
	 router.GET("/channel/:channelid", controllers.GetVideosByChannel(client))
}
