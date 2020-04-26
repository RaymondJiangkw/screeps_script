class transferInfo{
    constructor(fromRoom,resourceType,beginAmount,endAmount,from = "storage",to = "storage"){
        this.fromRoom = fromRoom
        this.from = from
        this.to = to
        this.resourceType = resourceType
        this.beginAmount = beginAmount
        this.endAmount = endAmount
    }
}
module.exports = {
    "W19N22":[new transferInfo("W21N24","energy",500000,300000),
             ],
    "W22N25":[new transferInfo("W23N25","K",30000,10000),
             ],
    "W23N25":[new transferInfo("W22N25","H",30000,10000),
             ],
    "W21N24":[new transferInfo("W22N25","K",30000,10000),
             ]
}