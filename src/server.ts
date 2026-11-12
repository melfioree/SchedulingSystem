import express from 'express'

const app = express(); 

app.get('/', (req, res) => {
    res.send('Portal de Agendamento')
});

app.listen(3000, () => {
  console.log('Rodando em http://localhost:3000');
});