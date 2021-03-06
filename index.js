const express = require('express');
const cors = require('cors');
const session = require('express-session');
const KnexSessionStore = require('connect-session-knex')(session);
const bcrypt = require('bcryptjs');

const knex = require('knex');
const knexConfig = require('./knexfile.js');

const db = knex(knexConfig.development);

const server = express();
const sessionConfig = {
  name: 'authIsession',
  secret: 'aweioh23489uj.awej8cvac-klsm',
  cookie: {
    maxAge: 1000 * 60 * 10,
    secure: false,
  },
  httpOnly: true,
  resave: false,
  saveUnitialized: false,
  store: new KnexSessionStore({
    tablename: 'sessions',
    sidfieldname: 'sid',
    knex: db,
    createtable: true,
    clearInterval: 1000 * 60 * 60
  })
}

server.use(session(sessionConfig));
server.use(express.json());
server.use(cors());

//ENDPOINTS

//login
server.post('/login', (req,res) => {
  //grab username and password from body
  const credentials = req.body;

  db('users')
    .where({ username: credentials.username })
    .first()
    .then(user => {
      if(user && bcrypt.compareSync(credentials.password, user.password)) { //see COMPARESYNC
        req.session.userId = user.id;
        //passwords match and user exists by that username
        res.status(200).json({message: 'you made it!'})
      } else {
        //either username or password is valid, all returns failure
        res.status(401).json({message: 'incorrect inputs'})
      }
    })
    .catch(err => res.json(err))
})

//registration
server.post('/register', (req,res) => {
  //grab uname and pass
  const credentials = req.body;

  //hash the pass
  const hash = bcrypt.hashSync(credentials.password, 4);

  credentials.password = hash;

  db('users')
    .insert(credentials)
    .then(ids => {
      db('users')
      .where({ id: ids[0]})
      .first()
      .then(user => {
        res.status(201).json(user);
      })
    })
    .catch(err => res.status(500).json(err))
})

server.get('/users', (req, res) => {
  db('users')
    .select('id', 'username', 'password')
    .then(users => {
      res.json(users);
    })
    .catch(err => res.send(err));
});

//RESTRICTED
function protected(req, res, next) {
  // restricts access to only authenticated users
  if (req.session && req.session.userId) {
    next();
  } else {
    //bounce them
    res.status(401).json({ message: 'not allowed'})
  }
}

server.get('/restricted', protected, (req, res) => {
  //if they are logged in, provide access to users
  db('users')
    .select('id', 'username', 'password') // added password to the select****
    .where({ id: req.session.user })
    .first()
    .then(users => {
      res.json(users);
    })
    .catch(err => res.send(err));
});


//SERVER and SERVER RUNNING
server.get('/', (req, res) => {
  res.json({ api: 'server 7700 up and running!' });
});

server.listen(7700, () => console.log('\n== Port 7700 ==\n'));