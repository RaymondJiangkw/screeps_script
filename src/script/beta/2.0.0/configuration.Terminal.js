const terminalConfiguration = {
    terminalCheckInterval:100,
    terminalSendInterval:200,
    baseReservedEnergy:30000,
    baseReservedMineral:10000,
    mineralDistributeMinAmount:2500,
    sellingEnergy:{
        "W22N25":0,
        "W23N25":0,
        "W21N24":0,
        "W19N22":0,
        "W18N22":0
    },
    sellingMineral:{
        "W22N25":0,
        "W23N25":0,
        "W21N24":0,
        "W19N22":0,
        "W18N22":0
    },
    sellingGoods:{
        //[(resourceType),(reservedAmount),(minSellAmount)]
        "W22N25":[[RESOURCE_SWITCH,0,5],[RESOURCE_COMPOSITE,0,100]],
        "W23N25":[[RESOURCE_TRANSISTOR,0,5]],
        "W21N24":[],
        "W19N22":[],
        "W18N22":[]
    },
    buyingGoods:{
        //[(resourceType),(beginBuyingAmount),(endBuyingAmount)]
        "W22N25":[[RESOURCE_OXYGEN,2500,5000],[RESOURCE_LEMERGIUM,2500,5000],[RESOURCE_UTRIUM,2500,5000],[RESOURCE_ZYNTHIUM,2500,5000],[RESOURCE_ENERGY,100000,150000]],
        "W23N25":[[RESOURCE_OXYGEN,2500,5000],[RESOURCE_UTRIUM,2500,5000],[RESOURCE_ZYNTHIUM,2500,5000],[RESOURCE_ENERGY,30000,50000]],
        "W21N24":[[RESOURCE_OXYGEN,2500,5000],[RESOURCE_ENERGY,100000,200000]],
        "W19N22":[[RESOURCE_ENERGY,100000,200000]],
        "W18N22":[[RESOURCE_ENERGY,100000,200000],[RESOURCE_OXYGEN,2500,5000]]
    },
    mostDesiredGoods:{ // Buy as much as it can
        interval:10,
        [RESOURCE_POWER]:{
            maxPrice:4.5,  // Will buy these goods under this line
            minCredits:10000,
        }
    },
}
module.exports = terminalConfiguration