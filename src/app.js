import cookieParser from "cookie-parser";
import cors from "cors"
import express, { urlencoded } from "express"
const app = express()

app.use(cors({
    origin:process.env.CORS_ORIGIN,
    Credential:true
}))

app.use(express.json({limt:"16kb"}))
app.use(express.urlencoded({extended:true,limit:"16kb"}))
app.use(express.static("public"))
app.use(cookieParser())


//routes import
import userRouter from "./routes/user.routes.js"

// routes declaration
app.use("/api/v1/users",userRouter)

export {app}