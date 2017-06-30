/**
 * Created by fnyang on 6/28/17.
 */
/**
 * Created by fnyang on 6/26/17.
 */
'use strict';


var stateChart = dc.pieChart('#state-chart');
var eventTypeChart = dc.pieChart('#eventType-chart');
var nasdaqTable = dc.dataTable('.dc-data-table');

// d3.csv("http://localhost:3000/test/Data.csv", function(err, data) {
d3.csv("Data.csv", function(err, data) {

    var formatNumber = d3.format(",d"),
        formatChange = d3.format("+,d"),
        formatDate = d3.time.format("%Y-%m-%d"),
        formatTime = d3.time.format("%H:%M:%S");

    var nestByDate = d3.nest()
        .key(function(d) { return d3.time.day(d.startdatetime); });

    data.forEach(function(d, i) {
        d.index = i;
        d.creationdatetime = parseDate(d.creationdatetime);
        d.initialstartdatetime = parseDate(d.initialstartdatetime);
        d.scheduledstarttime = parseDate(d.scheduledstarttime);
        d.startdatetime = parseDate(d.startdatetime);
        d.jobflowid = + d.jobflowid;
        d.numfailures = + d.numfailures;
        d.numruns = + d.numruns;
    });


    // Create the crossfilter for the relevant dimensions and groups.
    var tagEvents = crossfilter(data),
        all = tagEvents.groupAll(),

        createDate = tagEvents.dimension(function(d) { return d.creationdatetime; }),
        initialDate = tagEvents.dimension(function(d) { return d.initialstartdatetime; }),
        scheduledDate = tagEvents.dimension(function(d) { return d.scheduledstarttime; }),

        startDate = tagEvents.dimension(function(d) { return d.startdatetime; }),
        startDay = startDate.group(d3.time.day),

        createMonth = tagEvents.dimension(function(d) { return d.month; }),

        hour = tagEvents.dimension(function(d) { return d.startdatetime.getHours() + d.startdatetime.getMinutes() / 60; }),
        hours = hour.group(Math.floor),

        numFailures = tagEvents.dimension(function(d) { return Math.max(-60, Math.min(149, d.numfailures)); }),
        numRuns = tagEvents.dimension(function(d) { return Math.max(-60, Math.min(149, d.numruns)); }),

        states = tagEvents.dimension(function (d) { return ""+d.state }),
        statesGroup = states.group().reduceCount(function (d) {d.startdatetime}),

        eventType = tagEvents.dimension(function (d) {return ""+d.eventtype}),
        eventTypeGroup = eventType.group();




    var charts = [

        barChart()
            .dimension(startDate)
            .group(startDay)
            .round(d3.time.day.round)
            .x(d3.time.scale()
                .domain([new Date(2017,0,1), Date.now()])
                .rangeRound([0, 10 * 40])),

        barChart()
            .dimension(hour)
            .group(hours)
            .x(d3.scale.linear()
                .domain([0, 24])
                .rangeRound([0, 10 * 24]))



    ];

    var chart = d3.selectAll(".chart")
        .data(charts)
        .each(function(chart) { chart.on("brush", renderAll).on("brushend", renderAll); });

    // Render the initial lists.
    var list = d3.selectAll(".list")
        .data([TagEventList]);

    // Render the total.
    d3.selectAll("#total")
        .text(formatNumber(tagEvents.size()));

    renderAll();

    // Renders the specified chart or list.
    function render(method) {
        d3.select(this).call(method);
    }

    // Whenever the brush moves, re-rendering everything.
    function renderAll() {
        chart.each(render);
        list.each(render);
        d3.select("#active").text(formatNumber(all.value()));
    }

    // Like d3.time.format, but faster.
    function parseDate(d) {
        return new Date(d);
    }

    window.filter = function(filters) {
        filters.forEach(function(d, i) { charts[i].filter(d); });
        renderAll();
    };

    window.reset = function(i) {
        charts[i].filter(null);
        renderAll();
    };

    function TagEventList(div) {
        var eventByDate = nestByDate.entries(startDate.top(40));

        div.each(function() {
            var date = d3.select(this).selectAll(".date")
                .data(eventByDate, function(d) { return d.key; });

            date.enter().append("div")
                .attr("class", "date")
                .append("div")
                .attr("class", "day")
                .text(function(d) { return formatDate(d.values[0].startdatetime); })

            date.exit().remove();

            var tag = date.order().selectAll(".event")
                .data(function(d) { return d.values; }, function(d) { return d.index; });

            var tagEnter = tag.enter().append("div")
                .attr("class", "event");

            tagEnter.append("div")
                .attr("class", "starttime")
                .text(function(d) { return formatTime(d.startdatetime); });

            tagEnter.append("div")
                .attr("class", "ID")
                .text(function (d) {return d.jobflowid})
                .on("click", function (d) {
                    window.open("https://aegir-us-east-1.amazon.com/ClusterDetail?clusterId=" +d.jobflowid+ "&domain=preprod&realm=us-east-1");
                });

            tagEnter.append("div")
                .attr("class", "eventID")
                .text(function(d) { return d.eventid; });

            tagEnter.append("div")
                .attr("class", "typeE")
                .text(function(d) { return d.eventtype; });

            tagEnter.append("div")
                .attr("class", "state")
                .text(function(d) { return d.state; });

            tagEnter.append("div")
                .attr("class", "resourcetype")
                .text(function(d) { return d.resourcetype; });

            tagEnter.append("div")
                .attr("class", "fail")
                .text(function(d) { return formatNumber(d.numfailures); });

            tagEnter.append("div")
                .attr("class", "run")
                .text(function(d) { return formatNumber(d.numruns); });

            tag.exit().remove();

            tag.order();
        });
    }

    function barChart() {
        if (!barChart.id) barChart.id = 0;

        var margin = {top: 10, right: 10, bottom: 20, left: 10},
            x,
            y = d3.scale.linear().range([100, 0]),
            id = barChart.id++,
            axis = d3.svg.axis().orient("bottom"),
            brush = d3.svg.brush(),
            brushDirty,
            dimension,
            group,
            round;

        function chart(div) {
            var width = x.range()[1],
                height = y.range()[0];

            y.domain([0, group.top(1)[0].value]);

            div.each(function() {
                var div = d3.select(this),
                    g = div.select("g");

                // Create the skeletal chart.
                if (g.empty()) {
                    div.select(".title").append("a")
                        .attr("href", "javascript:reset(" + id + ")")
                        .attr("class", "reset")
                        .text("reset")
                        .style("display", "none");

                    g = div.append("svg")
                        .attr("width", width + margin.left + margin.right)
                        .attr("height", height + margin.top + margin.bottom)
                        .append("g")
                        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

                    g.append("clipPath")
                        .attr("id", "clip-" + id)
                        .append("rect")
                        .attr("width", width)
                        .attr("height", height);

                    g.selectAll(".bar")
                        .data(["background", "foreground"])
                        .enter().append("path")
                        .attr("class", function(d) { return d + " bar"; })
                        .datum(group.all());

                    g.selectAll(".foreground.bar")
                        .attr("clip-path", "url(#clip-" + id + ")");

                    g.append("g")
                        .attr("class", "axis")
                        .attr("transform", "translate(0," + height + ")")
                        .call(axis);

                    // Initialize the brush component with pretty resize handles.
                    var gBrush = g.append("g").attr("class", "brush").call(brush);
                    gBrush.selectAll("rect").attr("height", height);
                    gBrush.selectAll(".resize").append("path").attr("d", resizePath);
                }

                // Only redraw the brush if set externally.
                if (brushDirty) {
                    brushDirty = false;
                    g.selectAll(".brush").call(brush);
                    div.select(".title a").style("display", brush.empty() ? "none" : null);
                    if (brush.empty()) {
                        g.selectAll("#clip-" + id + " rect")
                            .attr("x", 0)
                            .attr("width", width);
                    } else {
                        var extent = brush.extent();
                        g.selectAll("#clip-" + id + " rect")
                            .attr("x", x(extent[0]))
                            .attr("width", x(extent[1]) - x(extent[0]));
                    }
                }

                g.selectAll(".bar").attr("d", barPath);
            });

            function barPath(groups) {
                var path = [],
                    i = -1,
                    n = groups.length,
                    d;
                while (++i < n) {
                    d = groups[i];
                    path.push("M", x(d.key), ",", height, "V", y(d.value), "h9V", height);
                }
                return path.join("");
            }

            function resizePath(d) {
                var e = +(d == "e"),
                    x = e ? 1 : -1,
                    y = height / 3;
                return "M" + (.5 * x) + "," + y
                    + "A6,6 0 0 " + e + " " + (6.5 * x) + "," + (y + 6)
                    + "V" + (2 * y - 6)
                    + "A6,6 0 0 " + e + " " + (.5 * x) + "," + (2 * y)
                    + "Z"
                    + "M" + (2.5 * x) + "," + (y + 8)
                    + "V" + (2 * y - 8)
                    + "M" + (4.5 * x) + "," + (y + 8)
                    + "V" + (2 * y - 8);
            }
        }

        brush.on("brushstart.chart", function() {
            var div = d3.select(this.parentNode.parentNode.parentNode);
            div.select(".title a").style("display", null);
        });

        brush.on("brush.chart", function() {
            var g = d3.select(this.parentNode),
                extent = brush.extent();
            if (round) g.select(".brush")
                .call(brush.extent(extent = extent.map(round)))
                .selectAll(".resize")
                .style("display", null);
            g.select("#clip-" + id + " rect")
                .attr("x", x(extent[0]))
                .attr("width", x(extent[1]) - x(extent[0]));
            dimension.filterRange(extent);
        });

        brush.on("brushend.chart", function() {
            if (brush.empty()) {
                var div = d3.select(this.parentNode.parentNode.parentNode);
                div.select(".title a").style("display", "none");
                div.select("#clip-" + id + " rect").attr("x", null).attr("width", "100%");
                dimension.filterAll();
            }
        });

        chart.margin = function(_) {
            if (!arguments.length) return margin;
            margin = _;
            return chart;
        };

        chart.x = function(_) {
            if (!arguments.length) return x;
            x = _;
            axis.scale(x);
            brush.x(x);
            return chart;
        };

        chart.y = function(_) {
            if (!arguments.length) return y;
            y = _;
            return chart;
        };

        chart.dimension = function(_) {
            if (!arguments.length) return dimension;
            dimension = _;
            return chart;
        };

        chart.filter = function(_) {
            if (_) {
                brush.extent(_);
                dimension.filterRange(_);
            } else {
                brush.clear();
                dimension.filterAll();
            }
            brushDirty = true;
            return chart;
        };

        chart.group = function(_) {
            if (!arguments.length) return group;
            group = _;
            return chart;
        };

        chart.round = function(_) {
            if (!arguments.length) return round;
            round = _;
            return chart;
        };

        return d3.rebind(chart, brush, "on");
    }

    stateChart /* dc.pieChart('#quarter-chart', 'chartGroup') */
        .width(180)
        .height(180)
        .radius(80)
        .innerRadius(30)
        .dimension(states)
        .group(statesGroup);

    eventTypeChart
        .width(180)
        .height(180)
        .radius(80)
        .innerRadius(30)
        .dimension(eventType)
        .group(eventTypeGroup);


    nasdaqTable /* dc.dataTable('.dc-data-table', 'chartGroup') */
        .dimension(startDate)
        // Data table does not use crossfilter group but rather a closure
        // as a grouping function
        .group(function (d) {
            var format = d3.format('02d');
            return d.startdatetime.getFullYear() + '/' + format((d.startdatetime.getMonth() + 1));
        })
        // (_optional_) max number of records to be shown, `default = 25`
        .size(50)
        // There are several ways to specify the columns; see the data-table documentation.
        // This code demonstrates generating the column header automatically based on the columns.
        .columns([
            // Use the `d.date` field; capitalized automatically
            'startdatetime',
            // Use `d.open`, `d.close`
            'eventid'
        ])

        // (_optional_) sort using the given field, `default = function(d){return d;}`
        .sortBy(function (d) {
            return d.startdatetime;
        })
        // (_optional_) sort order, `default = d3.ascending`
        .order(d3.ascending)
        // (_optional_) custom renderlet to post-process chart using [D3](http://d3js.org)
        .on('renderlet', function (table) {
            table.selectAll('.dc-table-group').classed('info', true);
        });


    dc.renderAll();

})
