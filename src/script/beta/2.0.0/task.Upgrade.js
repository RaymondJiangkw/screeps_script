const OPEN_UPGRADE_ENGINE = {
    "W18N29":0,
    "W18N22":1,
}
const HAS_CENTRAL_UNIT = ["W18N29"];
module.exports = function () {
    for (var roomName of global.rooms.my) {
        var upgradeNum = 1;
        var controllerCondition = Game.rooms[roomName].controller.level < 8 && Game.rooms[roomName].controller.level >= 5;
        var linkCondition = global.links[roomName].resources.length > 0 && (global.links[roomName].upgrade.length > 0 || HAS_CENTRAL_UNIT.indexOf(roomName) >= 0);
        if (controllerCondition && linkCondition && OPEN_UPGRADE_ENGINE[roomName] > 0) upgradeNum += OPEN_UPGRADE_ENGINE[roomName];
        for (var _ = 0; _ < upgradeNum; _++) Game.rooms[roomName].AddUpgradeTask(_);
    }
}