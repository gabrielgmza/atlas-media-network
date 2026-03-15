const store = require("../../platform/cms/article-store")

class Publisher {

publish(article){

const saved = store.saveArticle(article)

console.log("Article published and stored")

console.log(saved)

}

}

module.exports = Publisher
