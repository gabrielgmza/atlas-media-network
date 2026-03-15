const trends = require("../trend-scanner/trends")
const newsroom = require("../../ai/newsroom/pipeline/newsPipeline")
const factChecker = require("../fact-checker/checker")
const publisher = require("../publisher/publish")

async function runNewsSystem(){

console.log("ATLAS NEWS ENGINE STARTING")

const topics = await trends.scanTrends()

console.log("Trends detected:", topics)

for(const topic of topics){

console.log("Generating article for:", topic)

const article = await newsroom.generateArticle(topic)

const verified = await factChecker.verify(article)

if(verified){

await publisher.publishArticle(article)

console.log("Published:", article.title)
console.log("Author:", article.author)
console.log("")

}

}

console.log("News cycle completed")

}

runNewsSystem()
