/**
 * The Module for the Task(main).
 * 
 * **Drawback**:
 * - In each task, the check for validity will run at every tick to improve the effectiveness of task, which can be viewed as the waste of CPU, since there are rare cases of invalidness resulted from "war" in shard3.
 * - Delay Behavior. Since I use many lazy check, and exclude the signal "ERR_REPEAT" to make the code more clean, you will observe that some creeps may stay there, doing nothing, until next tick.
 * 
 * **Caution**:
 * - before switching the task, the working state should be reset to false.
 * - Here are some memory states which enjoy highest priority, meaning should be dealt before running the task.
 *      - storing
 *          - Call the Store() method to clean up creep's carrying.
 *      - renew
 *          - Call the Renew() method to renew the creep.
 *      - recycle
 *          - Call the Recycle() method to recycle the creep.
 * @module task/main
 */

const utils         = require('utils');
const towerConfig   = require('configuration.Tower');
/**
 * Check for info.storeTarget{Id,Pos} validity.
 * @returns OK | ERR_DELETE
 */
const storeTargetCheck = (info,home) => {
    // Check for the validity of storing structure.
    if (info.storeTargetId && info.storeTargetPos) {
        if (!utils.checkTargetValidity(info.storeTargetId,info.storeTargetPos)) [info.storeTargetId,info.storeTargetPos] = [undefined,undefined];
        else if (Game.getObjectById(info.storeTargetId).store.getFreeCapacity() === 0) [info.storeTargetId,info.storeTargetPos] = [undefined,undefined];
    }
    // Try to get storing structure.
    if (!info.storeTargetId || !info.storeTargetPos) {
        const storingStructure = Game.rooms[home].getStructure4Store();
        if (storingStructure) [info.storeTargetId,info.storeTargetPos] = [storingStructure.id,utils.getPos(storingStructure.pos)];
        else return ERR_DELETE;
    }
    return OK;
}
/**
 * Check for info.target{Id,Pos} validity.
 * @param   {Object}    settings            The setting of check.
 * @param   {Boolean}   settings.lookInRoom Whether turn to look in the Room Object for Array, if not found by Game.getObjectById.
 * @param   {Boolean}   settings.hitsCheck  Whether switch the target if the target hits equals to hitsMax.
 * @param   {Boolean}   settings.specific   Whether the providing [target] in data is in the form of targetId, targetPos, which can be directly applied.
 * @returns OK | ERR_DELETE
 */
const commonTargetCheck = (info,settings = {lookInRoom:false,hitsCheck:false,specific:false}) => {
    _.defaults(settings,{lookInRoom:false,hitsCheck:false,specific:false});
    if (info.targetId && info.targetPos) {
        const checkFeedback = utils.checkTargetValidity(info.targetId,info.targetPos);
        if (checkFeedback === false) {
            [info.targetId,info.targetPos] = [undefined,undefined];
            // For the "specific" case, delete the task.
            if (settings.specific) return ERR_DELETE;
        // Additional Check.
        }else if (checkFeedback === true){
            // Switch the target if hits === hitsMax.
            if (settings.hitsCheck) {
                const target = Game.getObjectById(info.targetId);
                if (target.hits === target.hitsMax) [info.targetId,info.targetPos] = [undefined,undefined];
            }
        }
    }
    if (!info.targetId || !info.targetPos) {
        const infoTarget = info.data.target;
        // Get the target directly.
        if (settings.specific) [info.targetId,info.targetPos] = [infoTarget.targetId,infoTarget.targetPos];
        else {
            // Consider the case of losing visibility.
            if (!Game.rooms[infoTarget.roomName]) return OK;
            let target = Game.getObjectById(infoTarget.target);
            // Try to search in the Room Object.
            if (settings.lookInRoom) target = target || Game.rooms[infoTarget.roomName][infoTarget.target][0];
            // Return ERR_DELETE, if not found.
            if (!target) return ERR_DELETE;
            [info.targetId,info.targetPos] = [target.id,utils.getPos(target.pos)];
        }
    }
    return OK;
}
module.exports = {
    /**
     * Transfer Task.
     * Accept multiple symbols besides Id.
     * From: accept "resource" (search in the creep's home), "power", "ruins", "labs", "terminal", "storage", "factory".
     * To  : accept "labs", "towers", "containers", "storage", "terminal", "factory".
     * @param   {Array}     creeps      Array of Creeps.
     * @param   {String}    home        The home of Creeps.
     * @param   {String}    fingerprint The fingerprint of Task.
     * @returns {Number} OK | ERR_DELETE | ERR_RENEW | FINISH
     */
    _transfer(creeps,home,fingerprint) {
        const info = Intel.task.taskInfo(home,fingerprint);
        const creepRun = (creep) => {
            if (!creep.memory.working) {
                switch (info.data.from.target) {
                    // Getting Energy, or resource (specifically fill up the lab).
                    case "resource":{
                        if (creep.store.getFreeCapacity() === 0 && creep.store[info.data.resourceType] > 0) {
                            creep.memory.working = true;
                            creep.resetGet();
                        }else{
                            const feedback = creep.getResource("transfer",info.subTaskType,info.data.resourceType,info.data.amount);
                            switch (feedback) {
                                // Consider the case of exhausting resource.
                                case ERR_NOT_FOUND:
                                    if (creep.store[info.data.resourceType] > 0) {
                                        creep.memory.working = true;
                                        creep.resetGet();
                                    }else return ERR_DELETE;
                                    break;
                                // Consider the case of storing other resourceType.
                                case ERR_FULL:
                                    creep.memory.storing = true;
                                    return ERR_RENEW;
                                default:
                                    return OK;
                            }
                        }
                        break;
                    }
                    case "power":{
                        if (!creep.memory.getTargetId || !creep.memory.getTargetPos) {
                            // Check for the visibility of targetRoom.
                            if (Game.rooms[info.data.from.roomName]) {
                                // Check for potential ruins and dropped resources, containing power.
                                const ruins        =   Game.rooms[info.data.from.roomName].find(FIND_RUINS,{filter:r => r.store[RESOURCE_POWER] > 0});
                                const droppedPowers =   Game.rooms[info.data.from.roomName].find(FIND_DROPPED_RESOURCES,{filter:{resourceType:RESOURCE_POWER}});
                                if (ruins.length + droppedPowers.length === 0) {
                                    // Check whether having stored something.
                                    if (creep.store[RESOURCE_POWER] > 0) creep.memory.working = true;
                                    else{
                                        // Check whether at this state, the powerBank still exists.
                                        const powerBanks = Game.rooms[info.data.from.roomName].find(FIND_STRUCTURES,{filter:{structureType:STRUCTURE_POWER_BANK}});
                                        if (powerBanks.length === 0) {
                                            creep.memory.recycle = true;
                                            return ERR_DELETE;
                                        }
                                        // Ensure creep is at the room and not at the edge when the powerBank is still under attacking.
                                        if (creep.room.name !== info.data.from.roomName || creep.pos.x === 0 || creep.pos.x === 49 || creep.pos.y === 0 || creep.pos.y === 49) return OK & creep.adjMove({x:25,y:25,roomName:info.data.from.roomName});
                                    }
                                }else {
                                    const target = ruins[0] || droppedPowers[0];
                                    [creep.memory.getTargetId,creep.memory.getTargetPos] = [target.id,utils.getPos(utils.pos)];
                                }
                            }else return creep.adjMove({x:25,y:25,roomName:info.data.from.roomName}) & OK;
                        }
                        if (creep.memory.getTargetId && creep.memory.getTargetPos) {
                            if (creep.adjMove(creep.memory.getTargetPos) === ERR_NOT_IN_RANGE) return OK;
                            const target = Game.getObjectById(creep.memory.getTargetId);
                            // Lazy Check.
                            if (!target || (target.store && target.store[RESOURCE_POWER] === 0)) {
                                [creep.memory.getTargetId,creep.memory.getTargetPos] = [undefined,undefined];
                                return OK;
                            }
                            // Check whether it is dropped resources.
                            if (target.amount) creep.pickup(target);
                            // Ruin.
                            else creep.withdraw(target,RESOURCE_POWER);
                            creep.memory.working = true;
                            [creep.memory.getTargetId,creep.memory.getTargetPos] = [undefined,undefined];
                        }
                        break;
                    }
                    default:{
                        if (!creep.memory.getTargetId || !creep.memory.getTargetPos) {
                            switch (info.data.from.target){
                                // Get from ruins.
                                case "ruins":{
                                    // Consider the visibility, usually in the case of destroying InvaderCore.
                                    if (Game.rooms[info.data.from.roomName]) {
                                        // Avoid the delay of Room.ruins.
                                        const ruins = Game.rooms[info.data.from.roomName].find(FIND_RUINS,{filter:r => r.store.getUsedCapacity() > 0});
                                        if (ruins.length === 0){
                                            // Check whether having stored something.
                                            if (creep.store.getUsedCapacity() === 0) return ERR_DELETE;
                                            else creep.memory.working = true;
                                        }else [creep.memory.getTargetId,creep.memory.getTargetPos] = [ruins[0].id,ruins[0].pos];
                                    }else return OK & creep.adjMove({x:25,y:25,roomName:info.data.from.roomName});
                                    break;
                                }
                                case "labs":{
                                    // Possible remote.
                                    const room = info.data.from.roomName || creep.memory.home;
                                    // Ensure there are labs, avoiding "core" labs.
                                    if (global.info.labs[room] && global.info.labs[room][info.data.resourceType]) {
                                        const target = global.info.labs[room][info.data.resourceType][0];
                                        [creep.memory.getTargetId,creep.memory.getTargetPos] = [target.id,target.pos];
                                    }else {
                                        // Check whether having stored something.
                                        if (creep.store.getUsedCapacity() === 0) return ERR_DELETE;
                                        else creep.memory.working = true;
                                    }
                                    break;
                                }
                                case "terminal":
                                case "storage":
                                case "factory":{
                                    // Consider remote case.
                                    const room = info.data.from.roomName || creep.memory.home;
                                    const target = Game.rooms[room][info.data.from.target];
                                    // Check for validity.
                                    if (target) {
                                        [creep.memory.getTargetId,creep.memory.getTargetPos] = [target.id,utils.getPos(utils.pos)];
                                    }else {
                                        // Check whether having stored something.
                                        if (creep.store.getUsedCapacity() === 0) return ERR_DELETE;
                                        else creep.memory.working = true;
                                    }
                                    break;
                                }
                                default:{
                                    const target = Game.getObjectById(info.data.from.target);
                                    // Consider the case of remote getting.
                                    if (!target && (!info.data.from.roomName || Game.rooms[info.data.from.roomName])) {
                                        // Check whether having stored something.
                                        if (creep.store.getUsedCapacity() === 0) return ERR_DELETE;
                                        else creep.memory.working = true;
                                    }
                                    if (target) [creep.memory.getTargetId,creep.memory.getTargetPos] = [target.id,utils.getPos(target.pos)];
                                    // Create fake position for placeholder.
                                    else [creep.memory.getTargetId,creep.memory.getTargetPos] = [info.data.from.target,{x:25,y:25,roomName:info.data.from.roomName,fake:true}];
                                }
                            }
                        }
                        if (creep.memory.getTargetId && creep.memory.getTargetPos) {
                            // Primary check for working.
                            if (creep.store.getFreeCapacity() === 0) creep.memory.working = true;
                            else {
                                // Deal with the case of temporary fake position.
                                if (creep.memory.getTargetPos.fake && creep.room.name === creep.memory.getTargetPos.roomName) {
                                    const target = Game.getObjectById(creep.memory.getTargetId);
                                    if (!target || target.store.getUsedCapacity() === 0 || (info.data.resourceType && target.store[info.data.resourceType] === 0)) {
                                        // Do not check for storing something here, turning to "get" target part.
                                        [creep.memory.getTargetId,creep.memory.getTargetPos] = [undefined,undefined];
                                        return OK;
                                    }else creep.memory.getTargetPos = utils.getPos(target.pos);
                                }
                                if (creep.adjMove(creep.memory.getTargetPos) === ERR_NOT_IN_RANGE) return OK;
                                const target = Game.getObjectById(creep.memory.getTargetId);
                                // Lazy check.
                                if (!target || target.store.getUsedCapacity() === 0 || (info.data.resourceType && target.store[info.data.resourceType] === 0)) {
                                    [creep.memory.getTargetId,creep.memory.getTargetPos] = [undefined,undefined];
                                    return OK;
                                }
                                // Only Withdraw.
                                if (info.data.resourceType) return creep.Withdraw(tarrget,null,info.data.resourceType,info.data.amount);
                                else for (const carry in target.store) return creep.Withdraw(target,null,carry,info.data.amount);
                            }
                        }
                        break;
                    }
                }
            }
            if (creep.memory.working) {
                // Primary Check for working.
                if (info.data.resourceType && creep.store[info.data.resourceType] === 0) creep.memory.working = false;
                if (!info.data.resourceType && creep.store.getUsedCapacity() === 0) creep.memory.working = false;
                if (!creep.memory.working) return OK;
                // Try to get "to" target.
                if (!info.targetId || !info.targetPos) {
                    // Consider the case of remote.
                    const room = info.data.to.roomName || creep.memory.home;
                    // Deal with the case of injecting energy into labs (should be avoided in this special case).
                    if (info.data.to.target === "labs" && info.data.resourceType !== RESOURCE_ENERGY) {
                        // Make Sure there is still room for transfering.
                        if (global.labs[room] && global.labs[room][info.data.resourceType] && _.filter(global.labs[room][info.data.resourceType],l => l.store.getFreeCapacity(info.data.resourceType) > 0).length > 0) {
                            // Since labs in it are in descending order by its amount inside.
                            const labPos = global.labs[room][info.data.resourceType].length - 1;
                            [info.targetId,info.targetPos] = [global.labs[room][info.data.resourceType][labPos].id,utils.getPos(global.labs[room][info.data.resourceType][labPos].pos)];
                        // Allocate to the vacant labs.
                        }else if (global.labs[room] && global.labs[room]["vacant"] && global.labs[room]["vacant"].length > 0){
                            [info.targetId,info.targetPos] = [global.labs[room]["vacant"][0].id,utils.getPos(global.labs[room]["vacant"][0].pos)];
                        }else return ERR_DELETE;
                    // Deal with the case of transfering towers, since they takes on the responsibility of repairing, so checking here should be set a limit.
                    }else if (info.data.to.target === "towers") {
                        const towers = _.filter(Game.rooms[room].towers,t => t.store.getUsedCapacity(RESOURCE_ENERGY) <= towerConfig.reservedEnergy);
                        // Get closest One.
                        towers.sort((a,b)=>a.pos.getRangeTo(creep) - b.pos.getRangeTo(creep));
                        if (towers.length > 0) [info.targetId,info.targetPos] = [towers[0].id,utils.getPos(towers[0].pos)];
                        else return ERR_DELETE;
                    // Acceptable symbols for structures.
                    }else if (!Game.getObjectById(info.data.to.target)) {
                        let targets = [];
                        // Multiple Structures.
                        if (info.data.to.target.charAt(info.data.to.target.length - 1) === "s") {
                            // Ensure those having the least amount be transfered first.
                            const minAmount = Math.min.apply(Math,Game.rooms[room][info.data.to.target].map(s => s.store.getUsedCapacity(info.data.resourceType)));
                            targets = _.filter(Game.rooms[room][info.data.to.target],s => s.store.getUsedCapacity(info.data.resourceType) === minAmount);
                            targets.sort((a,b)=>a.pos.getRangeTo(creep) - b.pos.getRangeTo(creep));
                        // Single.
                        }else targets = [Game.rooms[room][info.data.to.target]];
                        // Ensure Free Space.
                        targets = _.filter(targets,t => t.store.getFreeCapacity(info.data.resourceType) > 0);
                        if (targets.length > 0) [info.targetId,info.targetPos] = [targets[0].id,utils.getPos(targets[0].pos)];
                        else return ERR_DELETE;
                    }else {
                        const target = Game.getObjectById(info.data.to.target);
                        // Ensure Free Space.
                        if (target.store.getFreeCapacity() === 0) return ERR_DELETE;
                        [info.targetId,info.targetPos] = [target.id,utils.getPos(target)];
                    }
                }
                if (info.targetId && info.targetPos) {
                    if (creep.adjMove(info.targetPos) === ERR_NOT_IN_RANGE) return OK;
                    const target = Game.getObjectById(info.targetId);
                    // Lazy Check.
                    if (!target || target.store.getFreeCapacity() === 0) {
                        [info.targetId,info.targetPos] = [undefined,undefined];
                        return OK;
                    }
                    // Special case of "aid", which sets the limit of amount and capacity.
                    if (info.subTaskType === "aid") {
                        if (target.store[info.data.resourceType] >= info.data.complements.toStopAmount || target.store.getUsedCapacity() >= info.data.complements.toStopCapacity) return ERR_DELETE;
                    }
                    // Record the amount of transfering.
                    let transferAmount = 0;
                    // Preset the transferAmount.
                    if (typeof(info.data.amount) === "number") transferAmount = info.data.amount;
                    if (info.data.resourceType) {
                        transferAmount = Math.min(target.store.getFreeCapacity(),creep.store[info.data.resourceType]);
                        creep.transfer(target,info.data.resourceType,transferAmount);
                    }else{
                        for (const carry in creep.store) {
                            transferAmount = Math.min(target.store.getFreeCapacity(),creep.store[carry]);
                            creep.transfer(target,carry,transferAmount);
                            break;
                        }
                    }
                    // Modify the amount.
                    if (typeof(info.data.amount) === "number") info.data.amount -= transferAmount;
                    // Stop Condition.
                    if (info.data.amount <= 0 || transferAmount === 0) {
                        creep.memory.working = false;
                        [info.targetId,info.targetPos] = [undefined,undefined];
                        if (info.settings.changeable) return ERR_RENEW;
                        else return OK;
                    }
                }
            }
            return OK;
        }
        // Reverse the priority, since in this case, if one creep works fine, then this task should go on.
        let feedback = ERR_DELETE;
        for (const creep of creeps) feedback = feedback & creepRun(creep);
        return feedback;
    },
    /**
     * Harvest Task for "local" or "remote", taking the usage of container and link into account.
     * @param   {Array}     creeps      Array of Creeps.
     * @param   {String}    home        The home of Creeps.
     * @param   {String}    fingerprint The fingerprint of Task.
     * @returns {Number} OK | ERR_DELETE | ERR_RENEW
     */
    _harvest(creeps,home,fingerprint) {
        const info = Intel.task.taskInfo(home,fingerprint);
        /**
         * Check for info.target{Id,Pos} validity.
         * @returns OK | ERR_DELETE
         */
        const cachedContainerCheck = () => {
            // Check for cachedContainer.
            if (info.data.cachedContainerId && info.data.cachedContainerPos) {
                if (!utils.checkTargetValidity(info.data.cachedContainerId,info.data.cachedContainerPos)) [info.data.cachedContainerId,info.data.cachedContainerPos] = [undefined,undefined];
            }
            if (!info.data.cachedContainerId || !info.data.cachedContainerPos) {
                if (global.info.containers[info.targetPos.roomName] && global.info.containers[info.targetPos.roomName].map[info.targetId]) {
                    const cachedContainerId = global.info.containers[info.targetPos.roomName].map[info.targetId];
                    [info.data.cachedContainerId,info.data.cachedContainerPos] = 
                    [cachedContainerId, utils.getPos(Game.getObjectById(cachedContainerId).pos) ];
                }
            }
            return OK;
        }
        // Harvester Creep Run.
        const harvesterRun = (creep,transferers = []) => {
            // Deal with transfer to link, or creep. Or switch the task. Or stop harvesting deposit if full in order to optimize the cooldown.
            if (creep.store.getFreeCapacity() === 0) {
                if (global.info.links[info.targetPos.roomName] && global.info.links[info.targetPos.roomName].map[info.targetId]) creep.transfer(Game.getObjectById(global.info.links[info.targetPos.roomName].map[info.targetId]),RESOURCE_ENERGY);
                if (transferers.length > 0) {
                    const transferer = utils.Adjacent(1,creep,transferers);
                    if(transferer) for (const carry in creep.store) creep.transfer(transferer,carry);
                }
                if (info.settings.changeable) return ERR_RENEW;
                if (Game.getObjectById(info.targetId) && Game.getObjectById(info.targetId).depositType) return OK;
            }
            return creep.Harvest(target,info.data.cachedContainerPos || info.targetPos);
        }
        // Ensure the check is only once and checked only if needed to deal with the case of multi-transferers.
        let storeCheck = false;
        // Transferer Creep Run.
        const transfererRun = (creep,harvester) => {
            // Check For Working State.
            if (!creep.memory.working && (creep.store.getFreeCapacity() === 0 || (creep.hits / creep.hitsMax <= 0.8 && creep.store.getUsedCapacity() > 0))) creep.memory.working = true;
            if (creep.memory.working && creep.store.getUsedCapacity() === 0) {
                creep.memory.working = false;
                if (info.settings.changeable) return ERR_RENEW;
            }
            // Trying to get resources from creep or adjacent structures, dropped resources.
            if (!creep.memory.working) {
                if (!harvester) return ERR_DELETE;
                const pos = harvester.pos;
                return creep.Collect(pos);
                // Waiting to be transferred.
            }
            if (creep.memory.working) {
                if (storeCheck === false) storeCheck = storeTargetCheck(info,home);
                if (storeCheck === OK) return creep.Transfer(Game.getObjectById(info.storeTargetId),info.storeTargetPos);
                else return storeCheck;
            }
        }
        const pairs = {};
        const harvesters  = _.filter(creeps,c => c.memory.role === "harvester");
        const transferers = _.filter(creeps,c => c.memory.role === "transferer");
        let [transfererFeedback,harvesterFeedback] = [OK,cachedContainerCheck() | commonTargetCheck(info,{specific:true})];
        for (const transferer of transferers) {
            const harvester = _.sample(harvesters);
            if (harvester) {
                if (!pairs[harvester.id]) pairs[harvester.id] = [];
                pairs[harvester.id].push(transferer.id);
            }
            transfererFeedback = transfererFeedback | transfererRun(transferer,harvester);
        }
        if (harvesterFeedback === OK) for (const harvester of harvesters) harvesterFeedback = harvesterFeedback | harvesterRun(harvester,pairs[harvester.id] || []);
        // Ensure this task runs if either side of creeps is working right.
        return transfererFeedback & harvesterFeedback;
    },
    /**
     * Template Task Function for "get Energy -> do something to one target".
     * @param {Array}   creeps      Array of Creeps.
     * @param {String}  action      The Action of Creep, expecting like repair, build, upgradeController.
     * @param {String}  home        The home of Creeps.
     * @param {String}  fingerprint The fingerprint of task.
     * @returns {Number} OK | ERR_DELETE | ERR_RENEW
     */
    _work(creeps,action,home,fingerprint) {
        const info = Intel.task.taskInfo(home,fingerprint);
        // Single Creep Logic.
        const creepRun = (creep,action) => {
            // Check for the working state.
            if (creep.memory.working && creep.store[RESOURCE_ENERGY] === 0) {
                creep.memory.working = false;
                if (info.settings.changeable) return ERR_RENEW;
            }
            if (!creep.memory.working && creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
                creep.resetGet();
                creep.memory.working = true;
            }
            // Get the energy and consider the edge case: not enough energy, but stores some. In this case, it will going to work.
            if (!creep.memory.working) {
                const feedback = creep.getResource(action,"default",RESOURCE_ENERGY);
                if (feedback === ERR_NOT_FOUND && creep.store[RESOURCE_ENERGY] > 0) creep.memory.working = true;
                else if (feedback === ERR_FULL) {
                    creep.memory.storing = true;
                    return ERR_RENEW;
                }
            }
            if (creep.memory.working) {
                // Lazy check to improve efficiency.
                const checkFeedback = commonTargetCheck(info,{lookInRoom:true,hitsCheck:(action === "repair")});
                if (checkFeedback === OK) return creep.Do(info.targetId,info.targetPos,action);
                else return checkFeedback;
            }
        };
        let feedback = OK;
        for (const creep of creeps) feedback = feedback | creepRun(creep,action);
        return feedback;
    },
    /**
     * Build Task.
     * @param   {Array}     creeps      Array of Creeps.
     * @param   {String}    home        The home of Creeps.
     * @param   {String}    fingerprint The fingerprint of Task.
     * @returns {Number} OK | ERR_DELETE | ERR_RENEW
     */
    _build(creeps,home,fingerprint) {
        return this._work(creeps,"build",home,fingerprint);
    },
    /**
     * Upgrade Task.
     * @param   {Array}     creeps      Array of Creeps.
     * @param   {String}    home        The home of Creeps.
     * @param   {String}    fingerprint The fingerprint of Task.
     * @returns {Number} OK | ERR_DELETE | ERR_RENEW
     */
    _upgrade(creeps,home,fingerprint) {
        return this._work(creeps,"upgradeController",home,fingerprint);
    },
    /**
     * Repair Task.
     * @param   {Array}     creeps      Array of Creeps.
     * @param   {String}    home        The home of Creeps.
     * @param   {String}    fingerprint The fingerprint of Task.
     * @returns {Number} OK | ERR_DELETE | ERR_RENEW
     */
    _repair(creeps,home,fingerprint) {
        return this._work(creeps,"repair",home,fingerprint);
    },
    /**
     * Pickup Task.
     * @param   {Array}     creeps      Array of Creeps.
     * @param   {String}    home        The home of Creeps.
     * @param   {String}    fingerprint The fingerprint of Task.
     * @returns {Number} OK | ERR_DELETE | ERR_RENEW
     */
    _pickup(creeps,home,fingerprint) {
        const info = Intel.task.taskInfo(home,fingerprint);
        // Run logic for single creep.
        const creepRun = (creep) => {
            if (creep.memory.working && creep.store.getUsedCapacity() === 0) {
                creep.memory.working = false;
                if (info.settings.changeable) return ERR_RENEW;
            }
            if (!creep.memory.working && creep.store.getUsedCapacity() > 0) creep.memory.working = true;
            if (!creep.memory.working) {
                // Lazy check to improve the efficiency.
                const checkFeedback = commonTargetCheck(info,{lookInRoom:true});
                if (checkFeedback === OK) return creep.Do(info.targetId,info.targetPos,"pickup");
                else return checkFeedback;
            }
            if (creep.memory.working) {
                // Lazy check to improve the efficiency.
                const checkFeedback = storeTargetCheck(info,home);
                if (checkFeedback === OK) return creep.Transfer(Game.getObjectById(info.storeTargetId),info.storeTargetPos);
                else return checkFeedback;
            }
        }
        let feedback = OK;
        for (const creep of creeps) feedback = feedback | creepRun(creep);
        return feedback; 
    },
    /**
     * Travel Task.
     * @param   {Array}     creeps      Array of Creeps.
     * @param   {String}    home        The home of Creeps.
     * @param   {String}    fingerprint The fingerprint of Task.
     * @returns {Number} OK
     */
    _travel(creeps,home,fingerprint) {
        const info = Intel.task.taskInfo(home,fingerprint);
        const creepRun = (creep) => {
            if (!info.targetPos) {
                if (info.data.roomList.length === 0) info.data.roomList = [].concat(info.data.targetRooms);
                if (info.data.roomList.length > 0) {
                    const nextRoom = info.data.roomList.shift();
                    info.targetPos = {x:25,y:25,nextRoom};
                }
            }
            if (info.targetPos) {
                creep.adjMove(info.targetPos);
                if (creep.room.name === info.targetPos.roomName) info.targetPos = undefined;
            }
            return OK;
        }
        let feedback = OK;
        for (const creep of creeps) feedback = feedback | creepRun(creep);
        return feedback;
    },
    _attack(creeps,home,fingerprint) {

    },
    _defend(creeps,home,fingerprint) {

    }
}