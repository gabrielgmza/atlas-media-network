const personalities = require('./personality-engine')

class JournalistEngine {

    writeArticle(topic) {

        const journalist = personalities.getRandomJournalist()

        const article = {
            title: topic,
            author: journalist.name,
            category: journalist.category,
            content: journalist.style(topic)
        }

        return article

    }

}

module.exports = JournalistEngine
