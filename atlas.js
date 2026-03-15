const trends = require("./services/trend-scanner/trends")
const newsroom = require("./ai/newsroom/pipeline/newsPipeline")
const factChecker = require("./services/fact-checker/checker")
const publisher = require("./services/publisher/publish")
const ads = require("./ai/advertising-network/ad-generator/adGenerator")

async function startAtlas(){

console.log("")
console.log("ATLAS MEDIA NETWORK")
console.log("System Booting...")
console.log("")

console.log("Starting AI President...")
console.log("Starting Newsroom...")
console.log("Starting Advertising Network...")
console.log("Starting Trend Detection...")
console.log("")

const topics = await trends.scanTrends()

console.log("Detected trends:", topics)
console.log("")

for(const topic of topics){

console.log("Processing topic:", topic)

const article = await newsroom.generateArticle(topic)

const verified = await factChecker.verify(article)

if(verified){

await publisher.publishArticle(article)

console.log("Published article:")
console.log("Title:", article.title)
console.log("Author:", article.author)
console.log("")

}

}

console.log("Atlas cycle completed")

}

startAtlas()
