const reference = require('reference')
const helpFunc = require('func')
const task = require('task.general')
const checknRun = function(factory,commodity) {
    if (factory.cooldown != 0) return null
    const formula = reference.production.factory.formula[commodity]
    let canProduce = true
    for (let i = 0; i < formula.length;i++){
        const component = formula[i];
        if (factory.store.getUsedCapacity(component[0]) < component[1]){
            canProduce = false
            if (component[0] !== RESOURCE_ENERGY) {
                if (helpFunc.isCompoundEnough(factory.room.name,component[0],component[1] - factory.store.getUsedCapacity(component[0]))){
                    task.addTransfer(factory.room.name,"factory",component[0],component[1] - factory.store.getUsedCapacity(component[0]));
                }
            }
        }
    }
    if (canProduce) factory.produce(commodity)
}
const roleFactory = {
    run:function(roomName){
        const factory = Game.getObjectById(Game.spawns['Origin'].memory.init.access.factories[roomName][0])
        const level = factory.level;
        if (level != undefined){
            for (let i = 0; i < reference.production.factory.reaction[level.to_string()].length;i++){
                checknRun(factory,reference.production.factory.reaction[level.to_string][i])
            }
        }
        for (let i = 0; i < reference.production.factory.reaction["default"].length;i++){
            checknRun(factory,reference.production.factory.reaction["default"][i])
        }
    }
}
module.exports = roleFactory;