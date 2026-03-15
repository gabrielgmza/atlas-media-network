
const EditorAI = require('./editor')
const JournalistEngine = require('./journalist-engine')
const Publisher = require('./publisher')

const editor = new EditorAI()
const journalist = new JournalistEngine()
const publisher = new Publisher()

function runNewsroom(){

    const detectedTrend = "Accidente en Ruta 7 Mendoza"

    const decision = editor.decideTopic(detectedTrend)

    if(!decision.publish){

        console.log("Editor rejected the story")

        return
    }

    const article = journalist.writeArticle(detectedTrend)

    publisher.publish(article)

}

runNewsroom()

