import mongoose from "mongoose";
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"



const Userschema= new mongoose.Schema(
    {
        username:{
            type:String,
            unique:true,
            lowercase:true,
            required:true,
            index:true,
            trim:true,
        },
        email:{
            type:String,
            unique:true,
            lowercase:true,
            required:true,
            trim:true,
        },
        fullname:{
            type:String,
            lowercase:true,
            required:true,
            trim:true,
            index:true,
        },
        avatar:{
          type:String,
          required:true,
        },
        coverimage:{
            type:String,
        },
        watchHistory:
        [{
            type:mongoose.Schema.Types.ObjectId,
            ref:"Video"
        }],
        password:{
            type:String,
            required:[true,"password is required"]
        },
        refresToken:{
            type:String,
        }
    },{timestamps:true}
)

Userschema.pre("save", async function (next){
    if(this.isModified("password")) return next();
    this.password=bcrypt.hash(this.password,10)
    next()
})

Userschema.methods.isPasswordCorrect= async function 
(password){
    return await bcrypt.compare(password,this.password)
}

Userschema.methods.generateAccessToken=function(){
   return jwt.sign(
    {
        _id:this._id,
        email:this.email,
        username:this.username,
        fullname:this.fullname

    },
    process.env.ACCESS_TOKEN_SECRET,
    {
        expiresIn:process.env.ACCESS_TOKEN_EXPIRY
    }
)
}
Userschema.methods.generateRefreshToken=function(){
    return jwt.sign({
        _id:this._id,

    },
    process.env.REFRESH_TOKEN_SECRET,
    {
        expiresIn:process.env.REFRESH_TOKEN_EXPIRY
    }
)
}




export const User= mongoose.model("User",Userschema)