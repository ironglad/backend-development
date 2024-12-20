  
    import {asyncHandler} from "../utils/asynhandler.js";
    import {ApiError} from "../utils/ApiError.js";
    import {User} from "../models/users.model.js";
    import { uploadOnCloudinary } from "../utils/cloudinary.js";
    import {ApiResponse} from "../utils/ApiResponse.js";
import { Subscription } from "../models/subscription.model.js";
import mongoose from "mongoose";

    const generateAccessAndRefreshToken=async(userId)=>{
        try {

            const user=await User.findById(userId)
            const refresToken=user.generateRefreshToken()
            const accessToken=user.generateAccessToken()
            user.refresToken=refresToken
            await user.save({validateBeforeSave:false})
            
            return{accessToken,refresToken}

        } catch (error) {
            throw new ApiError(500, "something went wrong while genrating access and refresh token")
        }
    }

    const  registerUser=asyncHandler( async (req,res)=>{
        //get user detail from frontend
        //validation-not empty
        //check if user already existis:username,email
        //check for images,check for avatat
        //upload them to cloudinary
        //create user object-create entry in db
        //remove password and refresh token field from response
        //check for user creaton
        // return response
        const {fullName,email,username,password}=req.body
        console.log("email:",email)


        if(
            [fullName,email,username,password].some((field)=>
            field?.trim()==="")
        ){
            throw new ApiError(400,"All fields are required")
        }

        const existedUser= await User.findOne({
            $or:[{username},{email}]
        })

        if(existedUser){
            throw new ApiError(409,"User already existed")
        }

        const avatarLocalPath=req.files?.avatar[0]?.path
        // const coverImageLocalPath=req.files?.coverImage[0]?.path

        let coverImageLocalPath
        if(req.files && Array.isArray(req.files.coverImageLocalPath)
            && req.files.coverImageLocalPath.length>0){
                coverImageLocalPath=req.files.coverImage[0].path
            }

        if(!avatarLocalPath){
            throw new ApiError(400,"Avatar file is required")
        }

        const avatar= await uploadOnCloudinary(avatarLocalPath)
        const coverImage= await uploadOnCloudinary(coverImageLocalPath)

        if(!avatar){
            throw new ApiError(400,"Avatar file is required")
        }
        const user = await User.create({
            fullName,
            avatar: avatar.url,
            coverImage: coverImage?.url || "",
            email,
            password,
            username:username.toLowerCase(),
        });

        const createdUser= await User.findById(user._id).select(
            "-password -refresToken"
        )

        if(!createdUser){
            throw new ApiError(500,"something went wrong while registering user")
        }

        return res.status(201).json(
            new ApiResponse(200,createdUser,"User registered successfully")
        )

    })
    
    const loginUser=asyncHandler(async(req,res)=>{
        //req.body-> data
        //user find (email,username)
        //find user
        //password check
        //access token || refresh token
        //send cookies

        const {username,email,password}=req.body

        if(!username &&  !email){
            throw new ApiError(400,"username or password is required ")
          }
        const user = await User.findOne({
               $or: [{ username }, { email }]
                });
        

        if(!user){
            throw new ApiError(400,"user does not exist")
        }

      const isPasswordvalid= await user.isPasswordCorrect(password)

      if(!isPasswordvalid){
        throw new ApiError(401,"password invalid")
      }

      const{accessToken,refresToken}=await generateAccessAndRefreshToken(user._id)

      const loggedInUser=await User.findOne(user._id).select("-password -refresToken")
    
      const options={
        httpOnly:true,
        secure:true     
      }

      return res
      .status(200)
      .cookie("accessToken",accessToken,options)
      .cookie("refresToken", refresToken,options)
      .json(
        new ApiResponse(
            200,
            {
                user:loggedInUser,accessToken,
                refresToken 
            },
            "User Logged In Successfully"
        )
      )

    })

    const logoutUser=asyncHandler(async(req,res)=>{
        await User.findByIdAndUpdate(
            req.user._id,{
                $set:{refresToken : undefined}
            },
            {
                new:true
            }
        )
        const options={
            httpOnly:true,
            secure:true     
          }

        return res
        .status(200)
        .clearCookie("accessToken",options)
        .clearCookie("refresToken",options)
        .json(new ApiResponse(200 ,{},"User logged Out"))


    })

    const refreshAccessToken = asyncHandler(async(req,res)=>{
        const incomingRefreshToken= req.cookies.refresToken || req.body.refresToken 

       try {
         const decodedToken=jwt.verify(
             incomingRefreshToken,
             process.env.REFRESH_TOKEN_SECRET
         )
         
         if(!incomingRefreshToken){
            throw new ApiResponse(401,"unthorized request")
         }

         const user = await User.findById(decodedToken?._id)
 
         if(!user){
             throw new ApiResponse(401,"Invalid refresh token")
         }
 
         if( incomingRefreshToken !== user?.refresToken){
             throw new ApiError(401,"Refresh token is expired or used")
         }
 
         const options={
             httpOnly:true,
             secure:true
         }
 
        const {accessToken,newrefresToken} =await generateAccessAndRefreshToken(user._id)
 
         return res
         .status(200)
         .cookie("accessToken",accessToken,options)
         .cookie("refresh",newrefresToken,options)
         .json(
             new ApiResponse(
                 200,
                 {accessToken,refresToken:newrefresToken},
                 "Access Token Refreshed"
             )
         )
       } catch (error) {
        throw new ApiError(401,error?.message || "Invalid refresh token")
       }
    })

    const changePassword= asyncHandler(async(req,res)=>{
        const{oldpassword,newpassword}=req.body

    const user= await User.findById(req.user?._id)
    const isPasswordCorrect = await User.isPasswordCorrect(oldpassword)
        if(!isPasswordCorrect){
            throw new ApiError(400,"oldpassword is incorrect")
        }

    user.password=newpassword
    await user.save({validateBeforeSave:false}) 
    return res
    .status(200)
    .json(new ApiResponse(200,{},"Password changed Successfully"))
    })

    const getCurrentUser=asyncHandler(async(req,res)=>{
        return res
        .status(200)
        .json(new ApiResponse(200,req.user,"current user fetched successfully"))    
    })

    const updateAccountDetails= asyncHandler(async(req,res)=>{
        const{fullName,email}=req.body

        if(!fullName || !email){
            throw new ApiError(401,"All fields are required")
        }

        const user=await User.findByIdAndUpdate(
            req.user?._id,
            
            {$set:
                {fullName,
                email}
            },
            {new:true},
        ).select("-password")
        return res
        .status(200)
        .json(new ApiResponse(200, user ,"Account details updated successfully "))
        
    })

    const updateAvatar= asyncHandler(async(req,res)=>{
        const{AvatarLocalPath}=req.file

        if(!AvatarLocalPath){
            throw new ApiError(400,"Avatar file is missing")
        }

        const avatar=await uploadOnCloudinary(AvatarLocalPath)

        if(!avatar.url){
            throw new ApiError(400,"something went wrong while updating avatar")
        }

        const user=await User.findByIdAndUpdate(
            req.user?._id,{
                $set:{
                    avatar:avatar.url
                }
            },
            {new:true}
        ).select("-password")
        
        
        return res
        .status(200)
        .json(200,user,avatar, "updated successfully")

    })

    const updateCoverImage=asyncHandler(async(req,res)=>{
        const coverImageLocalPath=req.file

        if(!coverImageLocalPath){
            throw new ApiError(400,"coverImage is missing")
        }

       const coverImage= await uploadOnCloudinary(coverImageLocalPath)

        if(!coverImage.url){
            throw new ApiError(400,"something went wrong while uploading coverimage")
        }

        const user=await User.findByIdAndUpdate(
            req.user?._id,
            {$set:{
                coverImage:coverImage.url
            }},
            {new:true}
        ).select("-password")
        return res
        .status(200)
        .json(new ApiResponse(200,user,"coverImage updated successfully"))
    })

    const getUserChannelProfile=asyncHandler(async(req,res)=>{
        const {username}=req.params

        if(!username?.trim()){
            throw new ApiError(400,"username is missing")
        }

        const channel= await User.aggregate([
            {
                $match:{
                    username:username?.toLowerCase()
                }
            },
            {
                $lookup:{
                    form:"subsciptions",
                    localField:"_id",
                    foreignField:"channel",
                    as:"subscibers"
                }
            },
            {
                $lookup:{
                    from:"subcriptions",
                    localField:"_id",
                    foreignField:"subscriber",
                    as:"subscribedTo"
                }
            },
            {
                $addFields:{
                    SubscriberCount:{
                        $size:"$subscibers"
                    },
                    channelSubscribedToCount:{
                        $size:"$subscribedTo"
                    },
                    isSubscribed:{
                        $cond:{
                            if:{$in:[req.user?._id,"$subscribers.subscriber"]},
                            then:true,
                            else:false
                        }
                    }

                }
            },
            {
                $project:{
                    fullName:1,
                    username:1,
                    avatar:1,
                    SubscriberCount:1,
                    channelSubscribedToCount:1,
                    isSubscribed:1,
                    coverImage:1,
                    email:1,


                }
            }
        ])
    })

    const getWatchHistory= asyncHandler(async(req,res)=>{
        const user= await User.aggregate([
            {
                $match:{
                    _id:new mongoose.Types.ObjectId(req.user._id)
                }
            },
            {
                $lookup:{
                    from:"videos",
                    localField:"watchHistory",
                    foreignField:"_id",
                    as:"watchHistory",
                    pipeline:[
                        {
                            $lookup:{
                                from:"users",
                                localField:"owner",
                                foreignField:"_id",
                                as:"owner",
                                pipeline:[
                                    {
                                        $project:{
                                            fullName:1,
                                            username:1,
                                            avatar:1
                                        }
                                    }
                                ]
                            }
                        },
                        {
                            $addFields:{
                                onwer:{
                                    $first: "$owner"
                                }
                            }
                        }
                    ]
                }     
            }
        ])

        return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user[0].watchHistory,
                "watch History Fetched successfully "
            )
        )
    })
    export {
        registerUser,
        loginUser,
        logoutUser,
        refreshAccessToken,
        changePassword,
        getCurrentUser,
        updateAccountDetails,
        updateAvatar,
        updateCoverImage,
        getUserChannelProfile,
        getWatchHistory
    }
