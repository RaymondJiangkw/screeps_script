const mount = require('mount')
const init = require('prepare.init')
const task = require('main.task')
module.exports.loop = function() {
    mount();
    init();
}