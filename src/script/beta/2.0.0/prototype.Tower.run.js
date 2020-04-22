const configTower = require('configuration.Tower')
module.exports = function (){
    _.assign(Structure.prototype,towerExtension)
}
const towerExtension = {
    _repair(){
        if (this.store.getUsedCapacity(RESOURCE_ENERGY) >= configTower.reservedEnergy) {
            var towerRepairs = global.towerRepairs[this.room.name]
            if (towerRepairs.common.length > 0) this.repair(towerRepairs.common[0])
            else if (towerRepairs.ramparts.length > 0) this.repair(towerRepairs.ramparts[0])
            else if (towerRepairs.walls.length > 0) this.repair(towerRepairs.walls[0])
            else{
                if (configTower.fullyRepair.indexOf(this.room.name) > 0){
                    var ramparts = _.filter(Game.rooms[this.room.name],(r)=>r.hits < r.hitsMax)
                    var walls = _.filter(Game.rooms[this.room.name],(w)=>w.hits < w.hitsMax)
                    ramparts.sort((r1,r2)=>r1.hits - r2.hits)
                    walls.sort((w1,w2)=>w1.hits - w2.hits)
                    if (ramparts.length > 0) this.repair(ramparts[0])
                    else if (walls.length > 0) this.repair(walls[0])
                }
            }
        }
    },
    _attack(){
        if (Game.rooms[this.room.name].enemies.length > 0) {
            this.attack(Game.rooms[this.room.name].enemies[0])
            return true
        }
    },
    towerRun(){
        if (!this._attack()) this._repair()
    }
}