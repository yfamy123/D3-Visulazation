/**
 * Created by fnyang on 6/29/17.
 */
'use strict';

var typeofJob = dc.rowChart('#type-of-job-chart');
// d3.csv("http://localhost:3000/test/Data.csv", function(err, data) {
d3.csv("record.csv", function(err, data) {

    if(err) console.log(err);

    var formatNumber = d3.format(",d"),
        formatChange = d3.format("+,d"),
        formatDate = d3.time.format("%Y-%m-%d"),
        formatTime = d3.time.format("%H:%M:%S"),
        formatDay = d3.time.format("%e");

    var record = crossfilter(data),
        all = record.groupAll(),
        InstanceGroup = record.dimension(function(d) {return ""+d.markettype;}),
        InstanceGroupCount = InstanceGroup.group();


    typeofJob /* dc.rowChart('#day-of-week-chart', 'chartGroup') */
        .width(180)
        .height(180)
        .margins({top: 20, left: 10, right: 10, bottom: 20})
        .group(InstanceGroup)
        .dimension(InstanceGroupCount)
        // Assign colors to each value in the x scale domain
        .ordinalColors(['#3182bd', '#6baed6', '#9ecae1', '#c6dbef', '#dadaeb'])
        .label(function (d) {
            return d.key.split('.')[1];
        })
        // Title sets the row text
        .title(function (d) {
            return d.value;
        })
        .elasticX(true)
        .xAxis().ticks(4);

    dc.renderAll();

})