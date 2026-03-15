
class Publisher {

    publish(article){

        console.log("Publishing article...")
        console.log("Title:", article.title)
        console.log("Author:", article.author)
        console.log("Category:", article.category)
        console.log("Content:", article.content)

    }

}

module.exports = Publisher
