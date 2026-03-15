module.exports = {

createAd: async function(business){

return {
title: business.name,
headline: "Discover " + business.name,
text: "Top quality service in " + business.city,
cta: "Learn More"
}

}

}
