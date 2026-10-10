# codzee-eval-taskboard

A small task board REST API (Express + Node's built-in SQLite) used to evaluate
[Codzee](https://www.codzee.io) AI code review across different kinds of pull requests.

## Run

```sh
npm install
npm start        # http://localhost:3000
npm test
```

Requires Node >= 22.5 (uses `node:sqlite`).

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| POST | /users | create user |
| GET | /tasks | list tasks |
| GET | /tasks/:id | get task |
| POST | /tasks | create task |
| PATCH | /tasks/:id | update status |
| DELETE | /tasks/:id | delete task |
