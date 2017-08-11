/**
 * Created by fnyang on 6/26/17.
 */
'use strict';

var stateChart = dc.pieChart('#state-chart');
var subnetChart = dc.pieChart('#eventType-chart');
var serviceRoleChart = dc.pieChart('#serviceRole-chart');
var nasdaqTable = dc.dataTable('.dc-data-table');
var nasdaqCount = dc.dataCount('.dc-data-count');
var fluctuationChart = dc.barChart('#fluctuation-chart');



// d3.csv("http://localhost:3000/test/Data.csv", function(err, data) {
d3.csv("Data.csv", function(err, data) {

    var formatNumber = d3.format(",d"),
        formatChange = d3.format("+,d"),
        formatDate = d3.time.format("%Y-%m-%d"),
        formatTime = d3.time.format("%H:%M:%S"),
        formatHour= d3.time.format("%H"),
        formatDay= d3.time.format("%d");

    var nestByDate = d3.nest()
        .key(function(d) { return d3.time.day(d.startdatetime); });



    data.forEach(function(d, i) {
        d.index = i;
        d.creationdatetime = parseDate(d.creationdatetime);
        d.initialstartdatetime = parseDate(d.initialstartdatetime);
        d.scheduledstarttime = parseDate(d.scheduledstarttime);
        d.startdatetime = parseDate(d.startdatetime);
        // d.lastModified = parseDate(transToJson(d.domainrealmupdaterecord).lastModified);
        d.lastmodifydate = parseModifyTime(d.domainrealmupdaterecord);
        // console.log(d.lastmodifydate);

        d.jobflowid = + d.jobflowid;
        d.numfailures = + d.numfailures;
        d.numruns = + d.numruns;
        d.modifyDate = formatDate(d.lastmodifydate);
        d.modifyTime = formatTime(d.lastmodifydate);
    });


    // Create the crossfilter for the relevant dimensions and groups.
    var tagEvents = crossfilter(data),
        all = tagEvents.groupAll(),

        createDate = tagEvents.dimension(function(d) { return d.creationdatetime; }),
        initialDate = tagEvents.dimension(function(d) { return d.initialstartdatetime; }),
        scheduledDate = tagEvents.dimension(function(d) { return d.scheduledstarttime; }),

        modifyDate = tagEvents.dimension(function(d) { return d.lastmodifydate; }),
        modifyDay = modifyDate.group(d3.time.hour),

        createMonth = tagEvents.dimension(function(d) { return d.month; }),
        volumeByMonthGroup = createMonth.group(),

        hour = tagEvents.dimension(function(d) { return d.startdatetime.getHours() + d.startdatetime.getMinutes() / 60; }),
        hours = hour.group(Math.floor),

        numFailures = tagEvents.dimension(function(d) { return Math.max(-60, Math.min(149, d.numfailures)); }),
        numRuns = tagEvents.dimension(function(d) { return Math.max(-60, Math.min(149, d.numruns)); }),

        states = tagEvents.dimension(function (d) { return ""+d.state }),
        statesGroup = states.group(),

        isSubnetPrivate = tagEvents.dimension(function (d) {return ""+d.issubnetprivate}),
        isSubnetPrivateGroup = isSubnetPrivate.group(),

        serviceRole = tagEvents.dimension(function (d) {return ""+d.servicerole}),
        serviceRoleGroup = serviceRole.group();


    // Like d3.time.format, but faster.
    function parseDate(d) {
        return new Date(d);
    }

    function parseModifyTime(s) {
        var iso = /\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/;

        var time = s.match(iso);

        if(time == null){
            throw new Error("Invalid Date");
        }else{
            return parseDate(time[0]);
        }
    }


    stateChart /* dc.pieChart('#quarter-chart', 'chartGroup') */
        .width(200)
        .height(270)
        .radius(80)
        .innerRadius(30)
        .dimension(states)
        .group(statesGroup)
        .legend(dc.legend());

    stateChart.on('pretransition', function(chart) {
        chart.selectAll('.dc-legend-item text')
            .text('')
            .append('tspan')
            .text(function(d) { return d.name; })
            .append('tspan')
            .attr('x', 100)
            .attr('text-anchor', 'end')
            .text(function(d) { return d.data; });
    });
    stateChart.render();

    subnetChart
        .width(200)
        .height(270)
        .radius(80)
        .innerRadius(30)
        .dimension(isSubnetPrivate)
        .group(isSubnetPrivateGroup)
        .legend(dc.legend());

    subnetChart.on('pretransition', function(chart) {
        chart.selectAll('.dc-legend-item text')
            .text('')
            .append('tspan')
            .text(function(d) { return d.name; })
            .append('tspan')
            .attr('x', 100)
            .attr('text-anchor', 'end')
            .text(function(d) { return d.data; });
    });
    subnetChart.render();

    serviceRoleChart
        .width(200)
        .height(270)
        .radius(80)
        .innerRadius(30)
        .dimension(serviceRole)
        .group(serviceRoleGroup)
        .legend(dc.legend());

    serviceRoleChart.on('pretransition', function(chart) {
        chart.selectAll('.dc-legend-item text')
            .text('')
            .append('tspan')
            .text(function(d) { return d.name; })
            .append('tspan')
            .attr('x', 150)
            .attr('text-anchor', 'end')
            .text(function(d) { return d.data; });
    });
    serviceRoleChart.render();


    nasdaqCount /* dc.dataCount('.dc-data-count', 'chartGroup'); */
        .dimension(tagEvents)
        .group(all)
        // (_optional_) `.html` sets different html when some records or all records are selected.
        // `.html` replaces everything in the anchor with the html given using the following function.
        // `%filter-count` and `%total-count` are replaced with the values obtained.
        .html({
            some: '<strong>%filter-count</strong> selected out of <strong>%total-count</strong> records' +
            ' | <a href=\'javascript:dc.filterAll(); dc.renderAll();\'>Reset All</a>',
            all: 'All records selected. Please click on the graph to apply filters.'
        });


    nasdaqTable /* dc.dataTable('.dc-data-table', 'chartGroup') */
        .dimension(modifyDate)
        // Data table does not use crossfilter group but rather a closure
        // as a grouping function
        .group(function (d) {
            var format = d3.format('02d');
            return d.lastmodifydate.getFullYear() + '/' + format((d.lastmodifydate.getMonth() + 1));
        })
        // (_optional_) max number of records to be shown, `default = 25`
        .size(100)
        // There are several ways to specify the columns; see the data-table documentation.
        // This code demonstrates generating the column header automatically based on the columns.
        .columns([
            // Use the `d.date` field; capitalized automatically
            'modifyDate',
            'modifyTime',
            {
                label: 'jobflowid',
                format: function (d) {
                    return '<a href="https://aegir-us-east-1.amazon.com/ClusterDetail?clusterId=' + d.jobflowid + '&domain=preprod&realm=us-east-1">' + d.jobflowid + '</a>';
                }
            },
            'amiids',
            {
                label: 'Detail',
                format: function (d) {
                    return '<a href="../query/query?jobflowid=' + d.jobflowid + '">link</a>';
                }
            }

        ])

        // (_optional_) sort using the given field, `default = function(d){return d;}`
        .sortBy(function (d) {
            return d.lastmodifydate;
        })
        // (_optional_) sort order, `default = d3.ascending`
        .order(d3.descending)
        // (_optional_) custom renderlet to post-process chart using [D3](http://d3js.org)
        .on('renderlet', function (table) {
            table.selectAll('.dc-table-group').classed('info', true);
        });

    fluctuationChart /* dc.barChart('#volume-month-chart', 'chartGroup') */
        .width(400)
        .height(180)
        .margins({top: 10, right: 50, bottom: 30, left: 40})
        .dimension(modifyDate)
        .group(modifyDay)
        .elasticY(true)
        // (_optional_) whether bar should be center to its x value. Not needed for ordinal chart, `default=false`
        .centerBar(true)
        // (_optional_) set gap between bars manually in px, `default=2`
        .gap(1)
        // (_optional_) set filter brush rounding
        .round(d3.time.hour.round)
        .alwaysUseRounding(true)
        .renderHorizontalGridLines(true)
        .xUnits(function () {return 20})
        .x(d3.time.scale()
            .domain([new Date().setDate(new Date().getDate()-5), Date.now()]));
            // .domain([new Date().setMonth(new Date().getMonth()-1), Date.now()]));

    // Customize axes
    fluctuationChart.xAxis().tickFormat(
        function (d) { return formatDay(d) + "d" + formatHour(d); }).ticks(10);
    fluctuationChart.yAxis().ticks(5);



    dc.renderAll();

})
