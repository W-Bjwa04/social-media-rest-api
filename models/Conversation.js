import mongoose from "mongoose"


const conversationSchema = new mongoose.Schema({
    participants: [{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User", 
        requried:true
    }]
}, 

    {
        timestamps:true
    }
)


const Conversation = mongoose.model("Conversation", conversationSchema)


export {Conversation}