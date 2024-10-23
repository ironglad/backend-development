import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";


const VideoSchema= new mongoose.Schema(
    {
        VideoFile:{
            type:true,
            required:true
        },
        thumbnail:{
            type:true,
            required:true
        },
        title:{
            type:true,
            required:true
        },
        description:{
            type:true,
            required:true
        },
        time:{
            type:Number,
            required:true 
        },
        views:{
            type:Number,
            default:0
        },
        ispublished:{
            type:Boolean,
            default:true,
        },
        owner:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"User"
        },


    },{timestamps:true}
)

VideoSchema.plugin(mongooseAggregatePaginate)

export const Video=mongoose.model("Video",VideoSchema)