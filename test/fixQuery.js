/**
 * Created by fnyang on 6/28/17.
 */
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


function click(req, filename, res) {
    generateQuery(req, function (err, query) {

        wholeProcess(query, function (err, data) {
            if(err) console.log(err);
            else{
                var result = data.ResultSet.Rows;
                saveToFile(filename,result, req, function (path) {
                    res.redirect(path);
                });
            }
        })
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
            if(value.VarCharValue != null) {
                line = line + value.VarCharValue.replace(/,/g, "||") + ",";
            }
        });

        fs.appendFile(file, line + "\n", function (err) {
            if(err) console.log(err);
        });
        if(l==0 && len == 0){
            callback("/");
        }
    });

}

function generateQuery(req, callback) {

    if(fs.existsSync(__dirname + "/delayed_start")) {
        fs.readFile(__dirname + "/delayed_start", 'utf8', function (err, content) {
            if (err) console.log(err);
            else {
                content = content.replace('beginTime', new Date(req.param('beginTime')).toISOString());
                console.log(content);
                callback(null, content);
            }
        });
    }else{
        console.log("Cannot find!!");
    }

};

module.exports = function() {
    return function(req, res) {
        // Implement the middleware function based on the options object
        // res.send("Loading")
        click(req, req.filename, res);
    }
}

