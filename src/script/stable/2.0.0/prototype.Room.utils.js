/**
 * Extensions for Room.
 * @module Room/utils
 */
const SINGLE_CHECK_LIST = ["storage","terminal","factory"];
const MULTI_CHECK_LIST  = ["containers"];
/**
 * @memberof Room
 */
const roomExtensions = {
    /**
     * Get possible structure for storing.
     * @param   {Number}    minFreeCapacity     Minimum storing available capacity, default is 0.
     * @returns {Object|undefined} storage | terminal | factory | container | undefined.
     */
    getStructure4Store(minFreeCapacity = 0) {
        for (const structureName of SINGLE_CHECK_LIST) if (this[structureName] && this[structureName].store.getFreeCapacity() > minFreeCapacity) return this[structureName];
        for (const structuresName of MULTI_CHECK_LIST) for (const structure of this[structuresName]) if (structure.store.getFreeCapacity() > minFreeCapacity) return structure;
        return undefined;
    },
    /**
     * Get possible structure for withdrawing.
     * @param {String}              resourceType    One of RESOURCE_*.
     * @param {Number|undefined}    minAmount       Minimum storing amount, default is 0 (undefined is interpreted as this too).
     * @returns {Object|undefined} storage | terminal | factory | container | undefined.
     */
    getStructure4Withdraw(resourceType,minAmount = 0) {
        minAmount = minAmount || 0;
        for (const structureName of SINGLE_CHECK_LIST) if (this[structureName] && this[structureName].store[resourceType] > minAmount) return this[structureName];
        for (const structuresName of MULTI_CHECK_LIST) for (const structure of this[structuresName]) if (structure.store[resourceType] > minAmount) return structure;
        return undefined;
    }
}

_.assign(Room.prototype,roomExtensions);