const helpFunc = require("func")
const roleLink = {
    run:function(link,roomName){
      if (link.store.getUsedCapacity(RESOURCE_ENERGY) !== 0){
        const waitingUpgradeLinks = _.filter(Game.spawns['Origin'].memory.init.groupedLinks.emitTo[roomName].upgrade,(link_id)=>Game.getObjectById(link_id).store.getUsedCapacity(RESOURCE_ENERGY) === 0)
        const waitingBackUpLinks = _.filter(Game.spawns['Origin'].memory.init.groupedLinks.emitTo[roomName].backUp,(link_id)=>Game.getObjectById(link_id).store.getUsedCapacity(RESOURCE_ENERGY) === 0)
        const waitingLinks = [].concat(waitingUpgradeLinks,waitingBackUpLinks)
        if (waitingLinks.length > 0){
          link.transferEnergy(Game.getObjectById(waitingLinks[0]))
        }else{
          return 0
        }
      }
    }
}
module.exports = roleLink;