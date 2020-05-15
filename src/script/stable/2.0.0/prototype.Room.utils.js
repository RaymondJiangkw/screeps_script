/**
 * Extensions for Room.
 * @module Room/utils
 */

/**
 * @extends Room
 */
const roomExtensions = {
    /**
     * Get possible structure for storing.
     * @param   {Number}    minFreeCapacity     Minimum storing available capacity, default is 0.
     * @returns {Object|undefined} storage | terminal | factory | container | undefined.
     */
    getStructure4Store(minFreeCapacity = 0) {
        const SINGLE_CHECK_LIST = ["storage","terminal","factory"];
        const MULTI_CHECK_LIST  = ["containers"];
        for (const structureName of SINGLE_CHECK_LIST) if (this[structureName] && this[structureName].store.getFreeCapacity() > minFreeCapacity) return this[structureName];
        for (const structuresName of MULTI_CHECK_LIST) for (const structure of this[structuresName]) if (structure.store.getFreeCapacity() > minFreeCapacity) return structure;
    }
}

_.assign(Room.prototype,roomExtensions);