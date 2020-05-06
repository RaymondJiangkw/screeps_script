const configTower = require('configuration.Tower')
const utils = require('utils')
const hitsCompare = function(objectAId,objectBId) {
    var objectA = Game.getObjectById(objectAId)
    var objectB = Game.getObjectById(objectBId)
    return objectA.hits/objectA.hitsMax - objectB.hits/objectB.hitsMax
}
const towerExtension = {
    _repair(){
        if (this.store.getUsedCapacity(RESOURCE_ENERGY) >= configTower.reservedEnergy) {
            global.towerRepairs[this.room.name].common.sort(hitsCompare)
            global.towerRepairs[this.room.name].walls.sort(hitsCompare)
            global.towerRepairs[this.room.name].ramparts.sort(hitsCompare)
            var towerRepairs = global.towerRepairs[this.room.name]
            if (towerRepairs.common.length > 0) this.repair(Game.getObjectById(towerRepairs.common[0]));
            else if (towerRepairs.ramparts.length > 0) this.repair(Game.getObjectById(towerRepairs.ramparts[0]));
            else if (towerRepairs.walls.length > 0) this.repair(Game.getObjectById(towerRepairs.walls[0]));
            else{
                if (configTower.fullyRepair.indexOf(this.room.name) > 0){
                    var ramparts = _.filter(Game.rooms[this.room.name].ramparts,(r)=>r.hits < r.hitsMax);
                    var walls = _.filter(Game.rooms[this.room.name].constructedWalls,(w)=>w.hits < w.hitsMax);
                    ramparts.sort((r1,r2)=>r1.hits - r2.hits);
                    walls.sort((w1,w2)=>w1.hits - w2.hits);
                    if (ramparts.length > 0) this.repair(ramparts[0]);
                    else if (walls.length > 0) this.repair(walls[0]);
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
        return false;
    },
    _heal(){
        global.healTargets[this.room.name] = _.filter(global.healTargets[this.room.name],(c)=>c.hits < c.hitsMax);
        if (global.healTargets[this.room.name].length > 0) {
            global.healTargets[this.room.name].sort(hitsCompare);
            this.heal(global.healTargets[this.room.name][0]);
            return true;
        }
        return false;
    },
    run(){
        if (!this._attack()) if (!this._heal()) this._repair();
    }
}
_.assign(StructureTower.prototype,towerExtension)