include env.sh

# ----- 設定ファイルの取得、反映 -----
USER=isucon

check-server-id:
ifdef SERVER_ID
	@echo "SERVER_ID=$(SERVER_ID)"
else
	@echo "SERVER_ID is unset"
	@exit 1
endif

NGINX_CONF_PATH=/etc/nginx
DB_CONF_PATH=/etc/mysql

get-nginx-conf:
	mkdir -p $(SERVER_ID)$(NGINX_CONF_PATH)
	sudo cp -R $(NGINX_CONF_PATH)/* $(SERVER_ID)$(NGINX_CONF_PATH)
	sudo chown -R $(USER) $(SERVER_ID)$(NGINX_CONF_PATH)
get-db-conf:
	mkdir -p $(SERVER_ID)$(DB_CONF_PATH)
	sudo cp -R $(DB_CONF_PATH)/* $(SERVER_ID)$(DB_CONF_PATH)
	sudo chown -R $(USER) $(SERVER_ID)$(DB_CONF_PATH)
get-conf: check-server-id get-nginx-conf get-db-conf

deploy-nginx-conf:
	sudo cp -R $(SERVER_ID)$(NGINX_CONF_PATH)/* $(NGINX_CONF_PATH)
deploy-db-conf:
	sudo cp -R $(SERVER_ID)$(DB_CONF_PATH)/* $(DB_CONF_PATH)
deploy-conf: check-server-id deploy-nginx-conf deploy-db-conf

# ----- サービスの管理 -----
reload-nginx:
	@make deploy-nginx-conf
	sudo nginx -s reload

APP_SERVICE=isuports.service
reload-app:
	sudo systemctl restart $(APP_SERVICE)
status-app:
	sudo systemctl status $(APP_SERVICE)
watch-log-app:
	sudo journalctl -u $(APP_SERVICE) -n 10 -f

MYSQL_SERVICE=mysql.service
reload-mysql:
	@make deploy-db-conf
	sudo systemctl restart $(MYSQL_SERVICE)
status-mysql:
	sudo systemctl status $(MYSQL_SERVICE)

MYSQL_USER=isucon
MYSQL_PASSWORD=isucon
MYSQL_DATABASE=isuports
enter-mysql:
	mysql -u $(MYSQL_USER) -p$(MYSQL_PASSWORD) -D $(MYSQL_DATABASE)

# ----- 計測・分析 -----
NGINX_LOG=/var/log/nginx/access.log
MYSQL_LOG=/var/log/mysql/mysql-slow.log

clear-logs:
	echo '' | sudo tee $(NGINX_LOG) > /dev/null
	echo '' | sudo tee $(MYSQL_LOG) > /dev/null

before-bench: clear-logs reload-app watch-log-app

ALPSORT=sum
ALPM="/api/player/competition/[a-z0-9-]+/ranking,/api/player/player/\w+,/api/organizer/competition/[a-z0-9-]+/score,/api/organizer/competition/[a-z0-9-]+/finish,/api/organizer/player/[a-z0-9-]+/disqualified"
OUTFORMAT=count,method,uri,min,max,sum,avg,p99,1xx,2xx,3xx,4xx,5xx
.PHONY: alp
alp:
	sudo alp ltsv --file=$(NGINX_LOG) --sort $(ALPSORT) --reverse -o $(OUTFORMAT) -m $(ALPM)

pt-query-digest:
	sudo pt-query-digest $(MYSQL_LOG)

analyze:
	$(eval DIR := measurements/$(shell date +%Y%m%d-%H%M%S))
	mkdir -p $(DIR)
	@make alp > $(DIR)/alp.log
	@make pt-query-digest > $(DIR)/query.log

# ----- ツールのインストール -----
setup-git:
	cd ~/.ssh && ssh-keygen -t rsa
	git config --global user.email tekihei2317@gmail.com
	git config --global user.name tekihei2317

install-alp:
	wget https://github.com/tkuchiki/alp/releases/download/v1.0.9/alp_linux_amd64.zip
	unzip alp_linux_amd64.zip
	sudo install alp /usr/local/bin/alp
	rm alp alp_linux_amd64.zip

setup:
	@make install-alp
	sudo apt update && sudo apt install -y percona-toolkit jq net-tools dstat
	npm install -g ts-node

# ----- リクエスト -----
BASE_URL=http://localhost:3000

get-home:
	curl $(BASE_URL)
