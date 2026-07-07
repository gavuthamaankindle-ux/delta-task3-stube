package database

import (
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

func Dbinstance() *mongo.Client {
	err := godotenv.Load(".env")
	if err != nil {
		log.Println("error loading .env file")
	}

	Mongo := os.Getenv("MONGO_URI")
	if Mongo == "" {
		log.Fatal("mongo uri not declared")
	}

	clientOptions := options.Client().ApplyURI(Mongo)

	client, err := mongo.Connect(clientOptions)
	if err != nil {
		return nil
	}

	return client

}

func Opencollection(collectionName string, client *mongo.Client) *mongo.Collection {
	err := godotenv.Load(".env")
	if err != nil {
		log.Println("Error loading .env file")
	}
	databaseName := os.Getenv("DATABASE_NAME")
	fmt.Println("Database Name: ", databaseName)
	collection := client.Database(databaseName).Collection(collectionName)
	if collection == nil {
		return nil
	}
	return collection

}
