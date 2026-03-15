const http = require("http")
const store = require("./article-store")

const server = http.createServer((req,res)=>{

if(req.url === "/articles"){

const articles = store.getArticles()

res.writeHead(200,{"Content-Type":"application/json"})
res.end(JSON.stringify(articles,null,2))

return
}

res.writeHead(200)
res.end("Atlas CMS running")

})

server.listen(3000,()=>{

console.log("Atlas CMS running on port 3000")

})
