var roomResources = {};
var roomResourcesExpiration = {};

const CACHE_TIMEOUT = 50;
const CACHE_OFFSET = 4;

const multipleList = [
    RESOURCE_ENERGY,RESOURCE_MIST,RESOURCE_BIOMASS,RESOURCE_METAL,RESOURCE_SILICON,
];
const singleList = [
    RESOURCE_HYDROGEN,RESOURCE_OXYGEN,RESOURCE_UTRIUM,RESOURCE_LEMERGIUM,
    RESOURCE_KEANIUM,RESOURCE_ZYNTHIUM,RESOURCE_CATALYST,
];
function getCacheExpiration() {
    return CACHE_TIMEOUT + Math.round((Math.random()*CACHE_OFFSET*2)-CACHE_OFFSET);
}

Room.prototype._checkRoomResourceCache = function _checkRoomResourceCache(){
    if (!roomResourcesExpiration[this.name] || !roomResources[this.name] || roomResourcesExpiration[this.name] < Game.time){
        roomResourcesExpiration[this.name] = Game.time + getCacheExpiration();
        const sources = this.find(FIND_SOURCES_ACTIVE)
        const minerals = this.find(FIND_MINERALS)
        const deposits = this.find(FIND_DEPOSITS)
        var _sets = [].concat(sources,minerals,deposits)
        _sets = _.filter(_sets,s=>s)
        roomResources[this.name] = _.groupBy(_sets,s=>{
            if (s.mineralType) return s.mineralType
            if (s.depositType) return s.depositType
            return "energy"
        })
        var i;
        for (i in roomResources[this.name]) {
            roomResources[this.name][i] = _.map(roomResources[this.name][i], r => r.id);
        }
    }
}
multipleList.forEach(function(type) {
    Object.defineProperty(Room.prototype,type + "s",{
        get:function(){
            if (this["_" + type + "s"] && this["_" + type + "s_ts"] === Game.time) {
                return this["_" + type + "s"];
            }else{
                this._checkRoomResourceCache();
                if (roomResources[this.name][type]){
                    this["_"+type+"s_ts"] = Game.time;
                    return this["_" + type + "s"] = roomResources[this.name][type].map(Game.getObjectById);
                }else{
                    this["_" + type + "s_ts"] = Game.time;
                    return this["_" + type + "s"] = [];
                }
            }
        },
        set: function(){},
        enumerable:false,
        configurable:true,
    })
})
singleList.forEach(function(type){
    Object.defineProperty(Room.prototype,type,{
        get:function(){
            if (this["_" + type] && this["_" + type + "_ts"] === Game.time) {
                return this["_" + type];
            }else{
                this._checkRoomResourceCache();
                if (roomResources[this.name][type]){
                    this["_"+type+"_ts"] = Game.time;
                    return this["_" + type] = Game.getObjectById(roomResources[this.name][type][0]);
                }else{
                    this["_" + type + "_ts"] = Game.time;
                    return this["_" + type] = undefined;
                }
            }
        },
        set: function(){},
        enumerable:false,
        configurable:true,
    })
})
Object.defineProperty(Room.prototype,"mineral",{
    get:function(){
        if (this["_mineral"]) return this["_mineral"]
        else{
            var mineralType
            for (mineralType of singleList){
                if (roomResources[this.name][mineralType]){
                    return this["_mineral"] = Game.getObjectById(roomResources[this.name][mineralType][0]);
                    break
                }
            }
            return this["_mineral"] = undefined;
        }
    },
    set:function(){},
    enumerable:false,
    configurable:true
})