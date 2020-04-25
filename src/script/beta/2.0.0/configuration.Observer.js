const observerConfiguration = {
    "dominance":["W2N1"], // Reserve these rooms
    "utilsEnergy":["W2N1"],   // Use the energy in these neutral rooms
    "coreDominance":[],  // Utilize the core room

    "W1N1":[],
    "W22N25":[],
    "W23N25":[],
    "W21N24":[],
    "W19N22":[],
    
    "travel":{
        "W1N1":["W1N0,W0N1,W0N0","E0N0","W3N0"],
        "W22N25":[],
        "W23N25":[],
        "W21N24":[],
        "W19N22":[],
    }
}
module.exports = observerConfiguration