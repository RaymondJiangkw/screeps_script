var groupType = Object.keys(require('configuration.Creep').groupAcceptedTask)
var roomCreepGroup              = {}
var roomCreepGroupExpiration    = {}

Room.prototype._checkCreepCache = function _checkCreepCache() {
    if (!roomCreepGroupExpiration[this.name] || !roomCreepGroup[this.name] || roomCreepGroupExpiration[this.name] < Game.time){
        roomCreepGroupExpiration[this.name] = Game.time;
//        roomCreepGroup[this.name] = _.groupBy(_.filter(this.creeps,(c)=>c.memory.group),(c)=>c.memory.group.type)
        roomCreepGroup[this.name] = _.groupBy(this.creeps,(c)=>c.memory.group.type)
        var groupType;
        for (groupType in roomCreepGroup[this.name]){
            roomCreepGroup[this.name][groupType] = _.groupBy(roomCreepGroup[this.name][groupType],(c)=>c.memory.group.name);
            var groupName;
            for (groupName in roomCreepGroup[this.name][groupType]){
                roomCreepGroup[this.name][groupType][groupName] = _.groupBy(roomCreepGroup[this.name][groupType][groupName],(c)=>c.memory.role);
            }
        }
    }
}

Object.defineProperty(Room.prototype,"creeps",{
    get:function(){
        if (this["_creeps"] && this["_creeps_ts"] === Game.time) return this["_creeps"]
        else{
            this["_creeps_ts"] = Game.time;
            return this["_creeps"] = _.filter(Game.creeps,(creep)=>creep.memory.home === this.name)
        }
    },
    set:function(){},
    enumerable:false,
    configurable:true,
})
Object.defineProperty(Room.prototype,"inCreeps",{
    get:function(){
        if (this["_inCreeps"] && this["_inCreeps_ts"] === Game.time) return this["_inCreeps"]
        else{
            this["_inCreeps_ts"] = Game.time;
            return this["_inCreeps"] = _.filter(Game.creeps,(creep)=>creep.room.name === this.name);
        }
    },
    set:function(){},
    enumerable:false,
    configurable:true
})
Object.defineProperty(Room.prototype,"enemies",{
    get:function(){
        if (this["_enemies"] && this["_enemies_ts"] === Game.time) return this["_enemies"]
        else{
            this["_enemies_ts"] = Game.time;
            return this["_enemies"] = this.find(FIND_HOSTILE_CREEPS)
        }
    },
    set:function(){},
    enumerable:false,
    configurable:true
})

groupType.forEach(function(_groupType){
    Object.defineProperty(Room.prototype,_groupType,{
        get:function(){
            if (this["_" + _groupType] && this["_" + _groupType + "_ts"] === Game.time) return this["_" + _groupType];
            else{
                this._checkCreepCache();
                if (roomCreepGroup[this.name][_groupType]){
                    this["_" + _groupType + "_ts"] = Game.time;
                    return this["_" + _groupType] = roomCreepGroup[this.name][_groupType];
                }else{
                    this["_" + _groupType + "_ts"] = Game.time;
                    return this["_" + _groupType] = {};
                }
            }
        },
        set:function(){},
        enumerable:false,
        configurable:true,
    })
})