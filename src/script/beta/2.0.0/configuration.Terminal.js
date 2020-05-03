const terminalConfiguration = {
    terminalCheckInterval:10,
    terminalSendInterval:20,
    baseReservedEnergy:30000,
    baseReservedMineral:30000,
    mineralDistributeMinAmount:2500,
    sellingEnergy:{
        "W22N25":0,
        "W23N25":0,
        "W21N24":0,
        "W19N22":0,
        "W18N22":0
    },
    sellingMineral:{
        "W22N25":10000,
        "W23N25":0,
        "W21N24":10000,
        "W19N22":10000,
        "W18N22":0
    },
    sellingGoods:{
        //[(resourceType),(reservedAmount),(minSellAmount)]
        "W22N25":[],
        "W23N25":[],
        "W21N24":[],
        "W19N22":[],
        "W18N22":[]
    },
    buyingGoods:{
        //[(resourceType),(beginBuyingAmount),(endBuyingAmount)]
        "W22N25":[[RESOURCE_OXYGEN,2500,5000],[RESOURCE_LEMERGIUM,2500,5000]],
        "W23N25":[],
        "W21N24":[],
        "W19N22":[],
        "W18N22":[]
    },
    mostDesiredGoods:{ // Buy as much as it can
        interval:100,
        [RESOURCE_POWER]:{
            maxPrice:4,  // Will buy these goods under this line
            minCredits:10000,
        }
    },
}
module.exports = terminalConfiguration