  
    import {asyncHandler} from "../utils/asynhandler.js";
    import {ApiError} from "../utils/ApiError.js";
    import {User} from "../models/users.model.js";
    import { uploadOnCloudinary } from "../utils/cloudinary.js";
    import {ApiResponse} from "../utils/ApiResponse.js";

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
    export {
        registerUser,
        loginUser,
        logoutUser
    }
