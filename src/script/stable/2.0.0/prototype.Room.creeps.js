var roomCreepGroups              = {};
var roomCreepGroupsExpiration    = {};

Room.prototype._checkCreepCache = function _checkCreepCache() {
    if (!roomCreepGroupsExpiration[this.name] || !roomCreepGroups[this.name] || roomCreepGroupsExpiration[this.name] < Game.time){
        roomCreepGroupsExpiration[this.name] = Game.time;
        roomCreepGroups[this.name] = _.groupBy(this.creeps,(c)=>c.memory.group.type);
        var groupType;
        for (groupType in roomCreepGroups[this.name]){
            roomCreepGroups[this.name][groupType] = _.groupBy(roomCreepGroups[this.name][groupType],(c)=>c.memory.group.name);
            var groupName;
            for (groupName in roomCreepGroups[this.name][groupType]){
                roomCreepGroups[this.name][groupType][groupName] = roomCreepGroups[this.name][groupType][groupName];
            }
        }
    }
}

Object.defineProperty(Room.prototype,"creeps",{
    get:function(){
        if (this["_creeps"] && this["_creeps_ts"] === Game.time) return this["_creeps"]
        else{
            this["_creeps_ts"] = Game.time;
            return this["_creeps"] = _.filter(Game.creeps,(creep)=>creep.memory.home === this.name);
        }
    },
    set:function(){},
    enumerable:false,
    configurable:true,
})

Object.defineProperty(Room.prototype,"groupCreeps",{
    get:function(){
        if (this["_groupCreeps"] && this["_groupCreeps_ts"] === Game.time) return this["_groupCreeps"];
        else{
            this._checkCreepCache();
            this["_groupCreeps_ts"] = Game.time;
            return this["_groupCreeps"] = roomCreepGroups[this.name];
        }
    },
    set:function(){},
    enumerable:false,
    configurable:true,
})

Object.defineProperty(Room.prototype,"inCreeps",{
    get:function(){
        if (this["_inCreeps"] && this["_inCreeps_ts"] === Game.time) return this["_inCreeps"];
        else{
            this["_inCreeps_ts"] = Game.time;
            return this["_inCreeps"] = _.filter(Game.creeps,(creep)=>creep.room.name === this.name);
        }
    },
    set:function(){},
    enumerable:false,
    configurable:true
})

Object.defineProperty(Room.prototype,"harmedCreeps",{
    get:function(){
        if (this["_harmedCreeps"] && this["_harmedCreeps_ts"] === Game.time) return this["_harmedCreeps"];
        else{
            this["_harmedCreeps_ts"] = Game.time;
            return this["_harmedCreeps"] = _.filter(this.inCreeps,c => c.hits < c.hitsMax);
        }
    },
    set:function(){},
    enumerable:false,
    configurable:true,
})

Object.defineProperty(Room.prototype,"enemies",{
    get:function(){
        if (this["_enemies"] && this["_enemies_ts"] === Game.time) return this["_enemies"];
        else{
            this["_enemies_ts"] = Game.time;
            return this["_enemies"] = this.find(FIND_HOSTILE_CREEPS);
        }
    },
    set:function(){},
    enumerable:false,
    configurable:true
})