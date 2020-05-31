const roomAdvancedTaskExtension = {
    /**
     * Add the Transfer Task.
     * @param   {String}            subTaskType         sub-taskType of "transfer" task.
     * @param   {Object}            from                Object describes the fromTarget.
     * @param   {String}            from.target         The Id of the target, or can be one of the recognizable structureType, such as "storage".
     * @param   {String|undefined}  from.roomName       The room where the target lies. undefined will be interpreted as the home of the working creep.
     * @param   {Object}            to                  Object describes the toTarget.
     * @param   {String}            to.target           The Id of the target, or can be one of the recognizable structureType, such as "storage".
     * @param   {String|undefined}  to.roomName         The room where the target lies. undefined will be interpreted as the home of the working creep.
     * @param   {String}            resourceType        One of the RESOURCE_* Constants. 
     * @param   {Object}            amount              describes the transfer amount.
     * @param   {Number}            amount.stopAmount   From-Structure stop-Amount.
     * @param   {Number}            amount.toStopAmount To-Structure stop-Amount.
     * @param   {Object}            settings            The settings of the task.
     * @param   {Number}            settings.groupsNum  The expected running-groups number, default is 1.
     * @param   {Boolean}           settings.changeable Whether this task is changeable, default is true.
     * @returns {Number}    OK, indicating successful or error code.
     */
    AddAidTask(from,to,resourceType,amount = {stopAmount:0,toStopAmount:0},settings = {groupsNum:1,changeable:true,silence:false,getRepeat:false}){
        return this.AddTransferTask("aid",from,to,resourceType,"full",settings,amount);
    },
}
_.assign(Room.prototype,roomAdvancedTaskExtension)