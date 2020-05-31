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
const defendTasks   = require('task.Defend');

const HARVEST_CONTAINER_CHECK = {};
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
            // Check for storing
            if (!creep.memory.working && info.data.resourceType && creep.store[info.data.resourceType] !== creep.store.getUsedCapacity()) return OK & (creep.memory.storing = true);
            // Check for working ?
            // Condition: full | reach maximum amount
            if (!creep.memory.working && (creep.store.getFreeCapacity() === 0 || creep.store.getUsedCapacity(info.data.resourceType) >= info.data.amount)) {
                creep.memory.working = true;
                // Reset the state of getTarget.
                [creep.memory.getTargetId,creep.memory.getTargetPos] = [undefined,undefined];
            }
            // Check for not working ?
            if (creep.memory.working && creep.store.getUsedCapacity() === 0) {
                creep.memory.working = false;
                // Reset the state of info.
                [info.targetId,info.targetPos] = [undefined,undefined];
                // Do not check "exhaust" or "full" here.
                if (info.data.amount <= 0) return ERR_DELETE;
                if (info.settings.changeable) return ERR_RENEW;
                else return OK;
            }
            if (!creep.memory.working) {
                if (!creep.memory.getTargetId || !creep.memory.getTargetPos) {
                    // Ensure Visibility.
                    if (!Game.rooms[info.data.from.roomName]) return OK & creep.adjMove({x:25,y:25,roomName:info.data.from.roomName});
                    // get Target.
                    const getRet = Game.rooms[info.data.from.roomName].getFromStructure(info.data.from.target,{creep,identity:info.taskType,subIdentity:info.subTaskType,resourceType:info.data.resourceType,amount:info.data.amount});
                    // Decide whether found.
                    switch (getRet) {
                        case ERR_NOT_FOUND:
                            if (!info.data.resourceType && creep.store.getUsedCapacity() > 0) creep.memory.working = true;
                            else if (info.data.resourceType && creep.store[info.data.resourceType] > 0) creep.memory.working = true;
                            else return ERR_DELETE;
                            break;
                        case ERR_WAITING:
                            if (creep.Margin()) creep.adjMove({x:25,y:25,roomName:info.data.from.roomName});
                            return OK;
                        case ERR_RECYCLE:
                            creep.memory.recycle = true;
                            return ERR_DELETE;
                        default:
                            if (info.subTaskType === "aid") {
                                const target = Game.getObjectById(getRet[0]);
                                if (target.store.getUsedCapacity(info.data.resourceType) <= info.data.complements.stopAmount) return ERR_DELETE;
                            }
                            [creep.memory.getTargetId,creep.memory.getTargetPos] = getRet;
                            break;
                    }
                }
                if (creep.memory.getTargetId && creep.memory.getTargetPos) {
                    if (creep.adjMove(creep.memory.getTargetPos) === ERR_NOT_IN_RANGE) return OK;
                    // Lazy check.
                    const target = Game.getObjectById(creep.memory.getTargetId);
                    if (!target) {
                        [creep.memory.getTargetId,creep.memory.getTargetPos] = [undefined,undefined];
                        return OK;
                    }
                    const feedback = creep.Get(target,info.data.resourceType,info.data.amount);
                    switch (feedback) {
                        case OK:
                            return OK;
                        case ERR_NOT_ENOUGH_RESOURCES:
                            [creep.memory.getTargetId,creep.memory.getTargetPos] = [undefined,undefined];
                            return OK;
                        case ERR_FULL:
                            creep.memory.storing = true;
                            [creep.memory.getTargetId,creep.memory.getTargetPos] = [undefined,undefined];
                            return OK;
                    }
                }
            }
            if (creep.memory.working) {
                // Try to get "to" target.
                if (!info.targetId || !info.targetPos) {
                    if (!Game.rooms[info.data.to.roomName]) return OK & creep.adjMove({x:25,y:25,roomName:info.data.to.roomName});
                    // get Target.
                    const getRet = Game.rooms[info.data.to.roomName].getToStructure(info.data.to.target,{creep,identity:info.taskType,subIdentity:info.subTaskType,resourceType:info.data.resourceType});
                    // Decide whether found.
                    switch (getRet) {
                        case ERR_NOT_FOUND:
                            return ERR_DELETE;
                        default:
                            if (info.subTaskType === "aid") {
                                const target = Game.getObjectById(getRet[0]);
                                if (target.store.getUsedCapacity(info.data.resourceType) >= info.data.complements.toStopAmount) return ERR_DELETE;
                            }
                            [info.targetId,info.targetPos] = getRet;
                            break;
                    }
                }
                if (info.targetId && info.targetPos) {
                    if (creep.adjMove(info.targetPos) === ERR_NOT_IN_RANGE) return OK;
                    const target = Game.getObjectById(info.targetId);
                    // Lazy Check.
                    if (!target || (target.store.getFreeCapacity() || target.store.getFreeCapacity(RESOURCE_ENERGY)) === 0) {
                        [info.targetId,info.targetPos] = [undefined,undefined];
                        return OK;
                    }
                    // Calculate transfer amount.
                    let transferAmount = 0;
                    // Preset the transferAmount.
                    if (typeof(info.data.amount) === "number") transferAmount = info.data.amount;
                    if (info.data.resourceType) {
                        transferAmount = Math.min(target.store.getFreeCapacity() || target.store.getFreeCapacity(RESOURCE_ENERGY),creep.store[info.data.resourceType]);
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
            if (!HARVEST_CONTAINER_CHECK[fingerprint] || HARVEST_CONTAINER_CHECK[fingerprint] <= Game.time) HARVEST_CONTAINER_CHECK[fingerprint] = Game.time + utils.getCacheExpiration();
            else return OK;
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
            if (creep.memory.working && creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
                creep.memory.working = false;
                [info.targetId,info.targetPos] = [undefined,undefined];
                if (info.settings.changeable) return ERR_RENEW;
            }
            if (!creep.memory.working && creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
                creep.resetGet();
                creep.memory.working = true;
            }
            // Get the energy and consider the edge case: not enough energy, but stores some. In this case, it will going to work.
            if (!creep.memory.working) {
                if (!creep.memory.getTargetId || !creep.memory.getTargetPos) {
                    const feedback = creep._getEnergy(action,"default",creep.memory.home);
                    switch (feedback) {
                        case ERR_NOT_FOUND:
                            return OK;
                        case ERR_FULL:
                            return ERR_REPEAT;
                        default:
                            [creep.memory.getTargetId,creep.memory.getTargetPos] = [feedback[0],feedback[1]];
                    }
                }
                if (creep.memory.getTargetId && creep.memory.getTargetPos) {
                    if (creep.adjMove(creep.memory.getTargetPos) === ERR_NOT_IN_RANGE) return OK;
                    const target = Game.getObjectById(creep.memory.getTargetId);
                    if (!target || creep.Get(target) !== OK) {
                        creep.resetGet();
                        return ERR_REPEAT;
                    }
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
                creep.adjMove(info.targetPos,{travel:true});
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