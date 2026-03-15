
const EditorAI = require('./editor')
const JournalistEngine = require('./journalist-engine')
const Publisher = require('./publisher')

const editor = new EditorAI()
const journalist = new JournalistEngine()
const publisher = new Publisher()

const detectedTrends = [

"Accidente en Ruta 7 Mendoza",
"Aumento del dólar en Argentina",
"Nuevo parque tecnológico en Mendoza",
"Incendio en Godoy Cruz",
"Festival cultural en Maipú"

]

function runNewsroom(){

console.log("Atlas AI Newsroom started\n")

detectedTrends.forEach(trend => {

const decision = editor.decideTopic(trend)

console.log("Evaluating:", trend)
console.log("Impact score:", decision.score)

if(!decision.publish){

console.log("Editor rejected story\n")
return
}

const article = journalist.writeArticle(trend)

publisher.publish(article)

console.log("\n")

})

}

runNewsroom()

