const observerConfiguration = {
    "dominance":["W21N25","W22N24","W21N23"], // Reserve these rooms
    "utilsEnergy":["W21N25","W22N24","W21N23"],   // Use the energy in these neutral rooms
    "coreDominance":{
        // "example":["resourceID"],
    },  // Utilize the core room

    "W22N25":["W20N24","W20N25","W20N23","W20N22","W20N21","W21N20","W20N20","W19N20"],
    "W23N25":[],
    "W21N24":[],
    "W19N22":[],
    "W18N22":[],
    
    "travel":{
        "W22N25":[],
        "W23N25":[],
        "W21N24":[],
        "W19N22":[],
        "W18N22":[],
    }
}
module.exports = observerConfiguration