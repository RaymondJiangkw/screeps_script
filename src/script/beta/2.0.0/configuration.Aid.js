class transferInfo{
    constructor(fromRoom,resourceType,beginAmount,endAmount,toBeginAmount,toEndAmount,from = "storage",to = "storage"){
        this.fromRoom = fromRoom
        this.from = from
        this.to = to
        this.resourceType = resourceType
        this.beginAmount = beginAmount
        this.endAmount = endAmount
        this.toBeginAmount = toBeginAmount
        this.toEndAmount = toEndAmount
    }
}
module.exports = {
    "W18N22":[],
    "W19N22":[],
    "W22N25":[],
    "W23N25":[],
    "W21N24":[]
}