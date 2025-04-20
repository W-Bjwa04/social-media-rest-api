import mongoose from "mongoose"


const userSchema = new mongoose.Schema({
    username:{
        type:String,
        required:true,
        unique:true,
        trim:true,
        lowercase:true
    },
    password:{
        type:String,
        required:true
    },

    email:{
        type:String,
        required:true,
        unique:true,
        trim:true,
        lowercase:true
    },

    fullName:{
        type:String,
        required:true,
    },

    bio:{
        type:String,
        default:""
    },

    profilePicture:{
        type:String,
        default:""
    },

    coverPicture:{
        type:String,
        default:""
    },

    posts:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Post"
    }],

    followers:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    }],

    following:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    }],

    blockList:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    }]



},{timestamps:true})



const User = mongoose.model("User",userSchema)

export {User}