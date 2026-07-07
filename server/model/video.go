package model

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Video struct {
	ID           string    `bson:"_id,omitempty" json:"_id,omitempty"`
	Descrip      string    `bson:"descrip" json:"descrip"`
	UploadDate   time.Time `bson:"upload_date" json:"upload_date"`
	Views        int       `bson:"views" json:"views"`
	Likes        int       `bson:"likes" json:"likes"`
	Url          Url       `bson:"url" json:"url"`
	Uploadedby   string    `bson:"uploadedby" json:"uploadedby"`
	Uploadedbyid string    `bson:"uploadedbyid" json:"uploadedbyid"`
	Comments     []Comment `bson:"Comments,omitempty" json:"Comments,omitempty"`
}

type Url struct {
	Thumbnail string `bson:"thumbnail" json:"thumbnail"`
	VideoUrl  string `bson:"videourl" json:"videourl"`
}

type Comment struct {
	ID         string    `bson:"_id,omitempty" json:"_id,omitempty"`
	Content    string    `bson:"content" json:"content"`
	UploadDate time.Time `bson:"upload_date" json:"upload_date"`
}

type Commentresponse struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"_id,omitempty"`
	VideoID   string             `bson:"video_id" json:"video_id"`
	UserName  string             `bson:"user_name" json:"user_name"`
	Text      string             `bson:"text" json:"text"`
	CreatedAt time.Time          `bson:"created_at" json:"created_at"`
}
