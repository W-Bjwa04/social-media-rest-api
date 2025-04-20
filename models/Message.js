import mongoose from "mongoose"

const messageSchema = new mongoose.Schema({
    
    conversation:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Conversation", 
        requried:true
    }, 

    sender:{
        type:mongoose.Schema.Types.ObjectId, 
        ref:"User", 
        requried:true
    }, 

    text:{
        type:String, 
        trim: true, 
        requried:true
    }
}, 
    {
        timestamps:true
    }
)


const Message = mongoose.model("Message", messageSchema)

export {Message}
