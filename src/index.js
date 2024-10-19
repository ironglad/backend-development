// require('dotenv').config({path:'./env'})
import dotenv from "dotenv"
import ConnectDB from "./db/index.js";
import express from "express";

const app=express();


dotenv.config({path:'./env'})

ConnectDB()
.then(
    app.listen(process.env.PORT|| 8000, () =>{
    console.log(`server is running at Port:${process.env.PORT}`)
    })
    
)
.catch((error)=>{
    app.on("error",(error)=>{
        console.error("connection failed",error)
        throw error
    })
}
)