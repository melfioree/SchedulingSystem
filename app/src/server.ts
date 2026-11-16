import 'dotenv/config';
import express from 'express';
import path from 'path';
import { mostrarCadastro, cadastrar, mostrarLogin, entrar, sair } from './controllers/authController';
import session from 'express-session';
import { exigirLogin, exigirPerfil } from './middlewares/auth';

const app = express(); 

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

app.use(express.urlencoded({ extended: false })); //entende os dados enviados por formularios e coloca em req.body
app.use('/bootstrap', express.static(path.join(__dirname, '..', 'node_modules', 'bootstrap', 'dist')));
app.use('/fontes', express.static(path.join(__dirname, '..', 'node_modules', '@fontsource', 'poppins')));
app.use(express.static(path.join(__dirname, '..', 'public')));

if (!process.env.SESSION_SECRET) {
  throw new Error('Defina SESSION_SECRET no .env');
}

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 2 },
}));

app.use((req, res, next) => {
  res.locals.usuario = req.session.usuario ?? null;
  next();
});

app.get('/', (req, res) => {
  res.redirect('/login');
});

app.get('/login', mostrarLogin);
app.post('/login', entrar);
app.post('/sair', sair);

app.get('/cadastro', mostrarCadastro);
app.post('/cadastro', cadastrar);

app.get('/painel', exigirLogin, (req, res) => {
  res.render('painel');
});

app.get('/agendar', exigirPerfil('CLIENTE'), (req, res) => {
  res.send('Tela de agendamento');
});
app.get('/socio/pedidos', exigirPerfil('SOCIO'), (req, res) => {
  res.send('Pedidos recebidos');
});

app.listen(3000, () => {
  console.log('Rodando em http://localhost:3000');
});