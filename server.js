const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
var mongoose = require("mongoose")
const bodyParser = require('body-parser');

let uri = 'mongodb+srv://hoang96:12345@cluster0.4gn3h.mongodb.net/db1?retryWrites=true&w=majority'

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});
app.get('/test', (req, res) => {
  res.send("success")
})

const userSchema = new mongoose.Schema({
  username: {type: String, unique: true},
  count: { type: Number, default: 0},
  log: [{
    description: String,
    duration: Number,
    date: String,
  }]
})
const User = mongoose.model('User', userSchema);

var createAndSaveUser = (username, done) => {
  var u = new User({username: username});

  u.save(function(err, data) {
    if (err) return console.error(err);
    done(null, data)
  });
};

app.post('/api/users', (req, res) => {
  User.findOne({username: req.body.username}, (err, userFound) => {
    if (err) return console.log(err)
    if (userFound) {
      return res.send("username taken up")
    } else {
      createAndSaveUser(req.body.username,
        function (err, data) {
          if (err) {return err}
        res.json({username: data.username, _id: data._id.toString()})
        })
      }
  })
})

app.get('/api/users', (req, res) => {
  User.find({}, (err, users) => {
    var userMap = [];
    users.forEach(function(user) {
      userMap.push(
        {
          username:user.username,
          _id:user._id.toString()
        }
      )
    });
    res.send(userMap);  
  })
})

app.post('/api/users/:_id/exercises', (req, res) => {
  var {description, duration, date} = req.body;
  var id =  new mongoose.Types.ObjectId(req.params._id)
  if(!date){
    date = new Date();
  }
  User.findById(id, (err, data) => {
    console.log(id)
    if(err) return console.log(err)
    if(!data){
      res.send("Not data")
    }else{
      data.log.push({
        description: description,
        duration: duration,
        date: new Date(date).toDateString()
      })
      data.count = data.log.length;
      data.save((err, updateUser) => {
        if(err) return console.error(err)
        var exercise = updateUser.log[updateUser.log.length - 1]
        console.log(exercise)
        var result = {
          _id: updateUser._id.toString(),
          username: updateUser.username,
          date: exercise.date,
          duration: exercise.duration,          
          description: exercise.description
        }
        res.send(result)
      })
    }
  })
})

app.get('/api/users/:_id/logs', (req, res) => {
  var id = req.params._id;
  var {from, to, limit} = req.query;
  User.findById(id, (err, data) => {
    if(err) return console.log(err)
    let logs = [...data.log]
    
    logs = logs.map(exer => {
      var dateFormatted = new Date(exer.date).toDateString();
      console.log(typeof dateFormatted)
      return {
        "description": exer.description, 
        "duration": exer.duration,
        "date": dateFormatted}
    })

    var counts = logs.length;
    
    if(from || to){
      let fromDate = new Date(0)
      let toDate = new Date()
      if(from){
        fromDate = new Date(from)
      }
      if(to){
        toDate = new Date(to)
      }
      fromDate = fromDate.getTime()
      toDate = toDate.getTime()
      logs = logs.filter((session) => {
        var sessionDate = new Date(session.date).getTime()
        return sessionDate >= fromDate && sessionDate <= toDate 
      })
    }
    if(limit){
      logs = logs.slice(0, limit)
    }

    res.json({
      _id: data.id,
      username: data.username,
      count: counts,
      log: logs
    })
  })
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
