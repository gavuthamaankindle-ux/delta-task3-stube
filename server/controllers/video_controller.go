package controllers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"server/database"
	"server/model"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

func Getvideos(client *mongo.Client) gin.HandlerFunc {
	videocollection := database.Opencollection("video", client)

	return func(c *gin.Context) {

		ctx, cancel := context.WithTimeout(context.Background(), 100*time.Second)
		defer cancel()

		var videos []model.Video

		cursor, err := videocollection.Find(ctx, bson.M{})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		defer cursor.Close(ctx)

		if err = cursor.All(ctx, &videos); err != nil {
			fmt.Printf("Decoder Error details: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to parse the movie data"})
			return
		}
		fmt.Printf("Documents successfully fetched from MongoDB: %d\n", len(videos))
		c.JSON(http.StatusOK, videos)

	}
}

func Getvideo(client *mongo.Client) gin.HandlerFunc {
	videocollection := database.Opencollection("video", client)

	return func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		id := c.Param("id")
		if id == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid video ID format"})
			return
		}

		filter := bson.M{"_id": id}

		var video model.Video

		errs := videocollection.FindOne(ctx, filter).Decode(&video)
		if errs != nil {
			if errs == mongo.ErrNoDocuments {
				c.JSON(http.StatusNotFound, gin.H{"error": "Video not found", "errDetails": errs.Error()})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": errs.Error()})
			return
		}

		update := bson.M{"$inc": bson.M{"views": 1}}

		bgCtx, bgCancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer bgCancel()
		_, _ = videocollection.UpdateOne(bgCtx, filter, update)

		c.JSON(http.StatusOK, video)
	}
}

func Addcomment(client *mongo.Client) gin.HandlerFunc {
	videocollection := database.Opencollection("video", client)
	return func(c *gin.Context) {

		videoIdstr := c.Param("id")

		if videoIdstr == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid video_id parameter"})
			return
		}

		var input struct {
			Comment string `json:"comment" binding:"required"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input data"})
			return
		}

		newComment := model.Comment{
			ID:         primitive.NewObjectID().Hex(),
			Content:    input.Comment,
			UploadDate: time.Now(),
		}

		filter := bson.M{"_id": videoIdstr}
		update := bson.M{"$push": bson.M{"Comments": newComment}}

		ctx, cancel := context.WithTimeout(context.Background(), 100*time.Second)
		defer cancel()

		result, err := videocollection.UpdateOne(ctx, filter, update)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add comment"})
			return
		}

		if result.MatchedCount == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "Video not found"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Comment added successfully"})
	}
}

type UploadRequestPayload struct {
	Filename          string `json:"filename"`
	ThumbnailFilename string `json:"thumbnail_filename"`
	Descrip           string `json:"descrip"`
	UserID            string `json:"user_id"`
	UserName          string `json:"user_name"`
}

// Fixed Internal helper for fetching signed asset upload target paths from Supabase
func getSupabaseSignedPath(supabaseURL, supabaseKey, bucketName, uniquePath string) (string, error) {
	// Sanitize base URL to prevent double slashes
	baseURL := strings.TrimSuffix(supabaseURL, "/")
	signEndpoint := fmt.Sprintf("%s/storage/v1/object/upload/sign/%s/%s", baseURL, bucketName, uniquePath)

	payloadData := map[string]int{"expires_in": 900}
	jsonBytes, _ := json.Marshal(payloadData)

	req, err := http.NewRequest("POST", signEndpoint, bytes.NewBuffer(jsonBytes))
	if err != nil {
		return "", err
	}

	//  Added mandatory api... key header required by Supabase's Kong Gateway
	req.Header.Set("Authorization", "Bearer "+supabaseKey)
	req.Header.Set("apikey", supabaseKey)
	req.Header.Set("Content-Type", "application/json")

	httpClient := &http.Client{Timeout: 10 * time.Second}
	resp, err := httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("supabase returned status code %d", resp.StatusCode)
	}

	var supabaseSigResponse struct {
		URL string `json:"url"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&supabaseSigResponse); err != nil {
		return "", err
	}
	return supabaseSigResponse.URL, nil
}

func RequestVideoUpload(client *mongo.Client) gin.HandlerFunc {
	// Ensure your helper package matches where "Opencollection" lives
	videoCollection := database.Opencollection("video", client)

	return func(c *gin.Context) {
		var reqBody UploadRequestPayload
		if err := c.ShouldBindJSON(&reqBody); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body parameters"})
			return
		}

		// uploadedBy, _ := reqBody.
		// uploadedByID, _ := c.Get("user_id")
		// if uploadedByID == nil {
		// 	uploadedByID = "anonymous_dev_user"
		// }
		// if uploadedBy == nil {
		// 	uploadedBy = "Dev Operator"
		// }

		supabaseURL := os.Getenv("SUPABASE_URL")
		supabaseKey := os.Getenv("SUPABASE_KEY")
		bucketName := os.Getenv("SUPABASE_BUCKET")

		if supabaseURL == "" || supabaseKey == "" || bucketName == "" {
			log.Println("[ERROR] Missing required Supabase environment variables")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Server configuration error"})
			return
		}

		// 1. Process Video Storage Pathing
		videoExt := filepath.Ext(reqBody.Filename)
		uniqueVideoPath := uuid.New().String() + videoExt
		videoSignURL, err := getSupabaseSignedPath(supabaseURL, supabaseKey, bucketName, uniqueVideoPath)
		if err != nil {
			log.Printf("[ERROR] Video lease failed: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to lease video upload window: " + err.Error()})
			return
		}

		// 2. Process Thumbnail Storage Pathing
		thumbExt := filepath.Ext(reqBody.ThumbnailFilename)
		if thumbExt == "" {
			thumbExt = ".png"
		}
		uniqueThumbPath := "thumbnails/" + uuid.New().String() + thumbExt
		thumbSignURL, err := getSupabaseSignedPath(supabaseURL, supabaseKey, bucketName, uniqueThumbPath)
		if err != nil {
			log.Printf("[ERROR] Thumbnail lease failed: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to lease thumbnail upload window: " + err.Error()})
			return
		}

		cleanBaseURL := strings.TrimSuffix(supabaseURL, "/")
		publicVideoURL := fmt.Sprintf("%s/storage/v1/object/public/%s/%s", cleanBaseURL, bucketName, uniqueVideoPath)
		publicThumbURL := fmt.Sprintf("%s/storage/v1/object/public/%s/%s", cleanBaseURL, bucketName, uniqueThumbPath)

		// 3. Hydrate explicit nested structure layouts cleanly
		newVideoID := bson.NewObjectID()
		videoMetadata := model.Video{
			ID:         uuid.New().String(),
			Descrip:    reqBody.Descrip,
			UploadDate: time.Now(),
			Views:      0,
			Likes:      0,
			Url: model.Url{
				Thumbnail: publicThumbURL,
				VideoUrl:  publicVideoURL,
			},
			Uploadedby:   reqBody.UserName,
			Uploadedbyid: reqBody.UserID,
			Comments:     []model.Comment{},
		}

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		_, err = videoCollection.InsertOne(ctx, videoMetadata)
		if err != nil {
			log.Printf("[ERROR] MongoDB Write Failed: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record video metadata"})
			return
		}

		// 4. Return links to your React UI
		finalVideoURL := videoSignURL
		if !strings.HasPrefix(videoSignURL, "http") {
			if strings.HasPrefix(videoSignURL, "/object") {
				finalVideoURL = cleanBaseURL + "/storage/v1" + videoSignURL
			} else {
				finalVideoURL = cleanBaseURL + videoSignURL
			}
		}

		finalThumbURL := thumbSignURL
		if !strings.HasPrefix(thumbSignURL, "http") {
			if strings.HasPrefix(thumbSignURL, "/object") {
				finalThumbURL = cleanBaseURL + "/storage/v1" + thumbSignURL
			} else {
				finalThumbURL = cleanBaseURL + thumbSignURL
			}
		}

		c.JSON(http.StatusOK, gin.H{
			"uploadUrl":    finalVideoURL,
			"thumbnailUrl": finalThumbURL,
			"videoId":      newVideoID.Hex(),
		})
	}
}

func Addlikes(client *mongo.Client) gin.HandlerFunc {
	videocollection := database.Opencollection("video", client)
	return func(c *gin.Context) {
		videoIdstr := c.Param("id")

		if videoIdstr == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid video_id parameter"})
			return
		}

		filter := bson.M{"_id": videoIdstr}
		update := bson.M{"$inc": bson.M{"likes": 1}}

		ctx, cancel := context.WithTimeout(context.Background(), 100*time.Second)
		defer cancel()

		result, err := videocollection.UpdateOne(ctx, filter, update)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add like"})
			return
		}

		if result.MatchedCount == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "Video not found"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Like added successfully"})
	}
}

func Removelikes(client *mongo.Client) gin.HandlerFunc {
	videocollection := database.Opencollection("video", client)
	return func(c *gin.Context) {
		videoIdstr := c.Param("id")

		if videoIdstr == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid video_id parameter"})
			return
		}

		filter := bson.M{"_id": videoIdstr}
		update := bson.M{"$inc": bson.M{"likes": -1}}

		ctx, cancel := context.WithTimeout(context.Background(), 100*time.Second)
		defer cancel()

		result, err := videocollection.UpdateOne(ctx, filter, update)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove like"})
			return
		}

		if result.MatchedCount == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "Video not found"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Like removed successfully"})
	}
}

func GetVideosByChannel(client *mongo.Client) gin.HandlerFunc {
	videocollection := database.Opencollection("video", client)
	return func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		channelid := c.Param("channelid")
		if channelid == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "channelid parameter is required"})
			return
		}

		videos := []model.Video{}

		cursor, err := videocollection.Find(ctx, bson.M{"uploadedbyid": channelid})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query channel videos"})
			return
		}
		defer cursor.Close(ctx)
		if err := cursor.All(ctx, &videos); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode channel videos"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"videos": videos})
	}
}
