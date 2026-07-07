package model

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

type User struct {
	ID                  bson.ObjectID `json:"_id,omitempty" bson:"_id,omitempty"`
	UserID              string        `json:"user_id" bson:"user_id"`
	FirstName           string        `json:"first_name" bson:"first_name" validate:"required,min=2,max=100"`
	LastName            string        `json:"last_name" bson:"last_name" validate:"required,min=2,max=100"`
	Email               string        `json:"email" bson:"email" validate:"required,email"`
	Password            string        `json:"password" bson:"password" validate:"required,min=6"`
	Role                string        `json:"role" bson:"role" validate:"required,oneof=ADMIN USER BANNED"`
	CreatedAt           time.Time     `json:"created_at" bson:"created_at"`
	UpdatedAt           time.Time     `json:"updated_at" bson:"updated_at"`
	Token               string        `json:"token,omitempty" bson:"token,omitempty"`
	RefreshToken        string        `json:"refresh_token,omitempty" bson:"refresh_token,omitempty"`
	Viewvideo           []string      `json:"view_video,omitempty" bson:"view_video,omitempty"`
	Subscribed          []string      `json:"subscribed,omitempty" bson:"subscribed,omitempty"`
	ForgotPasswordToken string        `json:"forgot_password_token,omitempty" bson:"forgot_password_token,omitempty"`
	TokenExpiresAt      time.Time     `json:"token_expires_at,omitempty" bson:"token_expires_at,omitempty"`
}

type UserLogin struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=6"`
}
type UserResponse struct {
	UserId       string `json:"user_id"`
	FirstName    string `json:"first_name"`
	LastName     string `json:"last_name"`
	Email        string `json:"email"`
	Role         string `json:"role"`
	Token        string `json:"token"`
	RefreshToken string `json:"refresh_token"`
}
