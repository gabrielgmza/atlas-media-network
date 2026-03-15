const fs = require("fs")

class AIPresident {

constructor(){

this.memoryFile = "data/memory/president-memory.json"

if(!fs.existsSync(this.memoryFile)){
fs.writeFileSync(this.memoryFile, JSON.stringify({events:[]},null,2))
}

}

remember(event){

const memory = JSON.parse(fs.readFileSync(this.memoryFile))

memory.events.push({
time: new Date().toISOString(),
event: event
})

fs.writeFileSync(this.memoryFile, JSON.stringify(memory,null,2))

}

report(){

const memory = JSON.parse(fs.readFileSync(this.memoryFile))

console.log("\nATLAS PRESIDENT REPORT\n")

memory.events.forEach(e=>{
console.log(e.time + " — " + e.event)
})

}

}

module.exports = AIPresident
