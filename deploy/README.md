# saas-panel deployment

## Prerequisites

```bash
docker network create saas-shared-network
cp .env.example .env
```

Angular API URLs are configured in `src/environments/*.ts` at build time.

## Start / stop

Production — single replica:

```bash
docker compose -p saas-panel up -d --build panel
docker compose -p saas-panel down
```

Production — two replicas:

```bash
docker compose -p saas-panel --profile replica up -d --build
docker compose -p saas-panel --profile replica down
```

Development (live reload on port 4200):

```bash
docker compose -p saas-panel --profile dev up -d --build
docker compose -p saas-panel --profile dev down
```

## Apache

- Public port: **7004**
- Backends: **7013** (primary), **7016** (replica)
- Host config: [deploy/apache/saas-panel.conf](./apache/saas-panel.conf)
- In-container config: [deploy/apache/httpd-panel.conf](./apache/httpd-panel.conf)

## Health checks

```bash
curl http://localhost:7013/health
curl http://localhost:7016/health
```

## Resources

- Memory limit: **8G** per container (`MEMORY_LIMIT` in `.env`)
- Logs: streamed to Docker via stdout/stderr (see in-container httpd config)
