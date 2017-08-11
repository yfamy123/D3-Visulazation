var AWS = require('aws-sdk');
// var AWS = require('aws-sdk/global');
var http = require('http');
var ejs = require('ejs');
var fs = require('fs');
var express = require("express");
var jsonfile = require('jsonfile')
var dateTime = require('node-datetime');

var athena = new AWS.Athena({region:"us-east-1",apiVersion: '2017-05-18'});


function getResult(query, callback) {
    var params = generate_params(query);

    var request = athena.startQueryExecution(params);

    request.on('success', function(response) {}).
    on('error', function(response) {
        console.log("Error!");
    }).
    on('complete', function(response) {})
        .send(function (err,response) {
            if(err) console.log(err);
            else {
                var loop = setInterval(function () {
                    var status = athena.getQueryExecution(response)
                    status.on("complete", function () {}
                    ).send(function (err,data) {
                        if (err) console.log(err);
                        else {
                            console.log(data.QueryExecution.Status.State);

                            if(data.QueryExecution.Status.State == 'SUCCEEDED') {
                                callback(err, athena.getQueryResults(response));
                                clearInterval(loop);
                            }
                            status = athena.getQueryExecution(response);
                        }

                    });
                }, 10000);


            }
            return;
        });
}


function generate_params(query) {
    var params= {
        QueryString: query, /* required */
        ResultConfiguration: { /* required */
            OutputLocation: 's3://test-lambda-us-east-1/js', /* required */
        },
        QueryExecutionContext: {
            Database: 'test'
        }
    };
    return params;
}

function wholeProcess(query, callback){
    console.log(query);
    getResult(query,function (err, result) {
        if (err) console.log(err);
        else {
            result.
            on('success', function(response) {}).
            on('error', function(response) {
                console.log("Error in result!");
            }).
            on('complete', function() {
                console.log("Always in result!");
            }).
            send(function (err, data) {
                if(err) console.log(err);
                else{
                    // console.log(data.ResultSet.Rows);
                    callback(null, data);
                }
            });
        }
    });
}


function click(req,filename, res) {

    wholeProcess(generateQuery(req), function (err, data) {
        if(err) console.log(err);
        else{
            var result = data.ResultSet.Rows;
            saveToFile(filename, result, req, function (path) {
                res.redirect(path);
            });
        }
    })
}


function saveToFile(filename, result, req, callback) {

    var file = './' + filename + '.csv';

    fs.writeFile("log/updateFile.txt", filename, function (err) {
        if (err) {
            console.log(err);
        }
    })

    var dt = dateTime.create();
    var formatted = dt.format('Y-m-d H:M:S');
    var text = "The data is updated at " + formatted + ", You can update it with Refresh buttom";
    fs.writeFile("log/updateTime.txt", text, function (err) {
        if (err) {
            console.log(err);
        }
    })

    if (fs.existsSync(file)){
        fs.unlink(file, function () {
            processData(result, file, req, function (path) {
                callback(path);
            })
        });
    }else{

        processData(result, file, req, function (path) {
            callback(path);
        })

    }




}

function processData(datas, file, req, callback) {
    var l = datas.length;
    datas.forEach(function (data){
        l--;
        var line = "";
        var len = data.Data.length;
        data.Data.forEach(function (value) {
            len--;
            if (value.VarCharValue == null){
                line += "null,"
            }else {
                line = line + value.VarCharValue.replace(/,/g, "||") + ",";
            }

        });

        fs.appendFile(file, line + "\n", function (err) {
            if(err) console.log(err);
        });
        if(l==0 && len == 0){
            if(req.param('jobflowid')){
                callback("../test/record.html")
            }else{
                callback("/test/test.html");
            }

        }
    });

}

function generateQuery(req) {

    if(req.param('jobflowid')) {
        return query = "SELECT * " +
            "FROM jobflowinstancegroup AS j1 " +
            "JOIN jobflow AS j2 " +
            "ON j2.uniquekey.hashkey = j1.jobflow.reference.hashkey " +
            "LEFT JOIN jobflowinstancefleet AS j3 " +
            "ON j2.uniquekey.hashkey = j3.jobflow.reference.hashkey " +
            "LEFT JOIN jobflowstep j4 " +
            "ON j2.uniquekey.hashkey = j4.jobflow.reference.hashkey " +
            "LEFT JOIN jobflowbootstrapaction j5 " +
            "ON j2.uniquekey.hashkey = j5.jobflow.reference.hashkey " +
            "WHERE j2.jobflowid = " + req.param('jobflowid');
    }else{
        return query = "select * from " + req.param('table')
            + " where from_iso8601_timestamp(creationDateTime) > from_iso8601_timestamp('" + new Date(req.param('beginTime')).toISOString() + "')"
            + " and from_iso8601_timestamp(creationDateTime) < from_iso8601_timestamp('" + new Date(req.param('endTime')).toISOString() + "');";
    }
}

module.exports = function() {
    return function(req, res) {
        // Implement the middleware function based on the options object
        // res.send("Loading")
        if(req.param('jobflowid')) {
            click(req, req.recordfilename, res);
        }else {
            click(req, req.filename, res);
        }
    }
}

var schedule = require('node-schedule');

var rule = new schedule.RecurrenceRule();
rule.hour = new schedule.Range(0, 24, 6);

var j = schedule.scheduleJob(rule, function(){
    console.log("time out")
    wholeProcess("MSCK REPAIR TABLE jobflow", function () {
        console.log("update")
    })
});
