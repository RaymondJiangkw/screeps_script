Object.defineProperty(Room.prototype,"creeps",{
    get:function(){
        return _.filter(Game.creeps,(creep)=>creep.memory.home === this.name).map(c=>c.id)
    },
    set:function(){},
    enumerable:false,
    configurable:true,
})
Object.defineProperty(Room.prototype,"enemies",{
    get:function(){
        return this.find(FIND_HOSTILE_CREEPS).map(c=>c.id)
    },
    set:function(){},
    enumerable:false,
    configurable:true
})