module.exports = {

findLocalBusinesses: async function(city){

return [
{ name:"Restaurante La Toscana", category:"restaurant", city:city },
{ name:"Inmobiliaria Mendoza Prop", category:"real estate", city:city },
{ name:"Clínica Salud Mendoza", category:"health", city:city }
]

}

}
