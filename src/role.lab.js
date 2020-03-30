const helpFunc = require("func")
const reference = require("reference")
const roleLab = {
    /*
        Goal:
        1. Produce Automatically produce allowed minerals
        2. Clean unneeded compounds
        3. Transfer surplus compounds
    */ 
    run:function(roomName) {
        console.log("   ===",roomName," Process Labs","===")
        const basicIngredients = reference.production.lab.basicIngredients
        const productionList = Game.spawns['Origin'].memory.assess.access.minerals[roomName].neededProduce
        for (let i = 0; i < productionList.length; i++){
            const productionCompound = productionList[i]
            const _mineral = productionCompound[0]
            const _amount = productionCompound[1]
            if (basicIngredients.indexOf(_mineral) === -1){
                const requiredCompounds = reference.production.lab.formula[_mineral]
                let chosenLabs = []
                for (let j = 0; j < requiredCompounds.length;j++){
                    if (Game.spawns['Origin'].memory.init.groupedLabs.storedMineralTypes[roomName].indexOf(requiredCompounds[j])!==-1){
                        const chosenLabArr = Game.spawns['Origin'].memory.assess.access.structures[roomName].usableLabs[requiredCompounds[j]]
                        // Always choose the most one
                        if (Game.getObjectById(chosenLabArr[chosenLabArr.length - 1]).store.getUsedCapacity(requiredCompounds[j]) >= reference.production.lab.minOnceProduction){
                            chosenLabs.push(chosenLabArr[chosenLabArr.length - 1])
                        }else{
                            break
                        }
                    }else{
                        break
                    }
                }
                let reactionLab = undefined
                if (Game.spawns['Origin'].memory.init.groupedLabs.storedMineralTypes[roomName].indexOf(_mineral)!==-1){
                    reactionLab = Game.spawns['Origin'].memory.assess.access.structures[roomName].usableLabs[_mineral] // Arr
                    reactionLab = _.filter(reactionLab,(labId)=>Game.getObjectById(labId).cooldown === 0)
                    if (reactionLab.length > 0){
                        reactionLab = reactionLab[0]
                        if (Game.getObjectById(reactionLab).store.getFreeCapacity(_mineral) <= _amount){
                            reactionLab = undefined
                        }
                    }else{
                        reactionLab = undefined
                    }
                }
                if (reactionLab === undefined && Game.spawns['Origin'].memory.assess.access.structures[roomName].usableLabs["vacant"].length > 0){
                    reactionLab = Game.spawns['Origin'].memory.assess.access.structures[roomName].usableLabs["vacant"] // Arr
                    reactionLab = _.filter(reactionLab,(labId)=>Game.getObjectById(labId).cooldown === 0)
                    reactionLab = reactionLab[0]
                }
                if (reactionLab !== undefined){
                    Game.getObjectById(reactionLab).runReaction(Game.getObjectById(chosenLabs[0]),Game.getObjectById(chosenLabs[1]))
                    console.log("       Finish Reaction: ",requiredCompounds[0],"+",requiredCompounds[1],"->",_mineral)
                }
            }
        }
    }
}
module.exports = roleLab

