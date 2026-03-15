const fs = require("fs")

const DB_FILE = "data/articles/articles.json"

if(!fs.existsSync(DB_FILE)){
fs.writeFileSync(DB_FILE, JSON.stringify({articles:[]},null,2))
}

function saveArticle(article){

const db = JSON.parse(fs.readFileSync(DB_FILE))

article.id = Date.now()

db.articles.push(article)

fs.writeFileSync(DB_FILE, JSON.stringify(db,null,2))

return article

}

function getArticles(){

const db = JSON.parse(fs.readFileSync(DB_FILE))

return db.articles

}

module.exports = { saveArticle, getArticles }
