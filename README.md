# Северный Кипр — инвестиционный лендинг

Одностраничный лендинг для инвесторов в недвижимость Северного Кипра. Чистый HTML + CSS,
без сборки и внешних зависимостей.

## Живые адреса

| Среда | URL |
| --- | --- |
| Прод (Netlify) | https://severny-kipr-invest.netlify.app |
| Зеркало (GitHub Pages) | https://greg711002.github.io/north-cyprus-landing/ |

Netlify — основной хостинг. GitHub Pages — резервная копия и версионирование исходников.

## Структура

```
index.html              страница для хостинга (hero вынесен в assets/hero.jpg)
assets/hero.jpg         панорама северного берега, public domain (Wikimedia Commons)
tilda-single-file.html  самодостаточная версия: hero вшит в base64, копируется
                        целиком в HTML-блок Tilda / WordPress
deploy-north-cyprus.mjs скрипт деплоя на Netlify (Node 18+, без зависимостей)
.nojekyll               отключает Jekyll на GitHub Pages
```

## Деплой на Netlify

```bash
NETLIFY_AUTH_TOKEN=nfp_... node deploy-north-cyprus.mjs
```

Скрипт читает токен из переменной окружения или из `.env` в родительском каталоге,
собирает `landing-north-cyprus/`, считает SHA1-манифест, загружает недостающие файлы,
ждёт `state=ready` и падает с ошибкой, если публичный URL не отдаёт 200.

Известная ловушка аккаунта: новые сайты создаются с `sso_login: true`, из-за чего
публичный URL отдаёт 401 с редиректом на `app.netlify.com/edge-access`. Скрипт снимает
этот флаг через `PATCH /api/v1/sites/{id}`.

## Что нужно доделать до платного трафика

- [ ] Форма квиза показывает `alert` и никуда не отправляет заявки — подключить
      Formspree / Getform или вебхук в CRM (amoCRM, Bitrix24).
- [ ] Контакты в футере — заглушки (+7 999 000-00-00, info@example.com, wa.me).
- [ ] Цифры 8–9%, 20–40%, 5–7,5% — рыночные ориентиры. Подтвердить договорами с
      застройщиками либо переформулировать как оценку рынка, а не обещание доходности.
- [ ] Юридический дисклеймер согласовать с юристом по Северному Кипру.

## Лицензия на изображение

`assets/hero.jpg` — «Panorama of northern coast of Cyprus from Kantara Castle»,
Wikimedia Commons, **public domain**. Атрибуция не требуется, коммерческое
использование разрешено.
