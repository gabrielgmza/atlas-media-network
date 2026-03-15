
const EditorAI = require('../newsroom/editor')
const JournalistEngine = require('../newsroom/journalist-engine')
const Publisher = require('../newsroom/publisher')
const AIPresident = require('../president/president')

const editor = new EditorAI()
const journalist = new JournalistEngine()
const publisher = new Publisher()
const president = new AIPresident()

const trends = [

"Accidente en Ruta 7 Mendoza",
"Nuevo aumento del dólar en Argentina",
"Incendio en Godoy Cruz",
"Festival gastronómico en Mendoza",
"Nuevo proyecto tecnológico en la provincia",
"Problemas de tránsito en Guaymallén",
"Evento cultural en Maipú",
"Robos en el centro de Mendoza"

]

function simulateDay(){

console.log("\nATLAS DAILY NEWS SIMULATION\n")

trends.forEach(trend => {

president.remember("Trend detected: " + trend)

const decision = editor.decideTopic(trend)

if(!decision.publish){

president.remember("Story rejected: " + trend)
return

}

const article = journalist.writeArticle(trend)

publisher.publish(article)

president.remember("Article published: " + article.title)

})

president.report()

}

simulateDay()

