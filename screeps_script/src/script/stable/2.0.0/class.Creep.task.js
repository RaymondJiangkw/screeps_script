/**
 * @module Creep/task
 */

const creepConfig = require('configuration.Creep');
const analyseTaskList = (taskDescription) => {
    let _ = taskDescription.split("-");
    if (!_[1]) _[1] = "all";
    else _[1].split("|");
    return _;
};

/**
 * @class creep Task Manage System.
 */
class creepTask {
    constructor() {
        this._tasks = {};
    }
    isIdle(groupName) {
        if (!this._tasks[groupName]) return true;
        return false;
    }
    deleteTask(home,groupName) {
        Intel.task.deleteTask(home,this._tasks[groupName]);
        delete this._tasks[groupName];
    }
    finishTask(home,groupName) {
        Intel.task.finishTask(home,this._tasks[groupName]);
        delete this._tasks[groupName];
    }
    renewTask(home,groupName) {
        Intel.task.renewTask(home,this._tasks[groupName]);
        delete this._tasks[groupName];
    }
    getTask(home,groupName,creep,dryRun = false) {
        const groupType = groupName.split("_")[0];
        const acceptedTasks = creepConfig.groupsConfig[groupType]["acceptedTasks"];
        for (const taskDescription of acceptedTasks) {
            const _ = analyseTaskList(taskDescription);
            const fingerprint = Intel.task.getTask(home,creep,_[0],_[1]);
            if (fingerprint) {
                if (dryRun) return true;
                else this._tasks[groupName] = fingerprint;
                break;
            }
        }
        return false;
    }
}