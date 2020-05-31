var roomResources                   = {};
var roomResourcesExpiration         = {};

var roomDroppedResources            = {};
var roomDroppedResourcesExpiration  = {};

const multipleList = [
    RESOURCE_ENERGY,    RESOURCE_MIST,      RESOURCE_BIOMASS,   RESOURCE_METAL,
    RESOURCE_SILICON,
];
const singleList = [
    RESOURCE_HYDROGEN,  RESOURCE_OXYGEN,    RESOURCE_UTRIUM,    RESOURCE_LEMERGIUM,
    RESOURCE_KEANIUM,   RESOURCE_ZYNTHIUM,  RESOURCE_CATALYST,
];

function getCacheExpiration(CACHE_TIMEOUT = 50,CACHE_OFFSET = 4) {
    return CACHE_TIMEOUT + Math.round((Math.random()*CACHE_OFFSET*2)-CACHE_OFFSET);
}

Room.prototype._checkRoomResourceCache = function _checkRoomResourceCache(){
    if (!roomResourcesExpiration[this.name] || !roomResources[this.name] || roomResourcesExpiration[this.name] < Game.time){
        roomResourcesExpiration[this.name] = Game.time + getCacheExpiration();
        const sources = this.find(FIND_SOURCES_ACTIVE)
        const minerals = this.find(FIND_MINERALS)
        const deposits = this.find(FIND_DEPOSITS)
        var resources = [].concat(sources,minerals,deposits)
        roomResources[this.name] = _.groupBy(resources,s=>{
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

Room.prototype._checkRoomDroppedResourcesCache = function _checkRoomDroppedResourcesCache(){
    if (!roomDroppedResourcesExpiration[this.name] || !roomDroppedResources[this.name] || roomDroppedResourcesExpiration[this.name] < Game.time){
        roomDroppedResourcesExpiration[this.name] = Game.time + getCacheExpiration(10,3)
        roomDroppedResources[this.name] = this.find(FIND_DROPPED_RESOURCES)
        roomDroppedResources[this.name] = _.map(roomDroppedResources[this.name],r => r.id)
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
                    this["_" + type + "_ts"] = Game.time;
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
        if (this["_mineral"] && this["_mineral_ts"] === Game.time) return this["_mineral"]
        else{
            this["_mineral_ts"] = Game.time;
            for (var mineralType of singleList){
                if (this[mineralType]) return this["_mineral"] = this[mineralType];
            }
            return this["_mineral"] = undefined;
        }
    },
    set:function(){},
    enumerable:false,
    configurable:true
})

Object.defineProperty(Room.prototype,"droppedResources",{
    get:function(){
        if (this["_droppedResources"] && this["_droppedResources_ts"] === Game.time){
            return this["_droppedResources"]
        }else{
            this._checkRoomDroppedResourcesCache();
            roomDroppedResources[this.name] = _.filter(roomDroppedResources[this.name],s=>Game.getObjectById(s))
            if (roomDroppedResources[this.name].length > 0){
                this["_droppedResources_ts"] = Game.time;
                return this["_droppedResources"] = _.map(roomDroppedResources[this.name],Game.getObjectById);
            }else{
                this["_droppedResources_ts"] = Game.time;
                return this["_droppedResources"] = [];
            }
        }
    },
    set:function(){},
    enumerable:false,
    configurable:true
})
Object.defineProperty(Room.prototype,"droppedEnergys",{
    get:function(){
        if (this["_droppedEnergys"] && this["_droppedEnergys_ts"] === Game.time) return this["_droppedEnergys"]
        else{
            const _droppedEnergys = _.filter(this.droppedResources,(r)=>r.resourceType === RESOURCE_ENERGY)
            this["_droppedEnergys_ts"] = Game.time;
            return this["_droppedEnergys"] = _droppedEnergys;
        }
    },
    set:function(){},
    enumerable:false,
    configurable:true
})