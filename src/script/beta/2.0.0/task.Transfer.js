const utils = require('utils')
const factoryConfig = require('configuration.Factory')
const towerConfig = require('configuration.Tower')
const terminalConfig = require('configuration.Terminal')
const labConfig = require('configuration.Lab')
const powerSpawnConfig = require('configuration.PowerSpawn')
const aidConfig = require('configuration.Aid')
const sendConfig = require('configuration.Send')
const Constants = require('constants')
const ADVANCED_BUCKET_LIMIT = 5000;
const needEnergy = function(object){
    return object.store.getFreeCapacity(RESOURCE_ENERGY) > 0
}
module.exports = function() {
    if (!global.task.transfer) global.task.transfer = {}
    for (var roomName of global.rooms.my){
        // Basic Transfer
        var spawns = _.filter(Game.rooms[roomName].spawns,needEnergy);
        var extensions = _.filter(Game.rooms[roomName].extensions,needEnergy);
        var towers = _.filter(Game.rooms[roomName].towers,(t)=>t.store.getUsedCapacity(RESOURCE_ENERGY) <= towerConfig.reservedEnergy);
        var empty_towers = _.filter(Game.rooms[roomName].towers,(t)=>t.store.getUsedCapacity(RESOURCE_ENERGY) === 0);
        if (spawns.length > 0) Game.rooms[roomName].AddTransferTask("core",{target:"resource",roomName},{target:"spawns",roomName},RESOURCE_ENERGY,"full",{changeable:false,groupsNum:Infinity});
        if (extensions.length > 0) Game.rooms[roomName].AddTransferTask("core",{target:"resource",roomName},{target:"extensions",roomName},RESOURCE_ENERGY,"full",{changeable:false,groupsNum:Infinity});
        if (towers.length > 0) Game.rooms[roomName].AddTransferTask("defense",{target:"resource",roomName},{target:"towers",roomName},RESOURCE_ENERGY,"full",{groupsNum:Infinity});
        if (empty_towers.length > 0) Game.rooms[roomName].AddTransferTask("core",{target:"resource",roomName},{target:"towers",roomName},RESOURCE_ENERGY,"full",{groupsNum:Infinity});
        if (Game.rooms[roomName].powerSpawn) {
            const powerSpawn = Game.rooms[roomName].powerSpawn;
            if (powerSpawn.store.getUsedCapacity(RESOURCE_ENERGY) <= powerSpawnConfig.startChargeEnergy) {
                const structure = Game.rooms[roomName].getStructure4Withdraw(RESOURCE_ENERGY,0);
                if (structure) Game.rooms[roomName].AddTransferTask("basic",{target:structure.id,roomName},{target:"powerSpawn",roomName},RESOURCE_ENERGY,"full");
            }
            if (powerSpawn.store.getUsedCapacity(RESOURCE_POWER) < 50) {
                const structure = Game.rooms[roomName].getStructure4Withdraw(RESOURCE_POWER,0);
                if (structure) Game.rooms[roomName].AddTransferTask("basic",{target:structure.id,roomName},{target:"powerSpawn",roomName},RESOURCE_POWER,"full");
            }
        }
        
        if (global.containers[roomName].mineral){
            const mineralContainer = global.containers[roomName].mineral;
            if (mineralContainer.store.getFreeCapacity() <= 50 || (mineralContainer.store.getUsedCapacity() >= 50 && Game.rooms[roomName].mineral.mineralAmount === 0)){
                const structure = Game.rooms[roomName].getStructure4Store();
                if (structure) Game.rooms[roomName].AddTransferTask("core",{target:mineralContainer.id,roomName},{target:structure.id,roomName},Game.rooms[roomName].mineral.mineralType,"exhaust");
            }
        }

        if (!global.task.transfer[roomName]) global.task.transfer[roomName] = {}
        if ((!global.task.transfer[roomName].cachedExpirationTime || global.task.transfer[roomName].cachedExpirationTime <= Game.time) && Game.cpu.bucket >= ADVANCED_BUCKET_LIMIT){
            global.task.transfer[roomName].cachedExpirationTime = utils.getCacheExpiration() + Game.time;
            // Transfer Energy to labs / factory
            const labs = _.filter(Game.rooms[roomName].labs,needEnergy)
            if (labs.length > 0) Game.rooms[roomName].AddTransferTask("advanced",{target:"resource",roomName},{target:"labs",roomName},RESOURCE_ENERGY,"full");
            const factory_energy_structure = Game.rooms[roomName].getStructure4Withdraw(RESOURCE_ENERGY,0,STRUCTURE_FACTORY);
            const factory = Game.rooms[roomName].factory;
            if (factory && factory.store.getUsedCapacity(RESOURCE_ENERGY) <= factoryConfig.reservedEnergy && factory_energy_structure) Game.rooms[roomName].AddTransferTask("basic",{target:factory_energy_structure.id,roomName},{target:"factory",roomName},RESOURCE_ENERGY,factoryConfig.reservedEnergy-factory.store.getUsedCapacity(RESOURCE_ENERGY));
            
            // Transfer Terminal
            if (Game.rooms[roomName].terminal){
                var terminalEnergy = terminalConfig.baseReservedEnergy
                if (terminalConfig["sellingEnergy"][roomName]) terminalEnergy += terminalConfig["sellingEnergy"][roomName]
                terminalEnergy -= Game.rooms[roomName].terminal.store[RESOURCE_ENERGY];
                const terminal_energy_structure = Game.rooms[roomName].getStructure4Withdraw(RESOURCE_ENERGY,0,STRUCTURE_TERMINAL);
                if (terminal_energy_structure && terminalEnergy > 0) Game.rooms[roomName].AddTransferTask("advanced",{target:terminal_energy_structure.id,roomName},{target:"terminal",roomName},RESOURCE_ENERGY,terminalEnergy);

                var thisMineralType = Game.rooms[roomName].mineral.mineralType
                if (global.resources[roomName][thisMineralType]){
                    var terminalMineral = terminalConfig.baseReservedMineral
                    if (terminalConfig["sellingMineral"][roomName]) terminalMineral += terminalConfig["sellingMineral"][roomName]
                    terminalMineral -= Game.rooms[roomName].terminal.store.getUsedCapacity(thisMineralType);
                    if (terminalMineral > 0 && global.resources[roomName][thisMineralType] && global.resources[roomName][thisMineralType]["storage"] > 0) Game.rooms[roomName].AddTransferTask("advanced",{target:"storage",roomName},{target:"terminal",roomName},thisMineralType,terminalMineral);
                }
            }
            
            // Charge Nuker
            if (Game.rooms[roomName].nuker){
                if (Game.rooms[roomName].nuker.store.getFreeCapacity(RESOURCE_GHODIUM) > 0 && global.resources[roomName][RESOURCE_GHODIUM]){
                    const structure = Game.rooms[roomName].getStructure4Withdraw(RESOURCE_GHODIUM,0);
                    if (structure) Game.rooms[roomName].AddTransferTask("defense",{target:structure.id,roomName},{target:"nuker",roomName},RESOURCE_GHODIUM,"full");
                }
                if (Game.rooms[roomName].nuker.store.getFreeCapacity(RESOURCE_ENERGY) > 0) Game.rooms[roomName].AddTransferTask("defense",{target:"resource",roomName},{target:"nuker",roomName},RESOURCE_ENERGY,"full");
            }

            // Transfer Lab
            if (Game.rooms[roomName].labs.length > 0 && labConfig[roomName]){
                if (labConfig[roomName].allocate) {
                    for (const labId in labConfig[roomName].allocate) {
                        const lab = Game.getObjectById(labId);
                        if (!lab) continue;
                        const _resourceType = labConfig[roomName].allocate[labId];
                        if (!global.resources[roomName][_resourceType] || global.resources[roomName][_resourceType]["utils"] <= 5) continue;
                        const structureStore = Game.rooms[roomName].getStructure4Store();
                        const structureWithdraw = Game.rooms[roomName].getStructure4Withdraw(_resourceType,5);
                        if (lab.mineralType && lab.mineralType !== _resourceType && structureStore) Game.rooms[roomName].AddTransferTask("defense",{target:labId,roomName},{target:structureStore.id,roomName},lab.mineralType,"exhaust");
                        else if ((!lab.mineralType || lab.store.getFreeCapacity(_resourceType) > 0) && structureWithdraw) Game.rooms[roomName].AddTransferTask("defense",{target:structureWithdraw.id,roomName},{target:labId,roomName},_resourceType,"full");
                        if (lab.store.getFreeCapacity(RESOURCE_ENERGY) > 0) Game.rooms[roomName].AddTransferTask("defense",{target:"resource",roomName},{target:labId,roomName},RESOURCE_ENERGY,"full");
                    }
                }
                
                const mode = labConfig[roomName]["mode"];
                if ((mode === "focus" || mode === "default") && global.labStructures[roomName].core.length === 2){
                    const resourceType = utils.getLabTarget(roomName,mode);
                    const resourceTypes = labConfig[roomName][mode];
                    if (resourceType){
                        var _components = Constants.labFormula[resourceType];
                        var coreLabs = [];
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
                            var allowable = labConfig[roomName].allowedCompounds.indexOf(resourceType) >= 0;
                            var necessary1 = (!global.labs[roomName][resourceType] || global.labs[roomName][resourceType].length === 0) && (global.labs[roomName]["vacant"] && global.labs[roomName]["vacant"].length > 0);
                            var necessary2 = global.labs[roomName][resourceType] && global.labs[roomName][resourceType].length > 0 && global.labs[roomName][resourceType][0].store[resourceType] < 30;
                            var possible = global.resources[roomName][resourceType] && global.resources[roomName][resourceType]["utils"] >= 30;
                            if (allowable && possible && (necessary1 || necessary2)) {
                                Game.rooms[roomName].AddTransferTask("advanced",{target:"resource",roomName},{target:"labs",roomName},resourceType,"full");
                            }else {
                                Game.rooms[roomName].memory.labCur[mode] = (Game.rooms[roomName].memory.labCur[mode] + 1) % resourceTypes.length;
                            }
                        }else{
                            // Input Labs
                            for (var i = 0; i < coreLabs.length;i++){
                                var coreLab = coreLabs[i]
                                if (!coreLab.mineralType || (coreLab.mineralType === _components[i] && coreLab.store[_components[i]] <= labConfig.leastRefillAmount)){
                                    Game.rooms[roomName].AddTransferTask("advanced",{target:"resource",roomName},{target:coreLab.id,roomName},_components[i],"full");
                                }else if (coreLab.mineralType !== _components[i]){
                                    const structure = Game.rooms[roomName].getStructure4Store();
                                    if (structure) Game.rooms[roomName].AddTransferTask("advanced",{target:coreLab.id,roomName},{target:structure.id,roomName},coreLab.mineralType,"exhaust");
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
                                    const structure = Game.rooms[roomName].getStructure4Store();
                                    if (condition && structure) Game.rooms[roomName].AddTransferTask("advanced",{target:lab.id,roomName},{target:structure.id,roomName},lab.mineralType,"exhaust")
                                }
                                }
                            }
                        }
                    }else{
                        const coreLabA = Game.getObjectById(global.labStructures[roomName].core[0]);
                        const coreLabB = Game.getObjectById(global.labStructures[roomName].core[1]);
                        const coreLabs = [coreLabA,coreLabB];
                        const structure = Game.rooms[roomName].getStructure4Store();
                        for (var i = 0; i < coreLabs.length;i++){
                            var coreLab = coreLabs[i]
                            if (coreLab.mineralType){
                                if (structure) Game.rooms[roomName].AddTransferTask("advanced",{target:coreLab.id,roomName},{target:structure.id,roomName},coreLab.mineralType,"exhaust");
                            }
                        }
                        if (structure){
                            var OutputLabs = [].concat(global.labStructures[roomName]["XGroup"],global.labStructures[roomName]["YGroup"])
                            for (var groupLabs of OutputLabs){
                            for (var labId of groupLabs){
                                var lab = Game.getObjectById(labId);
                                var condition = false
                                var notAllowed = lab.mineralType && labConfig[roomName].allowedCompounds.indexOf(lab.mineralType) < 0;
                                var tooFew = lab.mineralType && lab.store[lab.mineralType] < 30;
                                
                                condition = tooFew || notAllowed
                                if (condition) Game.rooms[roomName].AddTransferTask("advanced",{target:lab.id,roomName},{target:structure.id,roomName},lab.mineralType,"exhaust")
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
                                if (!lab.mineralType || (lab.mineralType === resourceType && lab.store[lab.mineralType] <= labConfig.leastRefillAmount)){
                                    Game.rooms[roomName].AddTransferTask("advanced",{target:"resource",roomName},{target:lab.id,roomName},resourceType,"full");
                                }else if (lab.mineralType !== resourceType && (labConfig[roomName].allowedCompounds.indexOf(lab.mineralType) < 0 || lab.store[lab.mineralType] < 30 || global.labs[roomName][lab.mineralType].indexOf(lab) > 0)){
                                    const structure = Game.rooms[roomName].getStructure4Store();
                                    if (structure) Game.rooms[roomName].AddTransferTask("advanced",{target:lab.id,roomName},{target:structure.id,roomName},lab.mineralType,"exhaust");
                                }
                            }
                            }

                            // Output Labs
                            var core1 = Game.getObjectById(global.labStructures[roomName].core[0]);
                            var core2 = Game.getObjectById(global.labStructures[roomName].core[1]);
                            var _components = Constants.labFormula[resourceType]
                            var cores = [];
                            if (core1.mineralType === _components[0] || core2.mineralType === _components[1]) cores = [core1,core2];
                            else cores = [core2,core1];
                            for (var i = 0; i < 2; i++){
                                var coreLab = cores[i]
                                if (coreLab.mineralType !== _components[i] || coreLab.store.getFreeCapacity(_components[i]) <= labConfig.leastTransferAmount){
                                    const structure = Game.rooms[roomName].getStructure4Store();
                                    if (structure) Game.rooms[roomName].AddTransferTask("advanced",{target:coreLab.id,roomName},{target:structure.id,roomName},coreLab.mineralType,"exhaust");
                                }
                            }
                            
                        }
                    }
                }else if (mode === "clear"){
                    const structure = Game.rooms[roomName].getStructure4Store();
                    if (structure) for (var lab of Game.rooms[roomName].labs) if (lab.mineralType) Game.rooms[roomName].AddTransferTask("advanced",{target:lab.id,roomName},{target:structure.id,roomName},lab.mineralType,"exhaust")
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
                                const structure = Game.rooms[roomName].getStructure4Withdraw(component,0,STRUCTURE_FACTORY);
                                if (structure) {
                                    const amount = Math.min(_diffAmount,structure.store[component]);
                                    if (amount >= COMMODITIES[production].components[component]) Game.rooms[roomName].AddTransferTask("basic",{target:structure.id,roomName},{target:"factory",roomName},component,amount);
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

                    var sellingAmount = global.resources[roomName][resourceType]["total"] - reservedAmount;
                    const structure = Game.rooms[roomName].getStructure4Withdraw(resourceType,0,STRUCTURE_TERMINAL);
                    if (structure) {
                        const amount = Math.min(sellingAmount,structure.store[resourceType]);
                        Game.rooms[roomName].AddTransferTask("basic",{target:structure.id,roomName},{target:"terminal",roomName},resourceType,amount);
                    }
                }
            }
        }

        if (Game.rooms[roomName].storage && Game.rooms[roomName].storage.store.getFreeCapacity() > 0 && (!global.task.transfer[roomName]["tomb_ruinExpirationTime"] || global.task.transfer[roomName]["tomb_ruinExpirationTime"] <= Game.time)){
            global.task.transfer[roomName]["tomb_ruinExpirationTime"] = Game.time + utils.getCacheExpiration()
            var tombStones = Game.rooms[roomName].find(FIND_TOMBSTONES,{filter:(t)=>Object.keys(t.store).length > 0});
            for (var tombStone of tombStones) Game.rooms[roomName].AddTransferTask("defense",{target:tombStone.id,roomName},{target:"storage",roomName},undefined,"exhaust");
            Game.rooms[roomName].ruins.sort((a,b)=>b.store.getUsedCapacity() - a.store.getUsedCapacity())
            for (var ruin of Game.rooms[roomName].ruins) Game.rooms[roomName].AddTransferTask("defense",{target:ruin.id,roomName},{target:"storage",roomName},undefined,"exhaust")
        }
    }
 
    for (var hostRoom in aidConfig){
        if (global.rooms.my.indexOf(hostRoom) < 0) continue
        for (var aidInfo of aidConfig[hostRoom]){
            var fromRoom = aidInfo.fromRoom
            if (global.rooms.my.indexOf(fromRoom) < 0) continue
            var from = aidInfo.from, to = aidInfo.to
            if (!Game.rooms[hostRoom][to] || !Game.rooms[fromRoom][from]) continue
            if (Game.rooms[hostRoom][to].store[aidInfo.resourceType] > aidInfo.toEndAmount) continue
            if (Game.rooms[fromRoom][from].store[aidInfo.resourceType] < aidInfo.beginAmount) continue
            Game.rooms[hostRoom].AddAidTask({target:Game.rooms[fromRoom][from].id,roomName:fromRoom},{target:Game.rooms[hostRoom][to].id,roomName:hostRoom},resourceType,{stopAmount:aidInfo.endAmount,toStopAmount:aidInfo.toEndAmount});
        }
    }

    for (var hostRoom in sendConfig){
        if (global.rooms.my.indexOf(hostRoom) < 0) continue
        if (!Game.rooms[hostRoom].terminal) continue
        for (var sendInfo of sendConfig[hostRoom]){
            if (Game.rooms[sendInfo.targetRoom] && !Game.rooms[sendInfo.targetRoom].terminal) continue
            if (!global.resources[hostRoom][sendInfo.resourceType]) continue
            var transferAmount = sendInfo.baseAmount + sendInfo.sendAmount - Game.rooms[hostRoom].terminal.store[sendInfo.resourceType]
            if (transferAmount <= 0) continue
            if (Game.rooms[sendInfo.targetRoom] && (Game.rooms[sendInfo.targetRoom].terminal.store[sendInfo.resourceType] >= sendInfo.targetStopAmount || Game.rooms[sendInfo.targetRoom].terminal.store.getUsedCapacity() >= sendInfo.targetStopCapacity)) continue
            const structure = Game.rooms[hostRoom].getStructure4Withdraw(sendInfo.resourceType,0,STRUCTURE_TERMINAL);
            if (structure) Game.rooms[hostRoom].AddTransferTask("basic",{target:structure.id,roomName:hostRoom},{target:"terminal",roomName:hostRoom},resourceType,transferAmount);
        }
    }
}