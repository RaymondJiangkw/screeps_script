/**
 * The Module for the Task(main).
 * Caution:
 * - before switching the task, the working state should be reset to false.
 * @module task/main
 */

const utils     = require('utils');

module.exports = {
    _transfer(creeps,home,fingerprint) {
        const info = Intel.task.taskInfo(home,fingerprint);
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
        const harvesterCheck = () => {
            // Ensure the target still valid.
            if (info.targetId && info.targetPos) {
                if (!utils.checkTargetValidity(info.targetId,info.targetPos)) return ERR_DELETE;
            }
            // Get the target, will not check for validity for the case of lacking the visibility.
            if (!info.targetId || !info.targetPos) {
                const infoTarget = info.data.target;
                [info.targetId,info.targetPos] = [infoTarget.targetId,infoTarget.targetPos];
            }
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
        /**
         * Check for info.storeTarget{Id,Pos} validity.
         * @returns OK | ERR_DELETE
         */
        const transfererCheck = () => {
            // Check for the validity of storing structure.
            if (info.storeTargetId && info.storeTargetPos) {
                if (!utils.checkTargetValidity(info.storeTargetId,info.storeTargetPos)) [info.storeTargetId,info.storeTargetPos] = [undefined,undefined];
                else if (Game.getObjectById(info.storeTargetId).store.getFreeCapacity() === 0) [info.storeTargetId,info.storeTargetPos] = [undefined,undefined];
            }
            // Try to get storing structure.
            if (!info.storeTargetId || !info.storeTargetPos) {
                const storingStructure = Game.rooms[creep.memory.home].getStructure4Store();
                if (storingStructure) [info.storeTargetId,info.storeTargetPos] = [storingStructure.id,utils.getPos(storingStructure.pos)];
                else return ERR_DELETE;
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
            if (creep.memory.working) return creep.Transfer(Game.getObjectById(info.storeTargetId),info.storeTargetPos);
        }
        const pairs = {};
        const harvesters  = _.filter(creeps,c => c.memory.role === "harvester");
        const transferers = _.filter(creeps,c => c.memory.role === "transferer");
        let [transfererFeedback,harvesterFeedback] = [transfererCheck(),harvesterCheck()];
        if (transfererFeedback === OK) {
            for (const transferer of transferers) {
                const harvester = _.sample(harvesters);
                if (harvester) {
                    if (!pairs[harvester.id]) pairs[harvester.id] = [];
                    pairs[harvester.id].push(transferer.id);
                }
                transfererFeedback = transfererFeedback | transfererRun(transferer,harvester);
            }
        }
        if (harvesterFeedback === OK) for (const harvester of harvesters) harvesterFeedback = harvesterFeedback | harvesterRun(harvester,pairs[harvester.id] || []);
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
        // Ensure the target still valid.
        if (info.targetId && info.targetPos) {
            if (!utils.checkTargetValidity(info.targetId,info.targetPos)) [info.targetId,info.targetPos] = [undefined,undefined];
            // Reset the target once repair to hitsMax.
            else if (action === "repair" && Game.getObjectById(info.targetId) && Game.getObjectById(info.targetId).hits === Game.getObjectById(info.targetId).hitsMax) [info.targetId,info.targetPos] = [undefined,undefined];
        }
        // Try to get the target, or returning ERR_DELETE if not found any.
        if (!info.targetId || !info.targetPos) {
            const infoTarget = info.data.target;
            // Trying to get by Id or interpret as sth. mounting to the Room Object.
            const target = Game.getObjectById(infoTarget.target) || Game.rooms[infoTarget.roomName][infoTarget.target][0];
            if (!target) return ERR_DELETE;
            [info.targetId,info.targetPos] = [target.id,utils.getPos(target.pos)];
        }
        // Single Creep Logic.
        const creepRun = (creep,action) => {
            // Check for the working state.
            if (creep.memory.working && creep.store[RESOURCE_ENERGY] === 0) {
                creep.memory.working = false;
                if (info.settings.changeable) return ERR_RENEW;
            }
            if (!creep.memory.working && creep.store.getFreeCapacity() === 0) creep.memory.working = true;
            // Get the energy and consider the edge case: not enough energy, but stores some. In this case, it will going to work.
            if (!creep.memory.working) if (creep.getResource(RESOURCE_ENERGY,"full") === ERR_NOT_FOUND && creep.store[RESOURCE_ENERGY] > 0) creep.memory.working = true;
            if (creep.memory.working) {
                // Consider the case when do not have visibility into that room.
                if (creep.room.name !== info.targetPos.roomName) {
                    creep.adjMove(info.targetPos);
                    return OK;
                }
                const target = Game.getObjectById(info.targetId);
                const feedback = creep[action](target);
                // Lazy move, consider the case when the target is not accessible from adjacent position.
                if (feedback === ERR_NOT_IN_RANGE) creep.adjMove(info.targetPos);
                return OK;
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
    _pickup(creeps,home,fingerprint) {

    },
    _travel(creeps,home,fingerprint) {

    },
    _attack(creeps,home,fingerprint) {

    },
    _defend(creeps,home,fingerprint) {

    }
}