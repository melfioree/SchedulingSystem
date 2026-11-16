import 'dotenv/config';
process.env.TZ = 'America/Sao_Paulo';
import express from 'express';
import path from 'path';
import session from 'express-session';
import rateLimit from 'express-rate-limit';
import { mostrarCadastroCliente, cadastrarCliente, mostrarCadastroSocio, cadastrarSocio, mostrarLogin, entrar, sair } from './controllers/authController';
import { exigirLogin, exigirPerfil } from './middlewares/auth';
import { mostrarAgendar, pedirAgendamento } from './controllers/agendamentoController';
import { mostrarReunioes, cancelar, responder, registrar } from './controllers/reuniaoController';

const app = express(); 

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

app.use(express.urlencoded({ extended: false })); //entende os dados enviados por formularios e coloca em req.body
app.use('/bootstrap', express.static(path.join(__dirname, '..', 'node_modules', 'bootstrap', 'dist')));
app.use('/fontes', express.static(path.join(__dirname, '..', 'node_modules', '@fontsource', 'poppins')));
app.use(express.static(path.join(__dirname, '..', 'public')));

const segredo = process.env.SESSION_SECRET;

if (!segredo || segredo.length < 32) {
  throw new Error('SESSION_SECRET ausente ou curto demais. Gere um valor aleatório (veja o .env.example).');
}

app.use(session({
  secret: segredo,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 2 },
}));

app.use((req, res, next) => {
  res.locals.usuario = req.session.usuario ?? null;
  next();
});

const limiteConvite = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Muitas tentativas. Tente novamente em alguns minutos.',
});

// tela inicial de cada perfil, logo depois do login
function telaInicial(perfil: 'CLIENTE' | 'SOCIO') {
  return perfil === 'SOCIO' ? '/reunioes' : '/agendar';
}

app.get('/', (req, res) => {
  res.redirect(req.session.usuario ? telaInicial(req.session.usuario.perfil) : '/login');
});

app.get('/login', mostrarLogin);
app.post('/login', entrar);
app.post('/sair', sair);

app.get('/cadastro', mostrarCadastroCliente);
app.post('/cadastro', cadastrarCliente);

app.get('/cadastro-socio', mostrarCadastroSocio);
app.post('/cadastro-socio', limiteConvite, cadastrarSocio);

app.get('/agendar', exigirPerfil('CLIENTE'), mostrarAgendar);
app.post('/agendar', exigirPerfil('CLIENTE'), pedirAgendamento);

app.get('/reunioes', exigirLogin, mostrarReunioes);
app.post('/reunioes/registrar', exigirPerfil('SOCIO'), registrar);
app.post('/reunioes/:id/cancelar', exigirLogin, cancelar);
app.post('/reunioes/:id/responder', exigirPerfil('SOCIO'), responder);

app.listen(3000, () => {
  console.log('Rodando em http://localhost:3000');
});