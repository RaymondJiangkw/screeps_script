const utils = require('utils')
const factoryConfig = require('configuration.Factory')
const towerConfig = require('configuration.Tower')
const terminalConfig = require('configuration.Terminal')
const labConfig = require('configuration.Lab')
const powerSpawnConfig = require('configuration.PowerSpawn')
const aidConfig = require('configuration.Aid')
const sendConfig = require('configuration.Send')
const Constants = require('constants')
const needEnergy = function(object){
    return object.store.getFreeCapacity(RESOURCE_ENERGY) > 0
}
module.exports = function() {
    if (!global.task.transfer) global.task.transfer = {}
    for (var roomName of global.rooms.my){
        // Basic Transfer
        var spawns = _.filter(Game.rooms[roomName].spawns,needEnergy)
        var extensions = _.filter(Game.rooms[roomName].extensions,needEnergy)
        var towers = _.filter(Game.rooms[roomName].towers,(t)=>t.store.getUsedCapacity(RESOURCE_ENERGY) <= towerConfig.reservedEnergy)
        if (spawns.length > 0) Game.rooms[roomName].AddTransferTask("core","energy","spawns",RESOURCE_ENERGY,"full",undefined,undefined,1,false);
        if (extensions.length > 0) Game.rooms[roomName].AddTransferTask("core","energy","extensions",RESOURCE_ENERGY,"full",undefined,undefined,1,false);
        if (towers.length > 0) Game.rooms[roomName].AddTransferTask("defense","energy","towers",RESOURCE_ENERGY);
        if (Game.rooms[roomName].powerSpawn && Game.rooms[roomName].powerSpawn.store.getUsedCapacity(RESOURCE_ENERGY) <= powerSpawnConfig.startChargeEnergy) {
            Game.rooms[roomName].AddTransferTask("advanced","energy",Game.rooms[roomName].powerSpawn.id,RESOURCE_ENERGY);
        }
        
        if (global.containers[roomName].mineral){
            var mineralContainer = global.containers[roomName].mineral
            if (mineralContainer.store.getFreeCapacity() === 0 || (mineralContainer.store.getUsedCapacity() > 0 && Game.rooms[roomName].mineral.mineralAmount === 0)){
                var checkOrders = ["storage","terminal","factory"]
                for (var structure of checkOrders) {
                    if (Game.rooms[roomName][structure] && Game.rooms[roomName][structure].store.getFreeCapacity() > 0) {
                        Game.rooms[roomName].AddTransferTask("core",mineralContainer.id,Game.rooms[roomName][structure].id,Game.rooms[roomName].mineral.mineralType,"exhaust");
                        break;
                    }
                }
            }
        }

        if (!global.task.transfer[roomName]) global.task.transfer[roomName] = {}
        if (!global.task.transfer[roomName].cachedExpirationTime || global.task.transfer[roomName].cachedExpirationTime <= Game.time){
            global.task.transfer[roomName].cachedExpirationTime = utils.getCacheExpiration(15) + Game.time
            // Transfer Energy to labs / factory
            var labs = _.filter(Game.rooms[roomName].labs,needEnergy)
            if (labs.length > 0) Game.rooms[roomName].AddTransferTask("advanced","energy","labs",RESOURCE_ENERGY);

            if (Game.rooms[roomName].factory && Game.rooms[roomName].factory.store.getUsedCapacity(RESOURCE_ENERGY) <= factoryConfig.reservedEnergy) Game.rooms[roomName].AddTransferTask("advanced","energy",Game.rooms[roomName].factory.id,RESOURCE_ENERGY)
            
            // Transfer Terminal
            if (Game.rooms[roomName].terminal){
                var terminalEnergy = terminalConfig.baseReservedEnergy
                if (terminalConfig["sellingEnergy"][roomName]) terminalEnergy += terminalConfig["sellingEnergy"][roomName]
                terminalEnergy -= Game.rooms[roomName].terminal.store[RESOURCE_ENERGY]
                if (terminalEnergy > 0) Game.rooms[roomName].AddTransferTask("advanced","energy",Game.rooms[roomName].terminal.id,RESOURCE_ENERGY,terminalEnergy)

                var thisMineralType = Game.rooms[roomName].mineral.mineralType
                if (global.resources[roomName][thisMineralType]){
                    var terminalMineral = terminalConfig.baseReservedMineral
                    if (terminalConfig["sellingMineral"][roomName]) terminalMineral += terminalConfig["sellingMineral"][roomName]
                    terminalMineral -= Game.rooms[roomName].terminal.store.getUsedCapacity(thisMineralType)
                    if (terminalMineral > 0 && global.resources[roomName][thisMineralType] && global.resources[roomName][thisMineralType]["storage"] > 0) Game.rooms[roomName].AddTransferTask("advanced",Game.rooms[roomName].storage.id,Game.rooms[roomName].terminal.id,thisMineralType,Math.min(terminalMineral,global.resources[roomName][thisMineralType]["storage"]))
                }
            }
            
            // Charge Nuker
            if (Game.rooms[roomName].nuker && Game.rooms[roomName].nuker.store.getFreeCapacity(RESOURCE_GHODIUM) > 0 && global.resources[roomName][RESOURCE_GHODIUM]){
                var checkOrders = ["labs","terminal","storage","factory"]
                for (var structure of checkOrders){
                    if (global.resources[roomName][RESOURCE_GHODIUM][structure] > 0){
                        Game.rooms[roomName].AddTransferTask("defense",structure,Game.rooms[roomName].nuker.id,RESOURCE_GHODIUM,"full");
                        break;
                    }
                }
            }

            // Charge Power
            if (global.resources[roomName][RESOURCE_POWER] && Game.rooms[roomName].powerSpawn && Game.rooms[roomName].powerSpawn.store.getFreeCapacity(RESOURCE_POWER) > 50){
                var checkOrders = ["storage","terminal"]
                for (var structure of checkOrders){
                    if (global.resources[roomName][RESOURCE_POWER][structure] > 0){
                        Game.rooms[roomName].AddTransferTask("advanced",structure,Game.rooms[roomName].powerSpawn.id,RESOURCE_POWER,"full");
                    }
                }
            }

            // Transfer Lab
            if (Game.rooms[roomName].labs.length > 0 && labConfig[roomName]){
                const mode = labConfig[roomName]["mode"]
                if ((mode === "focus" || mode === "default") && global.labStructures[roomName].core.length === 2){
                    const resourceType = utils.getLabTarget(roomName,mode)
                    const resourceTypes = labConfig[roomName][mode]
                    if (resourceType){
                        var _components = Constants.labFormula[resourceType]
                        var coreLabs = []
                        const coreLabA = Game.getObjectById(global.labStructures[roomName].core[0]);
                        const coreLabB = Game.getObjectById(global.labStructures[roomName].core[1]);
                        if (coreLabA.mineralType == _components[0] || coreLabB.mineralType == _components[1]) coreLabs = [coreLabA,coreLabB]
                        else coreLabs = [coreLabB,coreLabA]

                        var lackRefills = [false,false],skip = false
                        for (var i = 0; i < 2; i++){
                            var coreLab = coreLabs[i]
                            if (coreLab.mineralType !== _components[i] || coreLab.store[_components[i]] <= labConfig.leastRefillAmount) {
                                if (!global.resources[roomName][_components[i]] || global.resources[roomName][_components[i]]["utils"] <= 5) lackRefills[i] = true;
                            }
                        }
                        if (mode === "default") skip = lackRefills[0] || lackRefills[1];

                        if (skip) {
                            var allowable = labConfig[roomName].allowedCompounds.indexOf(resourceType) > 0;
                            var necessary1 = global.labs[roomName][resourceType] && global.labs[roomName][resourceType].length === 0 && global.labs[roomName]["vacant"].length > 0
                            var necessary2 = global.labs[roomName][resourceType] && global.labs[roomName][resourceType].length > 0 && global.labs[roomName][resourceType][0].store[resourceType] < 30
                            var possible = global.resources[roomName][resourceType] && global.resources[roomName][resourceType]["utils"] >= 30
                            if (allowable && possible && (necessary1 || necessary2)) Game.rooms[roomName].AddTransferTask("advanced","resource","lab",resourceType,"full");
                            else Game.rooms[roomName].memory.labCur[mode] = (Game.rooms[roomName].memory.labCur[mode] + 1) % resourceTypes.length;
                        }else{
                            // Input Labs
                            for (var i = 0; i < coreLabs.length;i++){
                                var coreLab = coreLabs[i]
                                if (!coreLab.mineralType || (coreLab.mineralType === _components[i] && coreLab.store[_components[i]] <= labConfig.leastRefillAmount)){
                                    Game.rooms[roomName].AddTransferTask("advanced","resource",coreLab.id,_components[i],"full");
                                }else if (coreLab.mineralType !== _components[i]){
                                    if (Game.rooms[roomName].storage) Game.rooms[roomName].AddTransferTask("advanced",coreLab.id,Game.rooms[roomName].storage.id,coreLab.mineralType,"exhaust");
                                }
                            }

                            // Output Labs
                            if (Game.rooms[roomName].storage){
                                var OutputLabs = [].concat(global.labStructures[roomName]["XGroup"],global.labStructures[roomName]["YGroup"])
                                for (var groupLabs of OutputLabs){
                                for (var labId of groupLabs){
                                    var lab = Game.getObjectById(labId);
                                    var condition = false
                                    var duplicate = lab.mineralType && global.labs[roomName][lab.mineralType].indexOf(lab) > 0;
                                    var notConsistent = lab.mineralType && lab.mineralType !== resourceType;
                                    var notAllowed = lab.mineralType && labConfig[roomName].allowedCompounds.indexOf(lab.mineralType) < 0;
                                    var overDue = lab.mineralType && lab.store.getFreeCapacity(lab.mineralType) <= labConfig.leastTransferAmount;
                                    var tooFew = lab.mineralType && lab.store[lab.mineralType] < 30;
                                    
                                    if (mode === "focus") condition = notConsistent || overDue
                                    else if (mode === "default") condition = (notAllowed && notConsistent) || (overDue && !notConsistent) || (!notAllowed && notConsistent && duplicate) || (tooFew && notConsistent)
                                    if (condition) Game.rooms[roomName].AddTransferTask("advanced",lab.id,Game.rooms[roomName].storage.id,lab.mineralType,"exhaust")
                                }
                                }
                            }
                        }
                    }else{
                        const coreLabA = Game.getObjectById(global.labStructures[roomName].core[0]);
                        const coreLabB = Game.getObjectById(global.labStructures[roomName].core[1]);
                        const coreLabs = [coreLabA,coreLabB];
                        for (var i = 0; i < coreLabs.length;i++){
                            var coreLab = coreLabs[i]
                            if (coreLab.mineralType){
                                if (Game.rooms[roomName].storage) Game.rooms[roomName].AddTransferTask("advanced",coreLab.id,Game.rooms[roomName].storage.id,coreLab.mineralType,"exhaust");
                            }
                        }
                        if (Game.rooms[roomName].storage){
                            var OutputLabs = [].concat(global.labStructures[roomName]["XGroup"],global.labStructures[roomName]["YGroup"])
                            for (var groupLabs of OutputLabs){
                            for (var labId of groupLabs){
                                var lab = Game.getObjectById(labId);
                                var condition = false
                                var notAllowed = lab.mineralType && labConfig[roomName].allowedCompounds.indexOf(lab.mineralType) < 0;
                                var tooFew = lab.mineralType && lab.store[lab.mineralType] < 30;
                                
                                condition = tooFew || notAllowed
                                if (condition) Game.rooms[roomName].AddTransferTask("advanced",lab.id,Game.rooms[roomName].storage.id,lab.mineralType,"exhaust")
                            }
                            }
                        }
                    }
                }else if (mode === "reverse" && global.labStructures[roomName].core.length === 2){
                    const resourceType = utils.getLabTarget(roomName,mode)
                    const resourceTypes = labConfig[roomName][mode]
                    if (resourceType) {
                        var skip = true;
                        if (!global.resources[roomName][resourceType] || global.resources[roomName][resourceType]["utils"] <= 5){
                            var InputLabs = [].concat(global.labStructures[roomName]["XGroup"],global.labStructures[roomName]["YGroup"]);
                            for (var groupLabs of InputLabs){
                            for (var labId of groupLabs){
                                var lab = Game.getObjectById(labId);
                                if (lab.store[resourceType] >= 5){
                                    skip = false;
                                    break;
                                }
                            }
                            if (!skip) break;
                            }
                        }else skip = false;

                        if (skip) Game.rooms[roomName].memory.labCur[mode] = (Game.rooms[roomName].memory.labCur[mode] + 1) % resourceTypes.length;
                        else{
                            // Input Labs
                            var InputLabs = [].concat(global.labStructures[roomName]["XGroup"],global.labStructures[roomName]["YGroup"]);
                            for (var groupLabs of InputLabs){
                            for (var labId of groupLabs){
                                var lab = Game.getObjectById(labId);
                                if (!lab.mineralType || (lab.mineralType === resourceType && lab.store[mineralType] <= labConfig.leastRefillAmount)){
                                    Game.rooms[roomName].AddTransferTask("advanced","resource",lab.id,resourceType,"full");
                                }else if (labConfig[roomName].allowedCompounds.indexOf(lab.mineralType) < 0 || lab.store[lab.mineralType] < 30 || global.labs[roomName][lab.mineralType].indexOf(lab) > 0){
                                    if (Game.rooms[roomName].storage) Game.rooms[roomName].AddTransferTask("advanced",lab.id,Game.rooms[roomName].storage.id,lab.mineralType,"exhaust");
                                }
                            }
                            }

                            // Output Labs
                            var core1 = Game.getObjectById(global.labStructures[roomName].core[0]);
                            var core2 = Game.getObjectById(global.labStructures[roomName].core[1]);
                            var _components = Constants.labFormula[resourceType]
                            var cores = []
                            if (core1.mineralType === _components[0] || core2.mineralType === _components[1]) cores = [core1,core2];
                            else cores = [core2,core1];
                            for (var i = 0; i < 2; i++){
                                var coreLab = cores[i]
                                if (coreLab.mineralType !== _components[i] || coreLab.store.getFreeCapacity(_components[i]) <= labConfig.leastTransferAmount){
                                    if (Game.rooms[roomName].storage) Game.rooms[roomName].AddTransferTask("advanced",coreLab.id,Game.rooms[roomName].storage.id,coreLab.mineralType,"exhaust");
                                }
                            }
                            
                        }
                    }
                }else if (mode === "clear" && Game.rooms[roomName].storage){
                    for (var lab of Game.rooms[roomName].labs) if (lab.mineralType) Game.rooms[roomName].AddTransferTask("advanced",lab.id,Game.rooms[roomName].storage.id,lab.mineralType,"exhaust")
                }
            }

            // Transfer Factory
            if (Game.rooms[roomName].factory && factoryConfig[roomName]){
                for (var productionInfo of factoryConfig[roomName]){
                    var production = productionInfo[0]
                    var existingAmount = Game.rooms[roomName].factory.store[production]
                    var diffAmount = Infinity
                    if (productionInfo[1] !== "greedy") diffAmount = productionInfo[1] - existingAmount
                    if (diffAmount > 0){
                        for (var component in COMMODITIES[production].components){
                            var _diffAmount = COMMODITIES[production].components[component] * (diffAmount / COMMODITIES[production].amount)  - Game.rooms[roomName].factory.store[component];
                            if (_diffAmount > 0 && global.resources[roomName][component]){
                                var checkOrders = ["storage","terminal"]
                                for (var retrievedStructure of checkOrders){
                                    if (global.resources[roomName][component][retrievedStructure] === 0) continue
                                    var amount = Math.min(_diffAmount,global.resources[roomName][component][retrievedStructure])
                                    if (amount >= COMMODITIES[production].components[component]) Game.rooms[roomName].AddTransferTask("advanced",retrievedStructure,Game.rooms[roomName].factory.id,component,amount)
                                }
                            }
                        }
                    }
                }
            }

            // Sell Commodities
            if (terminalConfig.sellingGoods[roomName] && Game.rooms[roomName].terminal){
                for (var info of terminalConfig.sellingGoods[roomName]){
                    const resourceType = info[0]
                    const reservedAmount = info[1]
                    if (!global.resources[roomName][resourceType]) continue
                    if (global.resources[roomName][resourceType]["total"] <= reservedAmount) continue

                    const sellingAmount = global.resources[roomName][resourceType]["total"] - reservedAmount
                    var checkOrders = ["factory","labs","storage"]
                    for (var retrievedStructure of checkOrders){
                        if (global.resources[roomName][resourceType][retrievedStructure] === 0) continue
                        var amount = Math.min(sellingAmount,global.resources[roomName][resourceType][retrievedStructure])
                        if (Game.rooms[roomName].AddTransferTask("advanced",retrievedStructure,Game.rooms[roomName].terminal.id,resourceType,amount)) sellingAmount -= amount;
                    }
                }
            }
        }

        if (Game.rooms[roomName].storage && (!global.task.transfer[roomName]["tomb_ruinExpirationTime"] || global.task.transfer[roomName]["tomb_ruinExpirationTime"] <= Game.time)){
            global.task.transfer[roomName]["tomb_ruinExpirationTime"] = Game.time + utils.getCacheExpiration()
            var tombStones = Game.rooms[roomName].find(FIND_TOMBSTONES,{filter:(t)=>t.store.getUsedCapacity() > 0})
            tombStones.sort((a,b)=>b.store.getUsedCapacity() - a.store.getUsedCapacity())
            for (var tombStone of tombStones) Game.rooms[roomName].AddTransferTask("defense",tombStone.id,Game.rooms[roomName].storage.id,undefined,"exhaust")
            Game.rooms[roomName].ruins.sort((a,b)=>b.store.getUsedCapacity() - a.store.getUsedCapacity())
            for (var ruin of Game.rooms[roomName].ruins) Game.rooms[roomName].AddTransferTask("defense",ruin.id,Game.rooms[roomName].storage.id,undefined,"exhaust")
        }
    }
 
    for (var hostRoom in aidConfig){
        if (global.rooms.my.indexOf(hostRoom) < 0) continue
        for (var aidInfo of aidConfig[hostRoom]){
            var fromRoom = aidInfo.fromRoom
            if (global.rooms.my.indexOf(fromRoom) < 0) continue
            var from = aidInfo.from, to = aidInfo.to
            if (!Game.rooms[hostRoom][to] || !Game.rooms[fromRoom][from]) continue
            if (Game.rooms[hostRoom][to].store[aidInfo.resourceType] > aidInfo.toBeginAmount) continue
            if (Game.rooms[fromRoom][from].store[aidInfo.resourceType] < aidInfo.beginAmount) continue
            Game.rooms[hostRoom].AddAidTask(Game.rooms[fromRoom][from].id,fromRoom,fromRoom,Game.rooms[hostRoom][to].id,hostRoom,aidInfo.resourceType,aidInfo.endAmount,aidInfo.toEndAmount)
        }
    }

    for (var hostRoom in sendConfig){
        if (global.rooms.my.indexOf(hostRoom) < 0) continue
        if (!Game.rooms[hostRoom].terminal) continue
        for (var sendInfo of sendConfig[hostRoom]){
            if (!Game.rooms[sendInfo.targetRoom].terminal) continue
            if (!global.resources[hostRoom][sendInfo.resourceType]) continue
            var transferAmount = sendInfo.baseAmount + sendInfo.sendAmount - Game.rooms[hostRoom].terminal.store[sendInfo.resourceType]
            if (transferAmount <= 0) continue
            if (Game.rooms[sendInfo.targetRoom].terminal.store[sendInfo.resourceType] >= sendInfo.targetStopAmount || Game.rooms[sendInfo.targetRoom].terminal.store.getUsedCapacity() >= sendInfo.targetStopCapacity) continue
            var checkOrders = ["storage","labs","factory"]
            for (var structure of checkOrders){
                var availableAmount = global.resources[hostRoom][sendInfo.resourceType][structure]
                if (availableAmount > 0) {
                    Game.rooms[hostRoom].AddTransferTask("advanced",structure,Game.rooms[hostRoom].terminal.id,sendInfo.resourceType,Math.min(transferAmount,availableAmount))
                }
            }
        }
    }
}