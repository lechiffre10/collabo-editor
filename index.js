var r = require('rethinkdb');
var express = require('express');
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

r.connect({ host: 'localhost', port: 28015, db:'test'}, function(err,conn) {
    if (err) throw err;
    r.db('test').tableList().run(conn, function (err, response) {
        if (response.indexOf('edit') > -1) {
            // do nothing it is created...
            console.log('table exists, skipping create...');
            console.log('Tables - ' + response);
        } else {
            //create table
            console.log('Tables does not exist. Creating');
            r.db('test').tableCreate('edit').run(conn);
        }
    });

    io.on('connection', function(socket) {
        console.log('a user connected');
        socket.on('disconnect', function () {
            console.log('user disconnected');
        });
        socket.on('document-update', function(msg){
            console.log(msg);
            r.table('edit').insert({ id: msg.id, value: msg.value, user: msg.user}, {conflict: "update"}).run(conn, function(err,res){
                if (err) throw err;
                // console.log(JSON.stringify(res, null, 2));
            });
        });
        r.table('edit').changes().run(conn, function(err, cursor){
            if (err) throw err;
            cursor.each(function(err, row){
                if (err) throw err;
                io.emit('doc', row);
            });
        });
    });
    app.get('/getData/:id', function(req, res, next){
        r.table('edit').get(req.params.id).
            run(conn, function(err, result){
            if (err) throw err;
            res.send(result);
            //return next(result);
        });
    });
});

// Server Html
app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

app.use('/bower_components', express.static('bower_components'));

// Setup Express listener

http.listen(8080, '0.0.0.0', function () {
    console.log('listening on: 0.0.0.0:8080');
});