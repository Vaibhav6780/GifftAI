.PHONY: deploy deploy-no-pull logs ps
SHELL := /bin/bash

deploy:
	@./scripts/deploygifftai.sh

deploy-no-pull:
	@./scripts/deploygifftai.sh --no-pull

ps:
	@docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml ps

logs:
	@docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml logs --tail=100 -f
