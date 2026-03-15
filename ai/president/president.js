class AIPresident{

constructor(){
this.memory=[]
}

remember(item){
this.memory.push(item)
}

decide(strategy){
console.log("Strategic decision:",strategy)
}

}

module.exports = AIPresident
