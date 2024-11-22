import mongoose, { Schema, Types } from "mongoose";

const subscriptionschema=  new Schema(
    {
        Subscriber:{
            Types:Schema.Types.ObjectId,
            ref:"User"
        },

        channel:{
            Types:Schema.Types.ObjectId,
            ref:"User"
        }
    },{timestamps:true}
)


export const Subscription =mongoose.model("subscription",subscriptionschema)