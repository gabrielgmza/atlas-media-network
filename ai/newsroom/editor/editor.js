const journalists = require("../journalists/journalists")

module.exports = {

selectJournalist: function(topic){

const found = journalists.find(j => j.topics.includes(topic))

if(found) return found

return journalists[0]

},

approveArticle: function(article){

console.log("Editor reviewing article:", article.title)

return true

}

}
