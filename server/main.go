package main

import (
	"fmt"
	"net/http"
	"server/database"
	"server/routes"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

func main() {
	router := gin.Default()

	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Asbestos-Token", "X-Aura-Key", "X-Marine-Version"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	var client *mongo.Client = database.Dbinstance()

	routes.UnprotectedRoutes(router, client)
	routes.ProtectedRoutes(router, client)
	// router.GET("hello", show)
	// router.GET("videos", controllers.Getvideos(client))
	// router.GET("video/:id", controllers.Getvideo(client))
	// router.POST("login", controllers.Login(client))
	// router.POST("register", controllers.Register(client))
	router.Run(":8081")

}

func show(c *gin.Context) {
	fmt.Println("helloworld")
	c.JSON(http.StatusOK, gin.H{
		"message": "helloworld",
	})
}

//securepassword123
// {
//     "email": "craigdenton@hotmail.com",
//     "password": "pass121212"
//   }
