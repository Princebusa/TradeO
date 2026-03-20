import express from "express"
import * as dotenv from 'dotenv'
import auth from "./routes/auth.routes"
import cors from "cors"
import order from './routes/order.routes'
import { createServer } from "http"
import { initWsServer } from "./ws"
dotenv.config();

const app = express()

app.use(cors())
app.use(express.json()) 
app.use(express.urlencoded({ extended: true }));


app.use("/auth", auth)
app.use("/order", order)

const server = createServer(app);
initWsServer(server);

server.listen(process.env.PORT, () => {
    console.log(`server and ws are running on ${process.env.PORT}`)
})
