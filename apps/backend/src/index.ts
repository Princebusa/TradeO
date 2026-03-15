import express from "express"
import * as dotenv from 'dotenv'
import auth from "./routes/auth.routes"
import cors from "cors"
dotenv.config();

const app = express()

app.use(cors())
app.use(express.json()) 
app.use(express.urlencoded({ extended: true }));


app.use("/auth", auth)
app.use("/order", )

app.listen(process.env.PORT, (req)=>{
    console.log(`server is running on ${process.env.PORT}`)
})