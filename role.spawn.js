const reference = require('reference')
const helpFunc = require('func')
// spawning attacker and claimer prototype
// Attacker: role:"attacker", targetRoom:"", home: ""
// Claimer: role:"claimer", targetRoom:"", home: ""
const roleSpawn = {
    countCoreCreepsSpawn:function(roomName){
        const numHarvesters = Game.spawns['Origin'].memory.assess.access.creeps[roomName].harvesters
        const numUpgraders = Game.spawns['Origin'].memory.assess.access.creeps[roomName].upgraders
        const numBuilders = Game.spawns['Origin'].memory.assess.access.creeps[roomName].builders
        return [reference.spawn.num['harvester'] - numHarvesters,reference.spawn.num['upgrader'] - numUpgraders,reference.spawn.num['builder'] - numBuilders]
    },
    isRepairer:function(roomName){
        // Return whether need to spawn and if need, the factor to times
        
        // Decide whether need to spawn any more repairer
        if (Game.spawns['Origin'].memory.assess.access.creeps[roomName].repairers !== 0){
            return [false]
        }
        const RepairLevel = Game.spawns['Origin'].memory.assess.access.stateLevel.repair[roomName]
        switch (RepairLevel){
            case 0:
                return [false,0]
                break
            case 1:
                return [true,0.5]
                break
            case 2:
                return [true,0.8]
                break
            case 3:
                return [true,1]
                break
            default:
                return [true,1]
                break
        }
    },
    isTransferer:function(roomName){
        return Game.spawns['Origin'].memory.assess.access.is.containers[roomName].cached.resources
    },
    isMiner:function(roomName){
        return Game.spawns['Origin'].memory.assess.access.is.containers[roomName].cached.minerals && 
               Game.spawns['Origin'].memory.init.access.extractors[roomName].length > 0 && 
               Game.getObjectById(Game.spawns['Origin'].memory.init.access.minerals[roomName][0]).mineralAmount > 0 // Only dealing with the case of single mineral 
    },
    isPickUper:function(roomName){
        return Game.spawns['Origin'].memory.assess.access.stateLevel.economy[roomName] <= 1.5 && Game.spawns['Origin'].memory.assess.access.creeps[roomName].pickupers === 0 &&
               Game.rooms[roomName].controller.level >= 4
    },
    spawnCreep:function(spawn,maximumEnergy,role,spawnSet,isSpawning,additionalDis = {}){
        // console.log("head",isSpawning,role)
        if (isSpawning === ERR_BUSY && (Game.time - spawn.memory.lastSpawnTime >= reference.spawn.timeInterval)) {
            const maximumTotalCost = helpFunc.min(reference.spawn.getTotalCost(spawnSet),Math.floor(maximumEnergy))
            const spawnRatio = reference.spawn.getRatio(spawnSet)
            let components = []
            let usedEnergy = 0
            for (let bodypart in spawnRatio){
                const num = helpFunc.max(1,Math.floor((spawnRatio[bodypart]*maximumTotalCost)/reference.spawn.BODYPART_COST[bodypart]))
                // console.log(bodypart,spawnRatio[bodypart],reference.spawn.BODYPART_COST[bodypart])
                usedEnergy += num * reference.spawn.BODYPART_COST[bodypart]
                for (let i = 0; i < num; i++){
                    components.push(bodypart)
                }
            }
            const newName = role + "_" + spawn.room.name + "_" + Game.time;
            let memoryDis = {role:role,building:false,charge:false,home:spawn.room.name}
            // console.log(role,maximumTotalCost,components)
            memoryDis = Object.assign(memoryDis,additionalDis)
            let _feedBack = spawn.spawnCreep(components,newName,{memory:memoryDis})
            if (_feedBack === OK){
                spawn.memory.lastSpawnTime = Game.time // renew the time
            }
            return [usedEnergy,_feedBack]
        }else{
            return [0,ERR_NOT_ENOUGH_ENERGY]
        }
    },
    run:function(spawn){
        const roomName = spawn.room.name
        const availableEnergy = Game.spawns['Origin'].memory.init.infoResources.available[roomName].available
        const neededCoreCreeps = this.countCoreCreepsSpawn(roomName)
        const totalCoreNum = helpFunc.accumulateArray(neededCoreCreeps)
        const perAllocate = Math.floor(availableEnergy / totalCoreNum)
        let remainingEnergy = availableEnergy
        let flag = ERR_BUSY
        let feedback = null
        // Init the memory
        if (!spawn.memory.lastSpawnTime) {
            spawn.memory.lastSpawnTime = Game.time
        }
        // Dealing with harvester
        if (neededCoreCreeps[0] > 0){
            feedback = this.spawnCreep(spawn,perAllocate,"harvester",reference.spawn.worker,flag)
            remainingEnergy -= feedback[0]
            flag = feedback[1]
        }
        // Dealing with upgrader
        if (neededCoreCreeps[1] > 0){
            feedback = this.spawnCreep(spawn,perAllocate,"upgrader",reference.spawn.upgrader,flag)
            remainingEnergy -= feedback[0]
            flag = feedback[1]
        }
        // Dealing with builder
        if (neededCoreCreeps[2] > 0){
            feedback = this.spawnCreep(spawn,perAllocate,"builder",reference.spawn.worker,flag)
            remainingEnergy -= feedback[0]
            flag = feedback[1]
        }
        // Dealing with transferer
        if (this.isTransferer(roomName)){
            if (Game.spawns['Origin'].memory.resourceOccupied.hasOwnProperty(roomName) === false){
                Game.spawns['Origin'].memory.resourceOccupied[roomName] = {}
                for (let resourceId in Game.spawns['Origin'].memory.init.resourceCached.resources[roomName]){
                    Game.spawns['Origin'].memory.resourceOccupied[roomName][resourceId] = false
                }
            }
            const neededResources = Object.keys(Game.spawns['Origin'].memory.resourceOccupied[roomName]).filter(
                resourceId => Game.spawns['Origin'].memory.resourceOccupied[roomName][resourceId] === false
            )
            const totalTransfererNum = neededResources.length
            if (totalTransfererNum > 0 && neededResources[0] != undefined) {
                const transfererPerAllocate = remainingEnergy / totalTransfererNum
                feedback = this.spawnCreep(spawn,transfererPerAllocate,"transferer",reference.spawn.transferer,flag,{resourceId:neededResources[0]})
                flag = feedback[1] 
                if (feedback[1] === OK) {
                    Game.spawns['Origin'].memory.resourceOccupied[roomName][neededResources[0]] = true
                    remainingEnergy -= feedback[0]
                }
            }
        }
        // Dealing with repairer
        const isRepairer = this.isRepairer(roomName)
        if (isRepairer[0]){
            feedback = this.spawnCreep(spawn,remainingEnergy,"repairer",helpFunc.dotApply(reference.spawn.repairer,isRepairer[1]),flag)
            remainingEnergy -= feedback[0]
            flag = feedback[1]

        }
        // Dealing with miner
        if (this.isMiner(roomName)){
            if (Game.spawns['Origin'].memory.mineralOccupied.hasOwnProperty(roomName) === false){
                Game.spawns['Origin'].memory.mineralOccupied[roomName] = {}
                for (let i = 0; i < Game.spawns['Origin'].memory.init.access.minerals[roomName].length;i++){
                    Game.spawns['Origin'].memory.mineralOccupied[roomName][Game.spawns['Origin'].memory.init.access.minerals[roomName][i]] = false
                }
            }
            const neededMinerals = Object.keys(Game.spawns['Origin'].memory.mineralOccupied[roomName]).filter(
                mineralId => Game.spawns['Origin'].memory.mineralOccupied[roomName][mineralId] === false
            )
            const totalMinerNum = neededMinerals.length
            if (totalMinerNum > 0) {
                const minerPerAllocate = remainingEnergy / totalMinerNum
                feedback = this.spawnCreep(spawn,minerPerAllocate,"miner",reference.spawn.miner,flag,{mineralId:neededMinerals[0]})
                flag = feedback[1]
                if (feedback[1] === OK) {
                    Game.spawns['Origin'].memory.mineralOccupied[roomName][neededMinerals[0]] = true
                    remainingEnergy -= feedback[0]
                }
            }
        }
        // Dealing with pickuper
        if (this.isPickUper(roomName)){
            feedback = this.spawnCreep(spawn,remainingEnergy,"pickuper",reference.spawn.pickuper,flag,{prepareOrder:false,transferType:[RESOURCE_ENERGY],transferAmount:[0]})
            remainingEnergy -= feedback[0]
            flag = feedback[1]
        }
        // Dealing with other special spawns
        // automatic detect and spawn attacker and claimer only based on the setting of memories
    }
}
module.exports = roleSpawn
