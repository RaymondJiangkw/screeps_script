/**
 * @module mount
 */

const   room_resources  =   require('prototype.Room.resources');
const   room_structures =   require('prototype.Room.structures');
const   room_creeps     =   require('prototype.Room.creeps');
const   room_utils      =   require('prototype.Room.utils');
const   creep_travelTo  =   require('prototype.Creep.travelTo');
const   creep_moveTo    =   require('prototype.Creep.moveTo');
const   creep_run       =   require('prototype.Creep.run');

const   creep_task      =   require('class.Creep.task');

if (!Memory.task) Memory.task = {info:{}};

global.username         =   "RaymondKevin";
global.timeLine         =   {};
global.info             =   {};
global.creepsTask       =   new creepTask();

global.CONTINUOUS       =   "continuous";

global.INFINITY         =   32767;

global.ERR_WRONG_TIME   =   -20;
global.ERR_TASK_EXISTS  =   -21;
global.ERR_INVALID_HOST =   -22;
global.ERR_NOT_FOUND    =   -23;
global.ERR_WAITING      =   -24;
global.ERR_RECYCLE      =   -25;

// The trick here is to let them to be 2^n - 1, and let signal which has higher priority to have higher n in order to "cover" those less preferential.
global.ERR_DELETE       =   15;
global.FINISH           =   7;
global.ERR_RENEW        =   3;
global.ERR_REPEAT       =   1;