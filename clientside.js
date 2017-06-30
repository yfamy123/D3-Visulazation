/**
 * Created by fnyang on 6/26/17.
 */

const express = require('express')
const now = require('date-now')
const app = express()
var click= require('./app.js')
var loadQuery = require('./test/fixQuery.js')
var path = require('path');

app.use(express.static(path.join(__dirname, 'public')));
app.use('/test',express.static(path.join(__dirname, 'test')));
app.use('/visul',express.static(path.join(__dirname, 'visul')));
app.use('/log',express.static(path.join(__dirname, 'log')));
app.use('/visul-example',express.static(path.join(__dirname, 'visul-example')));

var filename = function (req, res, next) {
    req.filename = "test/Data";
    req.recordfilename = "test/record";
    next()
}

app.use(filename);

app.get('/action', function (req,res) {
    switch (req.param('action')){
        case "Refresh":
            res.redirect('query/query?table=' + req.param('table') +'&beginTime='+ req.param('beginTime') +'&endTime=' + req.param('endTime'));
            break;
        case "Visualization":
            res.redirect('/test/test.html')
            break;
        case "ClusterStatus":
            res.redirect('cluster/cluster?beginTime='+ req.param('beginTime'));
            break;
        case "Search":
            res.redirect('query/query?jobflowid='+ req.param('jobflowid'));
        default:
            res.send("Wrong action");
    }
})

app.get('/query/query',click());
app.get('/cluster/cluster',loadQuery())




var server = app.listen(3000, function () {
    var port = server.address().port

    console.log("Example app listening at http://localhost:%s",port)
})

