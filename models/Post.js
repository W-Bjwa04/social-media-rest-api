import mongoose from "mongoose"

const postSchema = new mongoose.Schema({

    user:{
        type:mongoose.Types.ObjectId,
        ref:"User",
        required:true
    },

    caption:{
        type:String,
        requried:true
    },

    image:[{
        type:String,
        required:false
    }],

    likes:[{
        type:mongoose.Types.ObjectId,
        ref:"User"
    }],

    comments:[{
        type:mongoose.Types.ObjectId,
        ref:"Comment"
    }]
},{timestamps:true})


const Post = mongoose.model("Post",postSchema)


export {Post}