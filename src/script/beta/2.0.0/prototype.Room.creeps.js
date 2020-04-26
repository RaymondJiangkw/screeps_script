const utils = require('utils')
Object.defineProperty(Room.prototype,"creeps",{
    get:function(){
        if (this["_creeps"]) return this["_creeps"]
        else{
            var roomCreeps = _.filter(Game.creeps,(creep)=>creep.memory.home === this.name)
            this["_creeps"] = roomCreeps
            return this["_creeps"]
        }
    },
    set:function(){},
    enumerable:false,
    configurable:true,
})
Object.defineProperty(Room.prototype,"inCreeps",{
    get:function(){
        if (this["_inCreeps"]) return this["_inCreeps"]
        else{
            var inRoomCreeps = _.filter(Game.creeps,(creep)=>creep.room.name === this.name)
            this["_inCreeps"] = inRoomCreeps
            return this["_inCreeps"]
        }
    },
    set:function(){},
    enumerable:false,
    configurable:true
})
Object.defineProperty(Room.prototype,"enemies",{
    get:function(){
        if (this["_enemies"]) return this["_enemies"]
        else{
            this["_enemies"] = this.find(FIND_HOSTILE_CREEPS)
            return this["_enemies"]
        }
    },
    set:function(){},
    enumerable:false,
    configurable:true
})