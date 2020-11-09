

const LoginService = require('./services/login');
const RegisterService = require('./services/new');


/*
    Starts auth server
*/
const Server = require('../config/initializers/server');




/*
    Server endpoints
*/
Server.get('/', (req, res) => {
    res.send("Hola");
})

Server.post('/api/users/login', (req, res) => {
    console.log("ESTOY EN LOGIN");
    //LoginService.Login();
    res.send("USUARIO AUTENTICADO");
});

Server.post('/api/users/register', (req, res) => {
    let user = req.body;
    console.log("REQ USER: ", user);
    RegisterService.Register(user).then((newUser) => {
        res.status(200).send(newUser);
    }).catch((err) => {
        res.status(500).send(err);
    });
});

