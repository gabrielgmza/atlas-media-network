const editor = require("../editor/editor")
const journalists = require("../journalists/journalists")

module.exports = {

generateArticle: async function(topic){

const journalist = editor.selectJournalist(topic)

const article = {

title: "Breaking news about " + topic,

body: "This is a generated article discussing " + topic + ".",

author: journalist.name,

role: journalist.role,

style: journalist.style,

date: new Date()

}

if(editor.approveArticle(article)){
console.log("Article approved")
return article
}

}

}
