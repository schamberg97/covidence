# covidence
Node.JS backend


# Основные понятия

baseURL - http(s)-адрес работающей ноды, например http://localhost:8000
нода - комплекс ПО на основе node.js и mongoDB

# Как запустить

cd в директорию проекта >> npm install && node app

# Регистрация, авторизация, сброс пароля 

## Регистрация

POST-запрос в виде JSON на baseURL/user/signup/

### Требуемые данные:

|Ключ|Значение|Обязательно?|
|---|---|---|
|userAgreement| true ; означает согласие с Пользовательским Соглашением | Обязательно |
| user | Имя пользователя, только латиница и цифры, не меньше 6 символов. На сервере запускается .toLowerCase() | Да |
| email | очевидно | да |
| pass | Пароль | да |
| firstname | Имя | да |
| middlename | Отчество | нет, если нету |
| lastname | Фамилия | да |
| phone | Телефон | очень желательно |
| любые другие сведения | любое | нет |

### Ответы

#### Ошибки


0)
`
{
	code: 400,
	status: "error",
	error: "already-authorized"
}
`

Уже авторизован



1)

`
{
	"code": 400,
	"status": "error",
    "error": e || "could-not-register"
}
`

Ключ error может отражать ошибку на стороне сервера или, если ошибка неизвестна, "could-not-register"

Возможные значения - username-taken ; username-too-short ; username-and-email-cannot-be-same ; data-missing ; email-taken

2) 

`
{
    "code": 400,
	"status": "error",
	"error": "wrong-email"
}
`

Плохой email

3) 

`
{
    "code": 400,
	"status": "error",
	"error": "wrong-email"
}
`

4)

`
{
    "code": 403,
	"status": "error",
	"error": "no-consent"
}
`

Отсутствие согласия с Пользовательским Соглашением и ПОПД

4)

`
{
    "code": 403,
	"status": "error",
	"error": "data-missing"
}
`

Недостаточно данных

#### Успех

Ответ со статусом 200 вида

`
{
	"code": 200,
	"status": "ok"
}
`

После регистрации требуется подтверждение по 6-значному коду и email'у.

6-значный код должен прийти или на email (на продакшене) или на сервис ethereal.email. Логин и пароль для входа в ethereal.email высвечиваются в консоли

Вероятно позже можно сделать СМС вместо email 

## Подтверждение учётной записи

Пользователю необходимо ввести 6-значный цифровой код в приложение

GET-запрос на baseURL/user/signup/confirm/?email=test@example.com&regKey=123456

### Ошибки

0)

`
{
    code: 403,
    status: "only-for-unauthorized",
}
`

Только для неавторизованных

1)
`
{code:403,status:'error',error:'wrong-key-format'}
`

regKey слишком длинный или короткий

2)

`
{code:403,status:'error',error:'wrong-email-format'}
`

Неправильный формат email


3)
`
{code:401,status:'error',error:'no-account'}
`

Учетка не найдена

### Успех

`
{code:200, status:'ok'}
`

## Отправить регистрационный email заново

POST-запрос на baseURL/user/signup/resend/

JSON, нужно передать один ключ - email

### Ошибки

0)

`
{
    code: 403,
    status: "only-for-unauthorized",
}
`

Только для неавторизованных

1)

`
{
	code: 400,
	status:"error",
	error: e || "no-account"
}

`

e - ошибка в случае непредугаданной ошибки с сервера
Возможный e - "error" (когда вообще ничего не понятно)


2) 

`
{
	code: 400,
	status:"error",
	error: "already-activated"
}
`

3) 

`
{
	code: 400,
	status:"error",
	error: "too-many-attempts"
}

Слишком много попыток, больше email отправляться не будут. Обратитесь в поддержку

`

### Успех
`
{
	code: 200,
	status:"ok",
	attemptsLeft: attemptsLeftNum
}
`

attemptsLeftNum - число, отражающее сколько еще раз можно отправить email

## Cброс пароля

Два этапа.

### Этап 1

POST-запрос JSON на /user/lost-password/

Нужно отправить: email

#### Ошибки

```
{
    code: 403,
    status: "only-for-unauthorized",
}
```

```
{
    code: 400,
    status: "error",
    error: e || "error"
}
```

```
{
    code: 400,
    status: "error",
    error: "could-not-reset-pass"
}
```

```
{
    code: 400,
    status: "error",
    error: "wrong-email"
}
```



#### Успех 

```

{
    code: 200,
    status: "ok"
}

```

### После этапа 1

Пользователю приходит email с 6-значным кодом

### Этап 2

POST-запрос на /user/reset-password/

Что передать: user, key, pass (новый пароль)

#### Ошибки

```
{code:400, status:'error', error: e || 'error'}
```

#### Успех (к которому пацан шёл)
```
{code:200, status:'ok'}
```

Результат - новый пароль

## Первичный вход в учётную запись

POST-запрос JSON на /user/login/

Требуются ключи user, pass и apiType. apiType принимает значение mobile

### Псевдокод ошибок


1)
`
{
    code: 401,
    status: "error",
    error: e || "error"
}
`

Возможные значения e: account-not-found ; locked ; unactivated ; wrong-pass

### Псевдокод успеха

`
{
    code: 200,
    status: "logged-in",
    accessToken: req.session.id, 
    secretAccessToken: secretAccessToken,
    validUntil: expiry.getTime(),
}
`

accessToken - номер сессии, нужен чтобы при дальнейших операциях найти сессию
secretAccessToken - дополнительная валидация
validUntil - UNIX-Timestamp времени сброса сессии (и необходимости нового входа)

Все дальнейшие операции идут по комбинации accessToken и secretAccessToken, продлеваются автоматически

## Дальнейшие операции

В зависимости от того, является ли запрос POST или GET, параметры авторизации нужно передавать в теле (POST) или query (GET)

нужные параметры:

accessToken
secretAccessToken

например, GET с QUERY baseURL/some-get/?accessToken=token&secretAccessToken=otherToken


# Профиль пользователя

## Получить данные о пользователе

GET запрос на baseURL/user/info/

Не забыть передать в query accessToken и secretAccessToken

### Ошибка

`
{
	code: 401,
	status: "error",
	error: "unauthorized"
}
`

### Успех
```
{
    code: 200,
    status: "ok",
    session: {
        validUntil: validUntilNum
    },
    data: {
        id: i._id,  // ID пользователя
        user: i.user, // логин
        email: i.email, //email
        bday: i.bday, //день рождения, секунды с начала UNIX эпохи
        firstname: i.firstname, 
        middlename: i.middlename,
        lastname: i.lastname,
        userActivated: i.userActivated, // активирован ли пользователь. Должно быть всегда да
        address: i.address, // адрес, если записан
        covidLikelihood: i.covidLikelihood, // вероятность заболевания, float или десятичная дробь
        taxNumber: i.taxNumber, // ИНН
        snilsNumber: i.snilsNumber, // СНИЛС
        docType: i.docType, // Тип документа удостоверяющего личность. Смотреть здесь
        docNum: i.docNum, // номер документа
        phone: i.phone, // телефон
        insPolicy: i.insPolicy, // тип страховки
        insPolicyNum: i.insPolicyNum // номер страховки
    }
}  

```

validUntilNum - длительность в миллисекундах до окончания сессии


## Редактировать данные о пользователе

POST-запрос на /user/profile/ (не забывая о токенах)

|Ключ|Значение|Обязательно|
|...|...|...|
|firstname| имя | Нет, дефолтится на то, что в БД |
|lastname| фамилия | Нет, дефолтится на то, что в БД |
|middlename| отчество | Нет, дефолтится на то, что в БД |
|email| email | Нет |
|oldPass| старый пароль | Да, если меняется пароль или email |
|pass| новый пароль | Нет |
|gender| Пол (M или F) | Нет, дефолтится |
|bday| ДР (1997-01-24) | Нет, дефолтится |
|address| Адрес | Нет, дефолтится |
|phone| Телефон | Нет, дефолтится |
|docType| Тип документа, удостоверяющего личность | Нет, дефолтится |
|docNum| Номер документа | Нет, дефолтится |
|taxNumber| ИНН | Нет, дефолтится |
|snilsNumber| СНИЛС | Нет, дефолтится |
|insPolicy| Тип страховки | Нет, дефолтится |
|insPolicyNum| Номер страховки | Нет, дефолтится |

### Ошибки

1)

```
{
	code: 401,
	status: "error",
	error: "could-not-find-account"
}
```

2)

```
{
	code: 401,
	status: "error",
	error: "wrong-old-pass"
}
```

3)

Любой ответ со статусом отличным от 200

### Успех

Любой ответ со статусом 200

## Подсказки по заполнению полей

Будет реализовано позже

# Бот вопросов

## Получить список вопросов

GET-запрос на /bot/questions/ . НЕ забыть передать токены.

### Ответ

```

{
  "code": 200,
  "status": "ok",
  "data": {
    "questions": [
      {
        "question": "1. Померяйте температуру. Результат оказался <b>выше 37,5 градусов?</b>", // вопрос
        "disabled": 0, // если 1 - то вопрос надо игнорировать
        "code": 139186, // код вопроса. Нужно запоминать
        "weight": 1, // параметр значимости вопроса. Не актуален на клиенте
        "answers": [
          {
            "answer": "Да",
            "value": "yes", // в дальнейшем нужно будет отправлять value ответа
            "cost": 1
          },
          {
            "answer": "Нет",
            "value": "no",
            "cost": 0
          }
        ]
      },
      {
        "question": "2. Замечали ли Вы у себя <b>наличие сухого кашля?</b>",
        "code": 326904,
        "weight": 1,
        "answers": [
          {
            "answer": "Да",
            "value": "yes",
            "cost": 1
          },
          {
            "answer": "Нет",
            "value": "no",
            "cost": 0
          }
        ]
      },
      {
        "question": "3. <b>Нарушены</b> ли у Вас <b>чувства запаха и вкусов?</b>",
        "code": 229300,
        "weight": 1,
        "answers": [
          {
            "answer": "Да",
            "value": "yes",
            "cost": 1
          },
          {
            "answer": "Нет",
            "value": "no",
            "cost": 0
          }
        ]
      },
      {
        "question": "4. Присутствует ли у Вас <b>затрудненность в дыхании</b>? Есть ли <b>ощущение «нехватки» кислорода</b> после вдоха?",
        "code": 528535,
        "weight": 1,
        "answers": [
          {
            "answer": "Да",
            "value": "yes",
            "cost": 1
          },
          {
            "answer": "Нет",
            "value": "no",
            "cost": 0
          }
        ]
      },
      {
        "question": "5. Замечали ли Вы <b>головную боль, слабость и/или сонливость?</b>",
        "code": 459329,
        "weight": 1,
        "answers": [
          {
            "answer": "Да",
            "value": "yes",
            "cost": 1
          },
          {
            "answer": "Нет",
            "value": "no",
            "cost": 0
          }
        ]
      }
    ]
  }
}

```

### Ошибка 

```
{
    code:500,
    status:'error',
    error:'server-error'
}
```

## Ответить на вопросы

POST-запрос на /bot/answers/

НЕ забыть токены!

### Пример запроса (JSON)

файл data.json

```

{
  "accessToken": "6laTQ76g8zDNwK3eKHWOVBqJY8JwRJ4S",
  "secretAccessToken": "ef0ef9d3-dd86-4d3c-9136-6271d77f3f19",
  "apiType": "mobile",
  "answers": [
    {"code":139186, "value": "yes"},
    {"code":326904, "value": "yes"}
  ]
}

```

пример с передачей запроса через curl

`
curl -d "@data.json" -X POST http://localhost:8000/bot/answers/ -H "Content-Type: application/json"
`

### Ответ

```
{
    "code":200,
    "status":"ok",
    "data":{
        "probability":11.200000000000001
    }
}
```

### Ошибка

```
{
    code:500,
    status:'error',
    error:'server-error'
}
```


# Новости


 
## Получить новости

GET-запрос на /news/list/allNews/  или /news/list/allNews/page/ (вместо page - номер страницы, начиная с 1)

### Успех

```

{
  "code": 200,
  "status": "ok",
  "data": {
    "posts": [
      {
        "id": "5eaf0eba1344530039114295",
        "uuid": "64e8e393-7046-41af-a3d6-0aa91ec43d6a",
        "tags": [
          "covid19" // возможны ещё теги "worldHealthOrganization" и "operativeHq" (опер штаб) (возможно и маленькими буквами)
        ],
        "tagsDetailed": [
        ],
        "title": "Test",
        "html": [
          {
            "html": "<html><head></head><body><p>Просто текст</p><p><strong>Жирный текст</strong></p><p><em>Курсивный текст</em></p><p><strong><em>Жирный и курсивный текст</em></strong></p></body></html>"
          },
          {
            "img": "https://nikolayshamberg.ghost.io/content/images/2020/05/Dollarphotoclub_76132900.jpg"
          },
          {
            "html": "<html><head></head><body><p>Просто текст</p><p><strong>Жирный текст</strong></p><p><em>Курсивный текст</em></p><p><strong><em>Жирный и курсивный текст</em></strong></p></body></html>"
          }
        ],
        "excerpt": "Просто текст Жирный текст Курсивный текст Жирный и курсивный текст Просто текст Жирный текст Курсивный текст Жирный и курсивный текст",
        "created_at": 1588530874000,
        "updated_at": 1588535499000,
        "published_at": 1588530877000,
        "authors": [
          {
            "id": "1",
            "name": "Nikolay Schamberg",
            "slug": "nikolay",
            "profile_image": null,
            "cover_image": null,
            "bio": null,
            "website": null,
            "location": null,
            "facebook": null,
            "twitter": null,
            "meta_title": null,
            "meta_description": null,
            "url": "https://nikolayshamberg.ghost.io/author/nikolay/"
          }
        ],
        "primary_author": {
          "id": "1",
          "name": "Nikolay Schamberg",
          "slug": "nikolay",
          "profile_image": null,
          "cover_image": null,
          "bio": null,
          "website": null,
          "location": null,
          "facebook": null,
          "twitter": null,
          "meta_title": null,
          "meta_description": null,
          "url": "https://nikolayshamberg.ghost.io/author/nikolay/"
        },
        "prohibited": false,
        "feature_image": "https://nikolayshamberg.ghost.io/content/images/2020/05/Dollarphotoclub_76132900-1.jpg"
      }
    ],
    "meta": {
      "pagination": {
        "page": 1,
        "limit": 5,
        "pages": 1,
        "total": 1,
        "next": null,
        "prev": null
      }
    }
  }
}

```

### Ошибка 

```

{
	code: 401,
	status: 'unauthenticated'
}

```

или любой ответ не оканчивающийся HTTP кодом 200


# Дневник

НЕ ЗАБЫВАЕМ ТОКЕНЫ

## ВСЕ записи в дневнике

GET на /diary/find-records/all/

Не забыть токены

### Возможные ошибки

```
{
        code: 401,
        status: "unauthorized",
}
```

```
{code: statusNum, status: 'error', error:e||"nothing-found"}
```

где statusNum может принимать значение 404 или 500, e - внутренний код ошибки (на который н стоит полагаться)

### Успешный ответ

```

{code:200,status:'ok',data:o}

```
, где вместо o - Array/массив сохраннённых данных.


```
o[n].dataCreation - дата создания
o[n].dateModification - дата модификации (если есть)
o[n]._id - ID записи
```
n - порядковй номер элемента в массиве

## Конкретная запись в дневнике

GET на /diary/find-records/single/:id/ , где вместо :id указывается ID код записи

Полностью аналогично предыдущемы в плане ошибок и ответа, только вместо o приходит не массив, а конкретная запись

## Удаление записи

POST на /diary/delete-record/:id/ , где вместо :id указывается ID код записи

### Ошибки 

```
{
        code: 401,
        status: "unauthorized",
}
```

```
{code:400, status:'error', error: 'record-not-found'}
```

### успех

```
{code:200, status:'ok'}
```

## Создание записи

POST-запрос на /diary/make-record/

Тело запроса должно содержать ключ recordData, содержащий объект

### Ошибки 

```
{code:500, status:'error', error: 'server-error'}
```

```
{code:400, status:'error', error: 'bad-request'}
```

```
{
        code: 401,
        status: "unauthorized",
}
```

### Успех 

```

{code:200, status:'ok', data: obj}

```

Вместо obj приходит объект со следующей сутью:


```
obj = {
    id: ID_код,
    dateCreation: UNIX-время в секундах
}

```

## Модификация записи

POST запрос на /diary/find-records/update/:id/ , где вместо :id указывается ID код записи

Тело запроса должно содержать ключ recordData, содержащий объект

### Ошибки 

```
{
        code: 401,
        status: "unauthorized",
}
```

```
{code: statusNum, status: 'error', error:e ИЛИ "nothing-found" ИЛИ "server-error"}
```

где statusNum может принимать значение 404 или 500, e - внутренний код ошибки (на который не стоит полагаться). 

### Ответ

```

{code:200, status:'ok', data: obj}

```

Вместо obj приходит объект со следующей сутью:


```
obj = {
    id: ID_код,
    dateCreation: UNIX-время в секундах,
    dateModification: UNIX-время в секундах
}

```