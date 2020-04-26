const configTower = require('configuration.Tower')
const utils = require('utils')
const hitsCompare = function(objectA,objectB) {
    return objectA.hits/objectA.hitsMax - objectB.hits/objectB.hitsMax
}
module.exports = function (){
    _.assign(StructureTower.prototype,towerExtension)
}
const towerExtension = {
    _repair(){
        if (this.store.getUsedCapacity(RESOURCE_ENERGY) >= configTower.reservedEnergy) {
            global.towerRepairs[this.room.name].common.sort(hitsCompare)
            global.towerRepairs[this.room.name].walls.sort(hitsCompare)
            global.towerRepairs[this.room.name].ramparts.sort(hitsCompare)
            //console.log(global.towerRepairs[this.room.name].walls)
            var towerRepairs = global.towerRepairs[this.room.name]
            if (towerRepairs.common.length > 0) this.repair(towerRepairs.common[0])
            else if (towerRepairs.ramparts.length > 0) this.repair(towerRepairs.ramparts[0])
            else if (towerRepairs.walls.length > 0) this.repair(towerRepairs.walls[0])
            else{
                if (configTower.fullyRepair.indexOf(this.room.name) > 0){
                    var ramparts = _.filter(Game.rooms[this.room.name].ramparts,(r)=>r.hits < r.hitsMax)
                    var walls = _.filter(Game.rooms[this.room.name].constructedWalls,(w)=>w.hits < w.hitsMax)
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
            var target = _.shuffle(_.filter(Game.rooms[this.room.name].enemies,(e)=>utils.analyseCreep(e,false,true) != "harmless"))[0]
            if (!target) target = _.shuffle(Game.rooms[this.room.name].enemies)[0]
            this.attack(target)
            return true
        }
    },
    run(){
        if (!this._attack()) this._repair()
    }
}