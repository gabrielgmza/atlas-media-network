module.exports = {

rewrite: async function(article){

article.body = article.body + " (rewritten)"

return article

}

}
