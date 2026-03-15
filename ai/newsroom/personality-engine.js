
const journalists = [

{
name: "Lucia Herrera",
category: "politics",
style: (topic) => `Political analysis about ${topic}. Sources close to the government confirm growing tension.`
},

{
name: "Diego Fuentes",
category: "economy",
style: (topic) => `Economic impact of ${topic}. Analysts warn the situation could affect local markets.`
},

{
name: "Marcos Rivas",
category: "police",
style: (topic) => `Breaking crime news: ${topic}. Police sources confirmed the event minutes ago.`
},

{
name: "Carla Torres",
category: "society",
style: (topic) => `Community reactions emerge after ${topic}. Residents express concern.`
},

{
name: "Sofia Luna",
category: "viral",
style: (topic) => `Internet explodes after ${topic}. The trend is spreading rapidly on social networks.`
}

]

function getRandomJournalist(){

return journalists[Math.floor(Math.random() * journalists.length)]

}

module.exports = { getRandomJournalist }
