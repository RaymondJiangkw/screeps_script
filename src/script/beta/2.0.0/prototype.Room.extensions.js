/**
 * Extensions for Room.
 * @module Room/utils
 */
const SINGLE_CHECK_LIST = ["storage","terminal","factory"];
const MULTI_CHECK_LIST  = ["containers"];
const utils             = require('utils');
const towerConfig       = require('configuration.Tower');
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
        if (typeof(minFreeCapacity) !== "number") minFreeCapacity = 0;
        for (const structureName of SINGLE_CHECK_LIST) if (this[structureName] && this[structureName].store.getFreeCapacity() > minFreeCapacity) return this[structureName];
        for (const structuresName of MULTI_CHECK_LIST) for (const structure of this[structuresName]) if (structure.store.getFreeCapacity() > minFreeCapacity) return structure;
        return undefined;
    },
    /**
     * Get possible structure for withdrawing.
     * @param {String}              resourceType    One of RESOURCE_*.
     * @param {Number|undefined}    minAmount       Minimum storing amount, default is 0 (undefined is interpreted as this too).
     * @param {String[]}            [blackLists = []] black lists. structureType in it will not be iterated.
     * @returns {Object|undefined} storage | terminal | factory | container | undefined.
     */
    getStructure4Withdraw(resourceType,minAmount = 0,...blackLists) {
        blackLists = blackLists || [];
        minAmount = minAmount || 0;
        if (typeof(minAmount) !== "number") minAmount = 0;
        for (const structureName of SINGLE_CHECK_LIST) if (blackLists.indexOf(structureName) < 0 && this[structureName] && this[structureName].store[resourceType] > minAmount) return this[structureName];
        // for (const structuresName of MULTI_CHECK_LIST) if (blackLists.indexOf(structuresName) < 0) for (const structure of this[structuresName]) if (structure.store[resourceType] > minAmount) return structure;
        return undefined;
    },
    /**
     * Get the structure based on information.
     * @param {String} structure Id | structureType | special symbol
     * @param {Object} settings Settings
     * @param {Object} settings.creep Creep.
     * @param {String} settings.identity Task Identity.
     * @param {String} settings.subIdentity Task Sub-identity.
     * @param {String|undefined} settings.resourceType resourceType
     * @param {Number|undefined} settings.amount Amount
     */
    getFromStructure(structure,settings = {creep:undefined,identity:undefined,subIdentity:undefined,resourceType:undefined,amount:undefined}){
        // Check for pure Id.
        const target = Game.getObjectById(structure);
        if (target) {
            if (utils.checkForStore(target,settings.resourceType,0)) return [target.id,utils.getPos(target.pos)];
            else return ERR_NOT_FOUND;
        }
        switch (structure) {
            case "resource":{
                if (settings.resourceType === RESOURCE_ENERGY) return settings.creep._getEnergy(settings.identity,settings.subIdentity,this.name,settings.amount);
                return settings.creep._getResources(settings.identity,settings.subIdentity,this.name,settings.resourceType,settings.amount);
            }
            case "power":{
                const ruins = this.find(FIND_RUINS,{filter:r => r.store[RESOURCE_POWER] > 0});
                const droppedPowers = this.find(FIND_DROPPED_RESOURCES,{filter:{resourceType:RESOURCE_POWER}});
                if (ruins.length + droppedPowers.length === 0) {
                    // Check whether at this state, the powerBank still exists.
                    const powerBanks = this.find(FIND_STRUCTURES,{filter:{structureType:STRUCTURE_POWER_BANK}});
                    if (powerBanks.length === 0) return ERR_RECYCLE;
                    else return ERR_WAITING;
                }else {
                    const target = ruins[0] || droppedPowers[0];
                    return [target.id,utils.getPos(target.pos)];
                }
            }
            case "ruins":{
                const ruins = this.find(FIND_RUINS,{filter:r => r.store.getUsedCapacity() > 0});
                if (ruins.length === 0) return ERR_NOT_FOUND;
                else return [ruins[0].id,utils.getPos(ruins[0].pos)];
            }
            case "labs":{
                if (global.labs[this.name] && global.labs[this.name][settings.resourceType]) {
                    const target = global.labs[this.name][settings.resourceType][0];
                    return [target.id,utils.getPos(target.pos)];
                }else return ERR_NOT_FOUND;
            }
            case "terminal":
            case "storage":
            case "factory":{
                if (this[structure] && utils.checkForStore(this[structure],settings.resourceType,settings.amount)) return [this[structure].id,utils.getPos(this[structure].pos)];
                else return ERR_NOT_FOUND;
            }
        }
        return ERR_NOT_FOUND;
    },
    /**
     * Get the structure based on information.
     * @param {String} structure Id | structureType | special symbol
     * @param {Object} settings Settings
     * @param {Object} settings.creep Creep.
     * @param {String} settings.identity Task Identity.
     * @param {String} settings.subIdentity Task Sub-identity.
     * @param {String|undefined} settings.resourceType resourceType
     */
    getToStructure(structure,settings = {creep:undefined,identity:undefined,subIdentity:undefined,resourceType:undefined}){
        // Check for pure Id.
        const target = Game.getObjectById(structure);
        if (target) {
            if ((target.store.getFreeCapacity() || target.store.getFreeCapacity(settings.resourceType)) > 0) return [target.id,utils.getPos(target.pos)];
            else return ERR_NOT_FOUND;
        }
        switch (structure) {
            case "labs":{
                if (settings.resourceType !== RESOURCE_ENERGY) {
                    if (global.labs[this.name]) {
                        if (global.labs[this.name][settings.resourceType] && _.filter(global.labs[this.name][settings.resourceType], l => l.store.getFreeCapacity(settings.resourceType) > 0)) {
                            const labPos = global.labs[this.name][settings.resourceType].length - 1;
                            const target = global.labs[this.name][settings.resourceType][labPos];
                            return [target.id,utils.getPos(target.pos)];
                        }else if (global.labs[this.name]["vacant"]) {
                            const target = global.labs[this.name]["vacant"][0];
                            return [target.id,utils.getPos(target.pos)];
                        }else return ERR_NOT_FOUND;
                    }else return ERR_NOT_FOUND;
                }else {
                    const target = _.filter(this["labs"],l => l.store.getFreeCapacity(RESOURCE_ENERGY) > 0)[0];
                    if (!target) return ERR_NOT_FOUND;
                    else return [target.id,utils.getPos(target.pos)];
                }
            }
            case "towers":{
                let towers = _.filter(this["towers"], t=>t.store.getUsedCapacity(RESOURCE_ENERGY) <= towerConfig.reservedEnergy);
                towers.sort((a,b) => a.pos.getRangeTo(settings.creep) - b.pos.getRangeTo(settings.creep));
                const target = towers[0];
                if (target) return [target.id,utils.getPos(target.pos)];
                else return ERR_NOT_FOUND;
            }
            default:{
                let target = undefined;
                if (structure.charAt(structure.length - 1) === "s") {
                    const targets = _.filter(this[structure],s => s.store.getFreeCapacity(settings.resourceType) > 0);
                    targets.sort((a,b)=>a.pos.getRangeTo(settings.creep) - b.pos.getRangeTo(settings.creep));
                    target = targets[0];
                }else if ((this[structure].store.getFreeCapacity() || this[structure].store.getFreeCapacity(settings.resourceType)) > 0) target = this[structure];
                if (!target) return ERR_NOT_FOUND;
                return [target.id,utils.getPos(target.pos)];
            }
        }
    }
}

_.assign(Room.prototype,roomExtensions);