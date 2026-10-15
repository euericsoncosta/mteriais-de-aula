# Lista Prática — Escrevendo Funções em Python

**E.E.E.P. Lúcia Helena Viana Ribeiro — Horizonte/CE**
Disciplina: Lógica de Programação · Tema: Funções · Atividade de laboratório

Nome: ______________________________________ Turma: ________ Data: ____/____/______

---

## Antes de começar

1. Abra o VS Code e crie um arquivo chamado `funcoes.py`
2. Escreva todas as funções nesse mesmo arquivo
3. Teste cada uma com o exemplo de execução dado na questão
4. Para rodar no terminal:

| Sistema | Comando |
|---|---|
| Windows | `python funcoes.py` |
| Linux | `python3 funcoes.py` |

---

## Lembre-se

```python
def nome_da_funcao(parametro):
    return resultado

print(nome_da_funcao(valor))
```

- `def` inicia a definição e a linha termina com **dois-pontos**
- O corpo da função fica **recuado**
- `return` devolve o valor para quem chamou
- A função só roda quando é chamada pelo nome

---

## Questões

### 1. (Fácil) Boas-vindas do laboratório

Escreva uma função chamada `boas_vindas` que **não recebe nada** e mostra na tela a mensagem:

```
Bem-vindo ao laboratorio de informatica
```

Chame a função duas vezes.

**Saída esperada:**

```
Bem-vindo ao laboratorio de informatica
Bem-vindo ao laboratorio de informatica
```

---

### 2. (Fácil) Quadrado de um número

Escreva uma função chamada `quadrado` que recebe um numero e **devolve** esse número elevado ao quadrado.

**Teste com:**

```python
print(quadrado(6))
print(quadrado(9))
```

**Saída esperada:**

```
36
81
```

---

### 3. (Fácil) Saudação personalizada

Escreva uma função chamada `saudacao` que recebe um nome e **devolve** o texto de saudação.

**Teste com:**

```python
print(saudacao("Maria"))
print(saudacao("Joao"))
```

**Saída esperada:**

```
Ola, Maria!
Ola, Joao!
```

---

### 4. (Médio) Média do aluno

Escreva uma função chamada `media_aluno` que recebe duas notas e **devolve** a média.

**Teste com:**

```python
print(media_aluno(8, 6))
print(media_aluno(10, 5))
```

**Saída esperada:**

```
7.0
7.5
```

---

### 5. (Médio) Situação do aluno

Escreva uma função chamada `situacao` que recebe a média e **devolve** um destes textos:

| Média | Texto devolvido |
|---|---|
| 7 ou mais | `Aprovado` |
| de 5 até menos de 7 | `Recuperacao` |
| menos de 5 | `Reprovado` |

**Teste com:**

```python
print(situacao(8))
print(situacao(6))
print(situacao(3))
```

**Saída esperada:**

```
Aprovado
Recuperacao
Reprovado
```

---

### 6. (Médio) Compra na cantina

Escreva uma função chamada `total_compra` que recebe o preco de um item e a quantidade, e **devolve** o valor total.

**Teste com:**

```python
print(total_compra(3.50, 4))
print(total_compra(2.00, 3))
```

**Saída esperada:**

```
14.0
6.0
```

---

### 7. (Médio) Convertendo megabytes

Escreva uma função chamada `mb_para_gb` que recebe uma quantidade em megabytes e **devolve** o valor em gigabytes.

Use: 1 GB = 1024 MB

**Teste com:**

```python
print(mb_para_gb(2048))
print(mb_para_gb(512))
```

**Saída esperada:**

```
2.0
0.5
```

---

### 8. (Médio) Frequência do aluno

Para ser aprovado por frequência, o aluno precisa ter comparecido a **75% ou mais** das aulas.

Escreva uma função chamada `frequencia_ok` que recebe o total de aulas dadas e o número de faltas, e **devolve** `True` se a frequência for suficiente, ou `False` caso contrário.

**Teste com:**

```python
print(frequencia_ok(100, 10))
print(frequencia_ok(100, 40))
```

**Saída esperada:**

```
True
False
```

---

### 9. (Desafio) Conta de internet

Um provedor de Horizonte cobra assim:

- Plano fixo: **R$ 80,00** com franquia de **20 GB**
- Cada GB acima da franquia custa **R$ 5,00**

Escreva uma função chamada `conta_internet` que recebe os GB usados no mês e **devolve** o valor total a pagar.

**Teste com:**

```python
print(conta_internet(15))
print(conta_internet(20))
print(conta_internet(25))
```

**Saída esperada:**

```
80
80
105
```

---

### 10. (Desafio) Boletim completo

Escreva uma função chamada `boletim` que recebe duas notas e **devolve** um texto com a média e a situação do aluno.

**Importante:** use dentro dela as funções `media_aluno` (questão 4) e `situacao` (questão 5). Não repita os cálculos.

**Teste com:**

```python
print(boletim(8, 6))
print(boletim(4, 4))
```

**Saída esperada:**

```
Media: 7.0 - Aprovado
Media: 4.0 - Reprovado
```

---

## Ao terminar

Confira se cada função:

- usa `return` quando precisa devolver um valor
- tem os dois-pontos no final da linha do `def`
- tem o corpo recuado
- foi testada com os valores do enunciado
