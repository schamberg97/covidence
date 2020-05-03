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



```

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
validUntil - число миллисекунд до сброса сессии (и необходимости нового входа)

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