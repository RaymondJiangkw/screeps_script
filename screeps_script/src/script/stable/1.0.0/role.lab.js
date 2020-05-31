const helpFunc = require("func")
const reference = require("reference")
const task = require("task.general")
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
        const reversedList = reference.production.lab.reversedCompounds
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
                        chosenLabs.push(chosenLabArr[chosenLabArr.length - 1])
                    }else{
                        continue
                    }
                }
                if (chosenLabs.length < requiredCompounds.length){
                    continue
                }
                let reactionLab = undefined
                if (Game.spawns['Origin'].memory.init.groupedLabs.storedMineralTypes[roomName].indexOf(_mineral)!==-1){
                    reactionLab = Game.spawns['Origin'].memory.assess.access.structures[roomName].usableLabs[_mineral] // Arr
                    reactionLab = _.filter(reactionLab,(labId)=>Game.getObjectById(labId).cooldown === 0)
                    if (reactionLab.length > 0){
                        reactionLab = reactionLab[0]
                    }else{
                        reactionLab = undefined
                    }
                }
                if (reactionLab === undefined && Game.spawns['Origin'].memory.assess.access.structures[roomName].usableLabs["vacant"].length > 0 &&
                    (!Game.spawns['Origin'].memory.assess.access.structures[roomName].usableLabs[_mineral] ||
                      helpFunc.inArr(_mineral,reference.production.lab.allowedStack) ) ){
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
        for (let i = 0; i < reversedList.length;i++){
            const reversedCompound = reversedList[i][0]
            const reversedCompountAmount = reversedList[i][1]
            const output = reference.production.lab.formula[reversedCompound]
            const _reversedCompoundLab = helpFunc.looseGetAvailableLab(roomName,reversedCompound)
            const outputLab1 = helpFunc.getAvailableLab(roomName,output[0]);
            const outputLab2 = helpFunc.getAvailableLab(roomName,output[1]);
            if (_reversedCompoundLab !== undefined && _reversedCompoundLab !== null){
                if (outputLab1 != undefined && outputLab2 != undefined){
                    Game.getObjectById(_reversedCompoundLab).reverseReaction(Game.getObjectById(outputLab1),Game.getObjectById(outputLab2))
                }
            }
            const compountInfo  = Game.spawns['Origin'].memory.init.infoCompounds[roomName][reversedCompound]
            if (_reversedCompoundLab === undefined){
                if (compountInfo.all - compountInfo.lab > 0){
                    task.addTransfer(roomName,"lab",reversedCompound,Math.min(compountInfo.all,reversedCompountAmount)-compountInfo.lab)
                }
            }
            helpFunc.insertVacantLab(roomName,outputLab1,output[0])
            helpFunc.insertVacantLab(roomName,outputLab2,output[1])
        }
    }
}
module.exports = roleLab