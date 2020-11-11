# mccbng

## back_loopback

### Config files

- `server/datasources.json`
```
{
  "db": {
    "name": "db",
    "connector": "memory"
  },
  "db_name_connection_mysql": {
    "host": "localhost",
    "port": 3306,
    "database": "database_name",
    "password": "database_user_password",
    "name": "db_name_connection_mysql",
    "user": "database_user_name",
    "connector": "mysql"
  },
}
```

## front_vue

### Config files

- `.env` / `.env.production`

```
VUE_APP_API_URL=http://localhost:3001
```
