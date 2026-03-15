const express = require("express")
const fs = require("fs")
const path = require("path")

const app = express()
const PORT = 3000

const ARTICLES_DIR = path.join(__dirname, "../data/articles")

app.use(express.static("sites"))

app.get("/articles", (req, res) => {

    const files = fs.readdirSync(ARTICLES_DIR)

    const articles = files.map(file => {
        const data = fs.readFileSync(path.join(ARTICLES_DIR, file))
        return JSON.parse(data)
    })

    res.json(articles)

})

app.listen(PORT, () => {
    console.log("Atlas CMS running on port", PORT)
})
