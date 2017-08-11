/**
 * Created by fnyang on 7/6/17.
 */
var schedule = require('node-schedule');

var t = new Date();
t.setSeconds(t.getSeconds() + 10);

var j = schedule.scheduleJob(t, function(){
    console.log('The world is going to end today.');
});
