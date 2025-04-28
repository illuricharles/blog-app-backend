import express from "express"
import cookieParser from "cookie-parser" 
import userRouter from "./routes/userRoutes"
import postRouter from "./routes/postRoutes"
import cors from "cors"

const app = express()
app.use(cors({origin:`${process.env.ORIGIN_BASE_URL}` ,credentials: true}))
app.use(express.json())
app.use(cookieParser())


app.use('/api/v1/user', userRouter)
app.use('/api/v1/post', postRouter)

app.listen(process.env.PORT || process.env.BASE_URL_PORT || 5000, (error) => {
    console.log("server is running")
    if(error) console.log(error)
})