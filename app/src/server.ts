import express from 'express';
import path from 'path';

const app = express(); 

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

app.use(express.urlencoded({ extended: false })); //entende os dados enviados por formularios e coloca em req.body

app.get('/', (req, res) => {
    res.redirect('/login');
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', (req, res) => {
  console.log(req.body); 
  res.send('Login recebido');
});

app.get('/cadastro', (req, res) => {
  res.send('Tela de cadastro');
});

app.get('/painel', (req, res) => {
  res.send('Painel');
});

app.get('/agendar', (req, res) => {
  res.send('Tela de agendamento');
});

app.listen(3000, () => {
  console.log('Rodando em http://localhost:3000');
});