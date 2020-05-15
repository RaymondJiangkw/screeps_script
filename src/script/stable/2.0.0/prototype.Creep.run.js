/**
 * Extensions for Creep Running.
 * @module Creep/run
 */

const [dx,dy]               =   [ [0,0,1,0,-1] , [0,1,0,-1,0] ];

/**
 * @extends Creep
 */
const creepsExtensions = {
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
     * @param {String} resourceType One of RESOURCE_*.
     * @param {Number|String} amount get Number, allowing for "full", indicating getting as much as possible.
     */
    getResource(resourceType,amount) {

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
     * @returns {Number} OK
     */
    Transfer(toTarget,toTargetPos,resourceType,amount) {
        if (toTargetPos && this.adjMove(toTargetPos) === ERR_NOT_IN_RANGE) return OK;
        const resourceTypes     = resourceType || Object.keys(this.store);
        const transferAmount    = amount       || Infinity;
        for (const _resourceType of resourceTypes) {
            if (!Number.isFinite(transferAmount)) this.transfer(toTarget,_resourceType);
            else this.transfer(toTarget,_resourceType,transferAmount);
            break;
        }
        return OK;
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
    }
}

_.assign(Creep.prototype,creepsExtensions);