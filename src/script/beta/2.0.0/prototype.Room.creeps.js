Object.defineProperty(Room.prototype,"creeps",{
    get:function(){
        if (this["_creeps"]) return this["_creeps"]
        else{
            var roomCreeps = _.filter(Game.creeps,(creep)=>creep.memory.home === this.name)
            this["_creeps"] = roomCreeps
            /*this["_creeps"] = _.groupBy(roomCreeps,c => c.memory.group.type)
            var i;
            for (i in this["_creeps"]){
                this["_creeps"][i] = _.groupBy(this["_creeps"][i],c => c.memory.group.name)
                var j
                for (j in this["_creeps"][i][j]){
                    this["_creeps"][i][j] = _.groupBy(this["_creeps"][i][j],c => c.memory.role)
                    var k;
                    for (k in this["_creeps"][i][j][k]) this["_creeps"][i][j][k] = _.map(this["_creeps"][i][j][k],c => c.id)
                }
            }*/
            return this["_creeps"]
        }
    },
    set:function(){},
    enumerable:false,
    configurable:true,
})
Object.defineProperty(Room.prototype,"enemies",{
    get:function(){
        if (this["_enemies"]) return this["_enemies"]
        else{
            this["_enemies"] = this.find(FIND_HOSTILE_CREEPS)
            return this["_enemies"].map(c => c.id)
        }
    },
    set:function(){},
    enumerable:false,
    configurable:true
})