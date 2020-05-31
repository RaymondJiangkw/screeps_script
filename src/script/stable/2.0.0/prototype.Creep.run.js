/**
 * Extensions for Creep Running.
 * @module Creep/run
 */

const utils                         =   require('utils');
const constants                     =   require('constants');
const labConfig                     =   require('configuration.Lab');
const buildConfig                   =   require('configuration.Build');
const terminalConfig                =   require('configuration.Terminal');
const [dx,dy]                       =   [ [0,0,1,0,-1] , [0,1,0,-1,0] ];
const [COMPOUND_UNIT,ENERGY_UNIT]   =   [30,20];
const RENEW_TO_TICKSTOLIVE          =   1490;
const ROOM_ENERGY_DANGER_RATIO      =   0.6;
const ENERGY_CONTAINER_MAX_RANGE    =   11;

/**
 * @memberof Creep
 */
const creepsExtensions = {
    /**
     * Withdraw resources from target.
     * @param {String}                      target          Target.
     * @param {Object}                      targetPos       Target Position, expecting x,y,roomName.
     * @param {String|undefined}            resourceType    One of RESOURCE_*, or all, if undefined.
     * @param {Number|undefined|String}     amount          Amount, allowing for undefined or "full" or "exhaust", indicating as much as possible.
     * @returns {Number} OK | ERR_NOT_ENOUGH_RESOURCES
     */
    Withdraw(target,targetPos,resourceType,amount){
        if (targetPos && this.adjMove(targetPos) === ERR_NOT_IN_RANGE) return OK;
        if (amount === "full" || amount === "exhaust") amount = undefined;
        let amount = Math.min(amount || Infinity,this.store.getFreeCapacity(),target.store[resourceType] || Infinity);
        if (resourceType) return this.withdraw(target,resourceType,amount);
        else for (const carry in target.store) return this.withdraw(target,carry,amount);
        return ERR_NOT_ENOUGH_RESOURCES;
    },
    /**
     * Get the Energy.
     * Notice that amount will only be used in "Withdraw" behavior.
     * Notice that creep will try to get energy at where it is.
     * @param {String}           identity       Identity for taskType.
     * @param {String}           subIdentity    Sub-Identity for subTaskType.
     * @param {Number|undefined} amount         Amount, allowing for undefined, indicating "all".
     * @returns {Number} OK | ERR_NOT_FOUND | ERR_FULL
     */
    _getEnergy(identity,subIdentity,amount) {
        // Try to get Target for energy.
        if (!this.memory.getTargetId || !this.memory.getTargetPos) {
            // Position Compare Function, in order to get closet target for energy.
            const posCmp = (a,b) => a.pos.getRangeTo(this) - b.pos.getRangeTo(this);
            /** This function is used for check whether the [structure] has more than [amount] energy, return [structure] or undefined, otherwise.*/
            const hasEnergy = (structure,amount = 0) => {
                if (!structure || structure.store[RESOURCE_ENERGY] <= amount) return undefined;
                return structure;
            }
            // These check can be time-consuming and useless, because there are priority among them.
            // And if one which enjoys higher priority exists, those, having lower priority, do not need to be computed.
            // But in order to keep the code tidy, I place all these check before choose.
            let   chosenObject                =   undefined;
            // Check for containers.
            const hasEnergyContainers         = _.filter(this.room.containers, c => c.store[RESOURCE_ENERGY] > 0).sort(posCmp);
            // Check for "good" containers, which have enough energy.
            const hasEnoughEnergyContainers   = _.filter(hasEnergyContainers,c => c.store[RESOURCE_ENERGY] >= (amount || this.store.getFreeCapacity())).sort(posCmp);
            // Dropped energys.
            const droppedEnergys              = this.room.droppedEnergys.sort(posCmp);
            // Ruins containing energy.
            const ruins                       = _.filter(this.room.ruins,r => r.store[RESOURCE_ENERGY] > 0).sort(posCmp);
            // Sources for harvesting.
            const sources                     = _.filter(this.room.energys,e => e.energy > 0).sort(posCmp);
            // Special case of 'upgrading', "lock" to link if possible (Emitting "from" and "to" links both exist).
            if (identity === "upgradeController" && global.info.links[this.memory.home].resources.length > 0) chosenObject = Game.getObjectById(global.info.links[this.memory.home].upgrade[0]);
            // Special case of 'build' and 'repair'.
            if (identity === "build" || identity === "repair") {
                // Good container is the first choice.
                chosenObject = hasEnoughEnergyContainers[0];
                // Utilize the "storage" and "terminal" if they have more energy than that should be reserved.
                if (identity === "build") chosenObject = chosenObject || hasEnergy(this.room.storage,buildConfig.baseReservedEnergy) || hasEnergy(this.room.terminal,terminalConfig.baseReservedEnergy);
                // Consider the case of remote "build" or "repair".
                if (this.room.name !== this.memory.home) chosenObject = chosenObject || droppedEnergys[0] || ruins[0] || sources[0];
            }
            if (identity === "transfer") {
                // "core" Task has the privilege of utilizing "storage", "terminal" or "factory", if the energy situation is bad.
                if (subIdentity === "core") {
                    if (this.room.energyAvailable / this.room.energyCapacityAvailable <= ROOM_ENERGY_DANGER_RATIO) chosenObject = hasEnergy(this.room.terminal) || hasEnergy(this.room.storage) || hasEnergy(this.room.factory);
                }
                // "defense" Task has the privilege of utilizing "storage", "terminal" or "factory".
                if (subIdentity === "defense") {
                    chosenObject = hasEnergy(this.room.storage) || hasEnergy(this.room.terminal) || hasEnergy(this.room.factory);
                }
                chosenObject = chosenObject || _.filter(hasEnoughEnergyContainers,c=>c.pos.getRangeTo(this) <= ENERGY_CONTAINER_MAX_RANGE)[0];
            }
            // Common check for energy-getting target.
            if (!chosenObject) chosenObject = hasEnoughEnergyContainers[0] || hasEnergyContainers[0] || hasEnergy(this.room.storage) || hasEnergy(this.room.terminal);
            if (chosenObject) [this.memory.getTargetId,this.memory.getTargetPos] = [chosenObject.id,utils.getPos(chosenObject.pos)];
            else return ERR_NOT_FOUND;
        }
        if (this.memory.getTargetId && this.memory.getTargetPos) {
            if (this.adjMove(this.memory.getTargetPos) === ERR_NOT_IN_RANGE) return OK;
            const target = Game.getObjectById(this.memory.getTargetId);
            // Ensure Validity.
            if (!target) {
                [this.memory.getTargetId,this.memory.getTargetPos] = [undefined,undefined];
                return OK;
            }
            let feedback = OK;
            // Case of structure which is withdrawable.
            if (target.store) feedback = this.Withdraw(target,null,RESOURCE_ENERGY,amount);
            // Case of dropped Energy.
            else if (target.amount) feedback = this.pickup(target) | ERR_NOT_ENOUGH_RESOURCES;
            // Case of source.
            else feedback = this.Harvest(target);
            // Reset the getTarget.
            switch (feedback) {
                case OK:
                    return OK;
                case ERR_FULL:
                    return ERR_FULL;
                case ERR_NOT_ENOUGH_RESOURCES:
                    [this.memory.getTargetId,this.memory.getTargetPos] = [undefined,undefined];
                default:
                    return OK;
            }
        }
    },
    /**
     * Get the Resource.
     * Notice that this function excludes the "lab", because it is usual the case that creep needs to transfer mineral/compound to lab.
     * Notice that creep will try to get resources at its home.
     * @param {String}           identity       Identity for taskType.
     * @param {String}           subIdentity    Sub-Identity for subTaskType.
     * @param {String}           resourceType   One of RESOURCE_*.
     * @param {Number|undefined} amount         Amount, allowing for undefined, indicating "all".
     * @returns {Number} OK | ERR_NOT_FOUND | ERR_FULL
     */
    _getResources(identity,subIdentity,resourceType,amount) {
        if (!global.info.resources[this.memory.home][resourceType]) return ERR_NOT_FOUND;
        if (!this.memory.getTargetId || !this.memory.getTargetPos) {
            const structure = Game.rooms[this.memory.home].getStructure4Withdraw(resourceType,amount);
            if (structure) {
                [this.memory.getTargetId,this.memory.getTargetPos] = [structure.id,utils.getPos(structure.pos)];
            }else return ERR_NOT_FOUND;
        }
        if (this.memory.getTargetId && this.memory.getTargetPos) {
            if (this.adjMove(this.memory.getTargetPos) === ERR_NOT_IN_RANGE) return OK;
            const target = Game.getObjectById(this.memory.getTargetId);
            // Lazy Check
            if (!target) {
                [this.memory.getTargetId,this.memory.getTargetPos] = [undefined,undefined];
                return OK;
            }
            switch (this.Withdraw(target,null,resourceType,amount)) {
                case OK:
                    return OK;
                case ERR_FULL:
                    return ERR_FULL;
                case ERR_NOT_ENOUGH_RESOURCES:
                    [this.memory.getTargetId,this.memory.getTargetPos] = [undefined,undefined];
                default:
                    return OK;
            }
        }
    },
    /**
     * Move to a position until adjacent.
     * @param   {Object} targetPos Target Position, expect to have x,y,roomName.
     * @returns {Number} OK, or error code.
     */
    adjMove(targetPos) {
        const pos = new RoomPosition(targetPos.x,targetPos.y,targetPos.roomName);
        if (this.pos.roomName !== targetPos || !this.pos.inRangeTo(pos.x,pos.y,1)) {
            this.travelTo(pos);
            return ERR_NOT_IN_RANGE;
        }
        return OK;
    },
    /**
     * Get the expected resources with specific amount.
     * Notice this function will not automatically reset the get, since the changing of the "working" state should not be done here.
     * Remember to call resetGet().
     * @param {String}                      identity     Calling Task Type Identification.
     * @param {String}                      subIdentity  Calling Task subType Identification.
     * @param {String}                      resourceType One of RESOURCE_*.
     * @param {Number|String|undefined}     amount       get Number, allowing for "full" or undefined, indicating getting as much as possible.
     * @returns {Number} OK | ERR_NOT_FOUND | ERR_FULL
     */
    getResource(identity,subIdentity,resourceType,amount) {
        // Ensure the creep is carrying one and only one allowed resourceType.
        if (this.store.getUsedCapacity() > (this.store[resourceType] || 0)) return ERR_FULL;
        if (amount === "full") amount = undefined;
        if (resourceType === RESOURCE_ENERGY) return this._getEnergy(identity,subIdentity,amount);
        else return this._getResources(identity,subIdentity,resourceType,amount);
    },
    /**
     * Reset the getTarget{Id,Pos} in memory.
     */
    resetGet() {
        this.memory.getTargetId  = undefined;
        this.memory.getTargetPos = undefined;
    },
    /**
     * Boost the creep by the compounds in creep.room.
     * @returns {Number} OK | FINISH
     */
    Boost() {
        // Check for the necessity and conditions for boosting.
        if (!this.memory.boostCompounds || this.memory.boostCompounds === [] || !labConfig[this.room.name] || !global.info.labStructures[this.room.name]) return FINISH;
        if (!this.memory.boostTargetId || !this.memory.boostTargetPos) {
            for (const labId of global.info.labStructures[this.room.name].others) {
                const lab = Game.getObjectById(labId);
                // Check for having mineralType and storing expected mineralType.
                if (!lab.mineralType || labConfig[this.room.name].allowedCompounds.indexOf(lab.mineralType) < 0) continue;
                // Since having cut the compound which have the effects on the boosted bodyparts, there is no need to recheck for whether there are bodyparts to be boosted.
                // Check for ability of boosting.
                if (lab.store[mineralType] >= COMPOUND_UNIT && lab.store[RESOURCE_ENERGY] >= ENERGY_UNIT) {
                    [this.memory.boostTargetId,this.memory.boostTargetPos] = [lab.id,utils.getPos(lab.pos)];
                    break;
                }
            }
        }
        if (this.memory.boostTargetId && this.memory.boostTargetPos) {
            const lab = Game.getObjectById(this.memory.boostTargetId);
            // Recheck the validity of lab, in case of destroying or being transformed.
            if (!lab || this.memory.boostCompounds.indexOf(lab.mineralType) < 0 || labConfig[this.room.name].allowedCompounds.indexOf(lab.mineralType) < 0){
                [this.memory.boostTargetId,this.memory.boostTargetPos] = [undefined,undefined];
                return FINISH;
            }
            if (this.adjMove(this.memory.boostTargetPos) === ERR_NOT_IN_RANGE) return OK;
            // Collect the information before boosting, in case of exhausting after boosting.
            const boostCompound = target.mineralType;
            const boostBodyPart = constants.compoundEffect[boostCompound];
            target.boostCreep(this);
            // Reset the boostTarget.
            [this.memory.boostTargetId,this.memory.boostTargetPos] = [undefined,undefined];
            // Check for the current boosting situation.
            const bodys         = _.filter(this.body,(b) => b.type === boostBodyPart);
            const boostBodys    = _.filter(bodys,(b)=>b.boost);
            // Have all being boosted.
            if (bodys.length === boostBodys.length) {
                const waitingBoostCompounds = [];
                for (const _boostCompound of this.memory.boostCompounds) {
                    // Exclude those which have the effects on the same bodypart.
                    if (constants.compoundEffect[_boostCompound] !== boostBodyPart) waitingBoostCompounds.push(_boostCompound);
                }
                this.memory.boostCompounds = waitingBoostCompounds;
            }
        }
        return FINISH;
    },
    /**
     * Harvest the target.
     * @param {Object} target The target.
     * @param {Object} targetPos Optional. The position of target, expecting x,y,roomName. If provided, will make sure adjacent.
     * @returns {Number} OK | ERR_DELETE
     */
    Harvest(target,targetPos) {
        if (targetPos && this.adjMove(targetPos) === ERR_NOT_IN_RANGE) return OK;
        const feedback = this.harvest(target);
            switch (feedback) {
                case OK:
                    return OK;
                case ERR_BUSY:
                    return OK;
                case ERR_INVALID_TARGET:
                    return ERR_DELETE;
                case ERR_NOT_ENOUGH_RESOURCES:
                    return ERR_DELETE;
                default:
                    return OK;
            }
    },
    /**
     * Transfer to ... .
     * @param {Object}              toTarget        Target of Transfer.
     * @param {Object}              toTargetPos     Optional. The position of target, expecting x,y,roomName. If provided, will make sure adjacent.
     * @param {String|undefined}    resourceType    One of RESOURCE_*, or all, if undefined.
     * @param {Number|undefined}    amount          Number of transfer amount, or all, if undefined.
     * @returns {Number} OK | ERR_FULL | ERR_NOT_ENOUGH_RESOURCES
     */
    Transfer(toTarget,toTargetPos,resourceType,amount) {
        if (toTargetPos && this.adjMove(toTargetPos) === ERR_NOT_IN_RANGE) return OK;
        const resourceTypes     = resourceType || Object.keys(this.store);
        const transferAmount    = amount       || Infinity;
        for (const _resourceType of resourceTypes) {
            if (!Number.isFinite(transferAmount)) return this.transfer(toTarget,_resourceType);
            else return this.transfer(toTarget,_resourceType,transferAmount);
        }
    },
    /**
     * Collect Resources from container, tombStone, dropped resource in the adjacent positions from pos.
     * @param {Object} pos Position, having x,y,roomName.
     * @returns {Number} OK
     */
    Collect(pos) {
        if (this.adjMove(pos) === ERR_NOT_IN_RANGE) return OK;
        // Check for potential container, tombStone, dropped resources.
        for (let i = 0; i < dx.length; i++) {
            const possibleContainers = _.filter(this.room.lookForAt(LOOK_STRUCTURES,pos.x + dx[i],pos.y + dy[i]),s => s.structureType === STRUCTURE_CONTAINER && s.store.getUsedCapacity() > 0);
            const possibleTombStones = _.filter(this.room.lookForAt(LOOK_TOMBSTONES,pos.x + dx[i],pos.y + dy[i]),t => t.store.getUsedCapacity() > 0);
            const possibleResources  = this.room.lookForAt(LOOK_RESOURCES,pos.x + dx[i],pos.y + dy[i]);
            for (const structure of [...possibleContainers,...possibleTombStones]) {
                for (const carry in structure.store) this.withdraw(structure,carry);
                break;
            }
            for (const resource of possibleResources) this.pickup(resource);
        }
        return OK;
    },
    /**
     * Do [action] To [target], and moveTo [targetPos] if ERR_NOT_IN_RANGE.
     * @param {Object} targetId The id of target of action.
     * @param {Object} targetPos Position, having x,y,roomName.
     * @param {String} action Recognizable work method, such as "upgradeController".
     * @returns {Number} OK
     */
    Do(targetId,targetPos,action) {
        // Consider the case when do not have visibility into that room.
        if (targetPos && this.room.name !== targetPos.roomName) {
            this.adjMove(targetPos);
            return OK;
        }
        const target = Game.getObjectById(targetId);
        const feedback = this[action](target);
        // Lazy move, consider the case when the target is not accessible from adjacent position.
        if (feedback === ERR_NOT_IN_RANGE) this.adjMove(targetPos || target.pos);
        return OK;
    },
    /**
     * Renew the creep.
     * Stop when creep's ticksToLive reaches RENEW_TO_TICKSTOLIVE.
     * Use creep.memory.renew.
     * @returns {Number|Boolean} false | OK | ERR_NOT_FOUND
     */
    Renew() {
        // Finish the Renew.
        if (this.ticksToLive >= RENEW_TO_TICKSTOLIVE) {
            [this.memory.targetSpawnId,this.memory.targetSpawnPos] = [undefined,undefined];
            return this.memory.renew = false;
        }
        // Get the Spawn for Renewing.
        if (!this.memory.targetSpawnId || !this.memory.targetSpawnPos) {
            // Filter out the Spawn which is idle.
            const spawns = _.filter(Game.rooms[this.memory.home].spawns,s => !s.spawning);
            // Find the closet spawn.
            spawns.sort((a,b)=>a.pos.getRangeTo(this) - b.pos.getRangeTo(this));
            if (spawns.length > 0) [this.memory.targetSpawnId,this.memory.targetSpawnPos] = [spawns[0].id,utils.getPos(spawns[0].pos)];
            else return ERR_NOT_FOUND;
        }
        if (this.memory.targetSpawnId && this.memory.targetSpawnPos) {
            if (this.adjMove(this.memory.targetSpawnPos) === ERR_NOT_IN_RANGE) return OK;
            const target = Game.getObjectById(this.memory.targetSpawnId);
            // Recheck the validity.
            if (!target) {
                [this.memory.targetSpawnId,this.memory.targetSpawnPos] = [undefined,undefined];
                return OK;
            }
            switch (target.renewCreep(this)) {
                // Switch the spawn.
                case ERR_BUSY:
                    [this.memory.targetSpawnId,this.memory.targetSpawnPos] = [undefined,undefined];
                    break;
                // Consider the case of exhausting the energy.
                case ERR_NOT_ENOUGH_RESOURCES:
                    return ERR_NOT_FOUND;
            }
            return OK;
        }
    },
    /**
     * Recycle the Creep.
     * @returns {Number} OK | ERR_NOT_FOUND
     */
    Recycle() {
        // Get the spawn for recycle.
        if (!this.memory.targetSpawnId || !this.memory.targetSpawnPos) {
            const spawns = Game.rooms[this.memory.home].spawns;
            // Find the closet spawn.
            spawns.sort((a,b)=>a.pos.getRangeTo(this) - b.pos.getRangeTo(this));
            if (spawns.length > 0) [this.memory.targetSpawnId,this.memory.targetSpawnPos] = [spawns[0].id,utils.getPos(spawns[0].pos)];
            else return ERR_NOT_FOUND;
        }
        if (this.memory.targetSpawnId && this.memory.targetSpawnPos) {
            if (this.adjMove(this.memory.targetSpawnPos) === ERR_NOT_IN_RANGE) return OK;
            const target = Game.getObjectById(this.memory.targetSpawnId);
            // Recheck the validity.
            if (!target) [this.memory.targetSpawnId,this.memory.targetSpawnPos] = [undefined,undefined];
            else target.recycleCreep(this);
        }
        return OK;
    },
    /**
     * Store the resources creep is carry.
     * @returns {Number|Boolean} false | OK | ERR_NOT_FOUND
     */
    Store() {
        // Finish the store.
        if (this.store.getUsedCapacity() === 0) return this.memory.storing = false;
        // Getting structure for storing.
        if (!this.memory.targetStoreId || !this.memory.targetStorePos) {
            const storeTarget = Game.rooms[this.memory.home].getStructure4Store();
            if (storeTarget) [this.memory.targetStoreId,this.memory.targetStorePos] = [storeTarget.id,utils.getPos(storeTarget.pos)];
            else return ERR_NOT_FOUND;
        }
        if (this.memory.targetStoreId && this.memory.targetStorePos) {
            const target = Game.getObjectById(this.memory.targetStoreId);
            // Recheck the validity.
            if (!target) [this.memory.targetStoreId,this.memory.targetStorePos] = [undefined,undefined];
            else {
                const transferFeedback = this.Transfer(target,this.memory.targetStorePos);
                // Consider the case of FULL during transfering.
                if (transferFeedback === ERR_FULL) [this.memory.targetStoreId,this.memory.targetStorePos] = [undefined,undefined];
            }
        }
        return OK;
    }
}

_.assign(Creep.prototype,creepsExtensions);