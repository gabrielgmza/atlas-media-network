const express = require("express")
const app = express()

app.use(express.json())

app.get("/", (req,res)=>{
res.send("Atlas Media Network API")
})

app.listen(3000,()=>{
console.log("Atlas API running")
})
