package controllers

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"server/database"
	"server/model"
	"server/utils"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/v2/bson"

	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
	"golang.org/x/crypto/bcrypt"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

func hashpassword(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)

	if err != nil {
		return "", err
	}

	return string(hash), nil

}

func Register(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		var userdata model.User

		if err := c.ShouldBindJSON(&userdata); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input data"})
			return
		}

		if userdata.Role == "" {
			userdata.Role = "USER"
		}
		if userdata.Viewvideo == nil {
			userdata.Viewvideo = []string{}
		}
		if userdata.Subscribed == nil {
			userdata.Subscribed = []string{}
		}

		validate := validator.New()
		if err := validate.Struct(userdata); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Validation failed", "details": err.Error()})
			return
		}

		hashedPassword, err := hashpassword(userdata.Password)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "cannot hash the password"})
			return
		}

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		var userinfo *mongo.Collection = database.Opencollection("users", client)

		count, err := userinfo.CountDocuments(ctx, bson.D{{Key: "email", Value: userdata.Email}})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to check for duplicate"})
			return
		}
		if count > 0 {
			c.JSON(http.StatusConflict, gin.H{"error": "duplicate exist"})
			return
		}

		userdata.ID = bson.NewObjectID()
		userdata.UserID = userdata.ID.Hex()
		userdata.Password = hashedPassword
		userdata.CreatedAt = time.Now()
		userdata.UpdatedAt = time.Now()

		result, err := userinfo.InsertOne(ctx, userdata)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
			return
		}

		c.JSON(http.StatusCreated, result)
	}

}

func HandleUserSession(c *gin.Context, client *mongo.Client, foundUser model.User, isOAuth bool) {
	token, refreshToken, terr := utils.GenerateAllTokens(
		foundUser.FirstName,
		foundUser.LastName,
		foundUser.Email,
		foundUser.Role,
		foundUser.UserID,
	)
	if terr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate tokens"})
		return
	}

	if err := utils.UpdateAllTokens(foundUser.UserID, token, refreshToken, client); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update authentication tokens"})
		return
	}

	// --- Keep your Cookie code here ---
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     "access_token",
		Value:    token,
		Path:     "/",
		MaxAge:   86400,
		Secure:   false,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})

	http.SetCookie(c.Writer, &http.Cookie{
		Name:     "refresh_token",
		Value:    refreshToken,
		Path:     "/",
		MaxAge:   604800,
		Secure:   false,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})

	if isOAuth {
		// 🎯 FIX: Append all necessary data to the query string so React can grab it
		redirectURL := fmt.Sprintf(
			"http://localhost:5173/login?token=%s&user_id=%s&first_name=%s",
			url.QueryEscape(token),
			url.QueryEscape(foundUser.UserID),
			url.QueryEscape(foundUser.FirstName),
		)

		// 🎯 FIX: Changed to StatusFound (302) to prevent permanent browser caching bugs
		c.Redirect(http.StatusFound, redirectURL)
		return

	} else {
		// Standard credential login returns JSON normally
		c.JSON(http.StatusOK, model.UserResponse{
			UserId:       foundUser.UserID,
			FirstName:    foundUser.FirstName,
			LastName:     foundUser.LastName,
			Email:        foundUser.Email,
			Role:         foundUser.Role,
			Token:        token,
			RefreshToken: refreshToken,
		})
	}
}

var GoogleOauthConfig *oauth2.Config

// Helper function to safely ensure config is never nil
func ensureOauthConfig() {
	if GoogleOauthConfig == nil {
		GoogleOauthConfig = &oauth2.Config{
			RedirectURL:  "http://localhost:8081/auth/google/callback",
			ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
			ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
			Scopes:       []string{"https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile"},
			Endpoint:     google.Endpoint,
		}
	}
}

func InitOAuth() {
	ensureOauthConfig()
}

func Login(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		var user model.UserLogin

		if err := c.ShouldBindJSON(&user); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input data"})
			return
		}

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		var foundUser model.User
		userinfo := database.Opencollection("users", client)

		err := userinfo.FindOne(ctx, bson.D{{Key: "email", Value: user.Email}}).Decode(&foundUser)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
			return
		}

		perr := bcrypt.CompareHashAndPassword([]byte(foundUser.Password), []byte(user.Password))
		if perr != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
			return
		}

		HandleUserSession(c, client, foundUser, false)

	}
}

func GoogleLogin(c *gin.Context) {
	ensureOauthConfig() // 🎯 Prevents nil-pointer panic
	url := GoogleOauthConfig.AuthCodeURL("random_state_string")
	c.Redirect(http.StatusTemporaryRedirect, url)
}

func GoogleCallback(client *mongo.Client) gin.HandlerFunc {
	userCollection := database.Opencollection("users", client)
	return func(c *gin.Context) {
		ensureOauthConfig() // 🎯 FIX: Prevents nil-pointer panic during token exchange!

		code := c.Query("code")

		token, err := GoogleOauthConfig.Exchange(context.Background(), code)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Code validation expired"})
			return
		}

		response, err := http.Get("https://www.googleapis.com/oauth2/v2/userinfo?access_token=" + token.AccessToken)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Google scope sync dropped"})
			return
		}
		defer response.Body.Close()

		var googleUser struct {
			Email      string `json:"email"`
			GivenName  string `json:"given_name"`
			FamilyName string `json:"family_name"`
		}
		json.NewDecoder(response.Body).Decode(&googleUser)

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		filter := bson.M{"email": googleUser.Email}
		update := bson.M{
			"$set": bson.M{
				"email":      googleUser.Email,
				"first_name": googleUser.GivenName,
				"last_name":  googleUser.FamilyName,
				"updated_at": time.Now(),
			},
			"$setOnInsert": bson.M{
				"user_id":    uuid.New().String(),
				"role":       "USER",
				"created_at": time.Now(),
				"view_video": []string{},
				"subscribed": []string{},
				"password":   "",
			},
		}

		_, err = userCollection.UpdateOne(
			ctx,
			filter,
			update,
			options.UpdateOne().SetUpsert(true))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed profile database assignment"})
			return
		}

		var foundUser model.User
		err = userCollection.FindOne(ctx, filter).Decode(&foundUser)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Profile parsing error", "details": err.Error()})
			return
		}

		HandleUserSession(c, client, foundUser, true)
	}
}

func Logout(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {

		var Userlogout struct {
			UserId string `json:"user_id"`
		}

		if err := c.ShouldBindJSON(&Userlogout); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input data"})
			return
		}

		err := utils.UpdateAllTokens(Userlogout.UserId, "", "", client)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to logout user"})
			return
		}

		http.SetCookie(c.Writer, &http.Cookie{
			Name:     "access_token",
			Value:    "",
			Path:     "/",
			MaxAge:   -1,
			Secure:   false,
			HttpOnly: true,
			SameSite: http.SameSiteLaxMode,
		})

		http.SetCookie(c.Writer, &http.Cookie{
			Name:     "refresh_token",
			Value:    "",
			Path:     "/",
			MaxAge:   -1,
			Secure:   false,
			HttpOnly: true,
			SameSite: http.SameSiteLaxMode,
		})
		c.JSON(http.StatusOK, gin.H{"message": "User logged out successfully"})
	}
}

type SubscriptionPayload struct {
	UserId       string `json:"user_id"`
	SubscribedTo string `json:"subscribed_to"`
}

// Subscribe adds a channel ID to the user's subscription array
func Subscribe(client *mongo.Client) gin.HandlerFunc {
	opencollection := database.Opencollection("users", client)
	return func(c *gin.Context) {
		var subscriptionData SubscriptionPayload

		if err := c.ShouldBindJSON(&subscriptionData); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input data"})
			return
		}

		// Convert string ID to MongoDB Hex ObjectID
		objID, err := primitive.ObjectIDFromHex(subscriptionData.UserId)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid format layout for user_id"})
			return
		}

		fmt.Printf("Received subscription request details -> User: %s, Channel: %s\n", subscriptionData.UserId, subscriptionData.SubscribedTo)

		filter := bson.M{"_id": objID}
		update := bson.M{"$addToSet": bson.M{"subscribed": subscriptionData.SubscribedTo}}

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		result, err := opencollection.UpdateOne(ctx, filter, update)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update subscription entry"})
			return
		}

		if result.MatchedCount == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "User profile not found"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Subscribed successfully"})
	}
}

// Unsubscribe removes a channel ID from the user's subscription array
func Unsubscribe(client *mongo.Client) gin.HandlerFunc {
	opencollection := database.Opencollection("users", client)
	return func(c *gin.Context) {
		var subscriptionData SubscriptionPayload

		if err := c.ShouldBindJSON(&subscriptionData); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input data"})
			return
		}

		// 🎯 FIX: Convert string ID to MongoDB Hex ObjectID (Same as Subscribe)
		objID, err := primitive.ObjectIDFromHex(subscriptionData.UserId)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid format layout for user_id"})
			return
		}

		fmt.Printf("Received unsubscribe request details -> User: %s, Channel: %s\n", subscriptionData.UserId, subscriptionData.SubscribedTo)

		// 🎯 FIX: Change query key from "user_id" to "_id" using the parsed objID
		filter := bson.M{"_id": objID}
		update := bson.M{"$pull": bson.M{"subscribed": subscriptionData.SubscribedTo}}

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		result, err := opencollection.UpdateOne(ctx, filter, update)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to execute unsubscribe operation"})
			return
		}

		if result.MatchedCount == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "User profile not found"})
			return
		}

		// 🎯 FIX: Corrected message string text
		c.JSON(http.StatusOK, gin.H{"message": "Unsubscribed successfully"})
	}
}

func generateRandomToken() string {
	b := make([]byte, 20)
	rand.Read(b)
	return hex.EncodeToString(b)
}

func ForgotPassword(client *mongo.Client) gin.HandlerFunc {
	userCollection := database.Opencollection("users", client)
	return func(c *gin.Context) {
		var input struct {
			Email string `json:"email" binding:"required,email"`
		}
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Valid email is required"})
			return
		}

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		token := generateRandomToken()
		expiration := time.Now().Add(15 * time.Minute)

		filter := bson.M{"email": input.Email}
		update := bson.M{
			"$set": bson.M{
				"forgot_password_token": token,
				"token_expires_at":      expiration,
			},
		}

		result, err := userCollection.UpdateOne(ctx, filter, update)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate reset session"})
			return
		}

		if result.MatchedCount == 0 {
			c.JSON(http.StatusOK, gin.H{"message": "If that email exists, a reset link has been sent."})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message":          "Reset token generated successfully",
			"debug_token_link": "http://localhost:5173/reset-password?token=" + token,
		})
	}
}

func ResetPassword(client *mongo.Client) gin.HandlerFunc {
	userCollection := database.Opencollection("users", client)
	return func(c *gin.Context) {
		var input struct {
			Token       string `json:"token" binding:"required"`
			NewPassword string `json:"new_password" binding:"required,min=6"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload input criteria"})
			return
		}

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		filter := bson.M{
			"forgot_password_token": input.Token,
			"token_expires_at":      bson.M{"$gt": time.Now()},
		}

		hashedPassword, err := hashpassword(input.NewPassword)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process encryption hashing"})
			return
		}

		update := bson.M{
			"$set": bson.M{
				"password": hashedPassword,
			},
			"$unset": bson.M{
				"forgot_password_token": "",
				"token_expires_at":      "",
			},
		}

		result, err := userCollection.UpdateOne(ctx, filter, update)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reset password"})
			return
		}

		if result.MatchedCount == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Token is invalid or has expired"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Password updated successfully!"})
	}
}

func banchannel(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		var input struct {
			UserId string `json:"user_id" binding:"required"`
		}

		filter := bson.M{"user_id": input.UserId}
		update := bson.M{"$set": bson.M{"role": "BANNED"}}

		ctx, cancel := context.WithTimeout(context.Background(), 100*time.Second)
		defer cancel()

		result, err := database.Opencollection("users", client).UpdateOne(ctx, filter, update)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to ban the channel"})
			return
		}

		if result.MatchedCount == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Channel banned successfully"})

	}
}
