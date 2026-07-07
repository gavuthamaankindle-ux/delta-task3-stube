package controllers

import (
	"context"
	"fmt"
	"net/http"
	"server/database"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

type User struct {
	UserID    string `json:"user_id"    bson:"user_id"`
	FirstName string `json:"first_name" bson:"first_name"`
	LastName  string `json:"last_name"  bson:"last_name"`
	Email     string `json:"email"      bson:"email"`
	Role      string `json:"role"       bson:"role"`
}

func Getusers(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {

		collection := database.Opencollection("users", client)

		// Use the request context instead of a detached background block
		ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
		defer cancel()

		var users []User // Ensure this references your updated struct with bson tags

		cursor, err := collection.Find(ctx, bson.M{})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database query failed: " + err.Error()})
			return
		}
		defer cursor.Close(ctx)

		if err = cursor.All(ctx, &users); err != nil {
			fmt.Printf("Decoder Error details: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse the user data payload"})
			return
		}

		fmt.Printf("Documents successfully fetched from MongoDB: %d\n", len(users))
		c.JSON(http.StatusOK, users)
	}
}

func BanUser(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {

		userID := c.Param("id")
		collection := database.Opencollection("users", client)
		ctx, cancel := context.WithTimeout(context.Background(), 100*time.Second)
		defer cancel()

		update := bson.M{"$set": bson.M{"role": "BANNED"}}
		result, err := collection.UpdateOne(ctx, bson.M{"user_id": userID}, update)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		if result.MatchedCount == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "User banned successfully"})
	}
}

func UnBanUser(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {

		userID := c.Param("id")
		collection := database.Opencollection("users", client)
		ctx, cancel := context.WithTimeout(context.Background(), 100*time.Second)
		defer cancel()

		update := bson.M{"$set": bson.M{"role": "USER"}}
		result, err := collection.UpdateOne(ctx, bson.M{"user_id": userID}, update)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		if result.MatchedCount == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "User unbanned successfully"})
	}
}
