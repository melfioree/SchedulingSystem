import express from 'express';
import path from 'path';
import { mostrarCadastro, cadastrar, mostrarLogin, entrar, sair } from './controllers/authController';
import 'dotenv/config';
import session from 'express-session';


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

app.get('/', (req, res) => {
    res.redirect('/login');
});

app.get('/login', mostrarLogin);
app.post('/login', entrar);
app.post('/sair', sair);

app.get('/cadastro', mostrarCadastro);
app.post('/cadastro', cadastrar);

app.get('/painel', (req, res) => {
  if (!req.session.usuario) return res.redirect('/login');
  res.send('Oi, ' + req.session.usuario.nome);
});

app.get('/agendar', (req, res) => {
  res.send('Tela de agendamento');
});

app.listen(3000, () => {
  console.log('Rodando em http://localhost:3000');
});